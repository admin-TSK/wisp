import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

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
 * reconcile invoice status back onto billing_periods. Invoices are generated
 * automatically by the metered subscription (we no longer create them by hand),
 * so we resolve the tenant from the invoice's customer and update its latest
 * period rather than matching on a pre-stored invoice id.
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
    const status = event.type === "invoice.paid" ? "paid" : "invoiced";

    if (customerId) {
      const { data: cfg } = await supabase
        .from("billing_config")
        .select("tenant_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (cfg) {
        // Reconcile the tenant's most recent period.
        const { data: period } = await supabase
          .from("billing_periods")
          .select("id")
          .eq("tenant_id", cfg.tenant_id)
          .order("period_start", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (period) {
          await supabase
            .from("billing_periods")
            .update({ status, stripe_invoice_id: invoice.id })
            .eq("id", period.id);
        }
      }
    }
  }
  // All other events are acknowledged so Stripe stops retrying.

  return NextResponse.json({ received: true });
}
