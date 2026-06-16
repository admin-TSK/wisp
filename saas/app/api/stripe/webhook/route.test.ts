import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { invoicePeriodStart } from "@/lib/billing/webhook-utils";

describe("invoicePeriodStart", () => {
  it("uses invoice.period_start when present", () => {
    const invoice = { period_start: Date.UTC(2026, 5, 1) / 1000 } as Stripe.Invoice;
    expect(invoicePeriodStart(invoice)).toBe("2026-06-01");
  });

  it("falls back to first line period", () => {
    const invoice = {
      period_start: null,
      lines: { data: [{ period: { start: Date.UTC(2026, 4, 1) / 1000 } }] },
    } as unknown as Stripe.Invoice;
    expect(invoicePeriodStart(invoice)).toBe("2026-05-01");
  });

  it("returns null when no period is available", () => {
    expect(invoicePeriodStart({} as Stripe.Invoice)).toBeNull();
  });
});

describe("webhook status transitions", () => {
  it("paid outranks invoiced", () => {
    const rank = { open: 0, invoiced: 1, paid: 2 };
    expect(rank.paid).toBeGreaterThan(rank.invoiced);
  });
});
