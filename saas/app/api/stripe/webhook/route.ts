import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { BILLING_STATUS_RANK, invoicePeriodStart } from "@/lib/billing/webhook-utils";

export const runtime = "nodejs";

// Lazily constructed: Stripe throws without a key, and we must not instantiate
// at module load (breaks the build's page-data collection).
function getStripe(): Stripe {
  return new Stripe(process.env.WISP_STRIPE_SECRET!, { apiVersion: "2025-02-24.acacia" });
}

function customerIdOf(invoice: Stripe.Invoice): string | null {
  const c = invoice.customer;
  if (!c) return null;
  return typeof c === "string" ? c : c.id;
}

/**
 * Stripe billing lifecycle. We verify the signature against the RAW body, then
 * reconcile invoice status onto the matching billing_periods row.
 */
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.WISP_STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const stripe = getStripe();
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (event.type === "invoice.paid" || event.type === "invoice.finalized") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = customerIdOf(invoice);
    const nextStatus = event.type === "invoice.paid" ? "paid" : "invoiced";

    if (customerId) {
      const { data: cfg } = await supabase
        .from("billing_config")
        .select("tenant_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (cfg) {
        const periodStart = invoicePeriodStart(invoice);
        let query = supabase
          .from("billing_periods")
          .select("id, status")
          .eq("tenant_id", cfg.tenant_id);

        if (periodStart) {
          query = query.eq("period_start", periodStart);
        } else {
          query = query.order("period_start", { ascending: false }).limit(1);
        }

        const { data: period } = await query.maybeSingle();

        if (period) {
          const currentRank = BILLING_STATUS_RANK[period.status ?? "open"] ?? 0;
          const nextRank = BILLING_STATUS_RANK[nextStatus] ?? 0;
          if (nextRank >= currentRank) {
            await supabase
              .from("billing_periods")
              .update({ status: nextStatus, stripe_invoice_id: invoice.id })
              .eq("id", period.id);
          }
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
