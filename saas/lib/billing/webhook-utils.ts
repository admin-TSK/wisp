import type Stripe from "stripe";

/** Map a Stripe invoice to our calendar period_start (YYYY-MM-DD). */
export function invoicePeriodStart(invoice: Stripe.Invoice): string | null {
  const unix = invoice.period_start ?? invoice.lines?.data?.[0]?.period?.start ?? null;
  if (!unix) return null;
  return new Date(unix * 1000).toISOString().slice(0, 10);
}

export const BILLING_STATUS_RANK: Record<string, number> = { open: 0, invoiced: 1, paid: 2 };
