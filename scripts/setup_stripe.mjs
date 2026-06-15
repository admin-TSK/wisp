// Create the Wisp test-mode Stripe Billing Meter + metered price for
// net-of-cache billing. Run once: `node scripts/setup_stripe.mjs` with
// WISP_STRIPE_SECRET set to a TEST key (sk_test_...). Idempotent.
//
// Wisp bills a capped % of measured net savings. The billing rollup reports the
// fee (in CENTS) as additive meter events; Stripe sums them per period and
// invoices automatically via a metered subscription to the price below.

import Stripe from "stripe";

const key = process.env.WISP_STRIPE_SECRET;
if (!key || !key.startsWith("sk_test_")) {
  console.error("Set WISP_STRIPE_SECRET to a Stripe TEST secret key (sk_test_...).");
  process.exit(1);
}
const stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });

const LOOKUP_KEY = "wisp_savings_share_v1";
const METER_EVENT = "wisp_savings_fee";

// 1. Ensure the Billing Meter (sums reported fee cents, mapped by customer).
const meters = await stripe.billing.meters.list({ limit: 100 });
let meter = meters.data.find((m) => m.event_name === METER_EVENT && m.status === "active");
if (!meter) {
  meter = await stripe.billing.meters.create({
    display_name: "Wisp savings fee (cents)",
    event_name: METER_EVENT,
    default_aggregation: { formula: "sum" },
    customer_mapping: { type: "by_id", event_payload_key: "stripe_customer_id" },
    value_settings: { event_payload_key: "value" },
  });
  console.log(`Created meter ${meter.id} (${METER_EVENT}).`);
} else {
  console.log(`Meter already exists: ${meter.id} (${METER_EVENT}).`);
}

// 2. Ensure the metered price tied to that meter.
const existing = await stripe.prices.list({ lookup_keys: [LOOKUP_KEY], limit: 1 });
if (existing.data.length) {
  console.log(`Price already exists: ${existing.data[0].id} (${LOOKUP_KEY}).`);
  process.exit(0);
}

const product = await stripe.products.create({
  name: "Wisp — Savings Share",
  description: "Capped percentage of measured, net-of-cache token savings.",
});

const price = await stripe.prices.create({
  product: product.id,
  currency: "usd",
  lookup_key: LOOKUP_KEY,
  recurring: { interval: "month", usage_type: "metered", meter: meter.id },
  billing_scheme: "per_unit",
  unit_amount: 1, // 1 cent per reported unit; the rollup reports the fee in cents
});

console.log(`Created product ${product.id} and metered price ${price.id} (${LOOKUP_KEY}).`);
