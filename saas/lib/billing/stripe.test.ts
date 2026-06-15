import { describe, expect, it, vi, beforeEach } from "vitest";

const mockStripe = {
  customers: { create: vi.fn() },
  prices: { list: vi.fn() },
  subscriptions: { list: vi.fn(), create: vi.fn() },
  billing: { meterEvents: { create: vi.fn() } },
};

vi.mock("stripe", () => ({
  default: vi.fn(() => mockStripe),
}));

// Admin client mock: billing_config read, billing_periods read (reported_fee)
// + update. Defaults to a billing-enabled tenant with nothing reported yet.
let reportedFee = 0;
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "billing_config") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { stripe_customer_id: "cus_test", billing_enabled: true },
              }),
            }),
          }),
          update: () => ({ eq: () => ({ eq: async () => ({}) }) }),
        };
      }
      if (table === "billing_periods") {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { reported_fee: reportedFee } }) }) }),
          }),
          update: (vals: { reported_fee: number }) => ({
            eq: () => ({
              eq: async () => {
                reportedFee = vals.reported_fee;
                return {};
              },
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
    },
  }),
}));

describe("stripe billing (metered, meter events)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reportedFee = 0;
    process.env.WISP_STRIPE_SECRET = "sk_test_fake";
    mockStripe.prices.list.mockResolvedValue({ data: [{ id: "price_test" }] });
    mockStripe.subscriptions.list.mockResolvedValue({
      data: [{ id: "sub_test", items: { data: [{ id: "si_test", price: { id: "price_test" } }] } }],
    });
    mockStripe.billing.meterEvents.create.mockResolvedValue({});
  });

  it("reports the fee in cents as a meter event when billing is enabled", async () => {
    const { reportMeteredUsage, STRIPE_METER_EVENT } = await import("./stripe");
    await reportMeteredUsage("tenant-1", 12.34, "2026-06-01");
    expect(mockStripe.billing.meterEvents.create).toHaveBeenCalledWith({
      event_name: STRIPE_METER_EVENT,
      payload: { stripe_customer_id: "cus_test", value: "1234" },
    });
  });

  it("only reports the delta since the last report (idempotent)", async () => {
    reportedFee = 12.34; // already reported $12.34 this period
    const { reportMeteredUsage } = await import("./stripe");
    await reportMeteredUsage("tenant-1", 12.34, "2026-06-01");
    expect(mockStripe.billing.meterEvents.create).not.toHaveBeenCalled();
  });

  it("reports the incremental cents when the fee grows", async () => {
    reportedFee = 10.0;
    const { reportMeteredUsage } = await import("./stripe");
    await reportMeteredUsage("tenant-1", 12.5, "2026-06-01");
    expect(mockStripe.billing.meterEvents.create).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ value: "250" }) }),
    );
  });

  it("creates a stripe customer when missing", async () => {
    mockStripe.customers.create.mockResolvedValue({ id: "cus_new" });
    const adminModule = await import("@/lib/supabase/admin");
    vi.spyOn(adminModule, "createAdminClient").mockReturnValue({
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { stripe_customer_id: null } }) }) }),
        update: () => ({ eq: async () => ({}) }),
      }),
    } as never);

    const { ensureStripeCustomer } = await import("./stripe");
    const id = await ensureStripeCustomer("t1", "a@b.com", "Acme");
    expect(id).toBe("cus_new");
    expect(mockStripe.customers.create).toHaveBeenCalled();
  });
});
