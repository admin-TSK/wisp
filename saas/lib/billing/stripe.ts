import "server-only";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Lookup key for the metered price; meter event name for usage reporting.
export const STRIPE_LOOKUP_KEY = "wisp_savings_share_v1";
export const STRIPE_METER_EVENT = "wisp_savings_fee";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.WISP_STRIPE_SECRET;
  if (!key) return null;
  if (!_stripe) {
    _stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  }
  return _stripe;
}

export async function resolveMeteredPriceId(stripe: Stripe): Promise<string | null> {
  const prices = await stripe.prices.list({ lookup_keys: [STRIPE_LOOKUP_KEY], limit: 1 });
  return prices.data[0]?.id ?? null;
}

/** Ensure a Stripe customer exists for the tenant; returns customer id. */
export async function ensureStripeCustomer(
  tenantId: string,
  email: string,
  name: string,
): Promise<string> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");

  const admin = createAdminClient();
  const { data: cfg } = await admin
    .from("billing_config")
    .select("stripe_customer_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (cfg?.stripe_customer_id) return cfg.stripe_customer_id;

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { wisp_tenant_id: tenantId },
  });

  await admin
    .from("billing_config")
    .update({ stripe_customer_id: customer.id })
    .eq("tenant_id", tenantId);

  return customer.id;
}

/**
 * Ensure the customer has an active subscription to the metered price, so Stripe
 * invoices automatically at the end of each billing cycle. This is the SINGLE
 * invoicing path — we never create/finalize invoices by hand (that risked
 * double-billing alongside the subscription's own cycle).
 */
async function ensureMeteredSubscription(stripe: Stripe, customerId: string): Promise<void> {
  const priceId = await resolveMeteredPriceId(stripe);
  if (!priceId) throw new Error(`Stripe price ${STRIPE_LOOKUP_KEY} not found`);

  const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 10 });
  const hasPrice = subs.data.some((s) => s.items.data.some((i) => i.price.id === priceId));
  if (!hasPrice) {
    await stripe.subscriptions.create({ customer: customerId, items: [{ price: priceId }] });
  }
}

/**
 * Report the period fee to Stripe as additive Billing Meter events.
 *
 * Meter events are summed over the billing period, so we report only the DELTA
 * since the last report (tracked in billing_periods.reported_fee). That makes
 * the daily rollup idempotent: re-running it never double-charges, and a fee
 * that only grows is reported incrementally. The unit is cents of Wisp fee.
 */
export async function reportMeteredUsage(
  tenantId: string,
  feeUsd: number,
  periodStart: string,
): Promise<void> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");

  const admin = createAdminClient();
  const { data: cfg } = await admin
    .from("billing_config")
    .select("stripe_customer_id, billing_enabled")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!cfg?.billing_enabled || !cfg.stripe_customer_id) return;

  const { data: period } = await admin
    .from("billing_periods")
    .select("reported_fee")
    .eq("tenant_id", tenantId)
    .eq("period_start", periodStart)
    .maybeSingle();

  const reportedCents = Math.round(Number(period?.reported_fee ?? 0) * 100);
  const targetCents = Math.max(Math.round(feeUsd * 100), 0);
  const deltaCents = targetCents - reportedCents;
  if (deltaCents <= 0) return; // nothing new to bill — idempotent

  await ensureMeteredSubscription(stripe, cfg.stripe_customer_id);

  await stripe.billing.meterEvents.create({
    event_name: STRIPE_METER_EVENT,
    payload: {
      stripe_customer_id: cfg.stripe_customer_id,
      value: String(deltaCents),
    },
  });

  await admin
    .from("billing_periods")
    .update({ reported_fee: feeUsd })
    .eq("tenant_id", tenantId)
    .eq("period_start", periodStart);
}
