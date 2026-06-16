import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { RATE_CARD } from "@/lib/billing/rate-card";
import { summarize, type ModelRate, type UsageWindow } from "@/lib/billing/net-of-cache";
import { log } from "@/lib/logger";

/**
 * Authoritative billing rollup. Runs under the service role (bypasses RLS) so it
 * can aggregate every tenant. Computes net-of-cache savings for the current
 * period and upserts a billing_periods row. This is the number that bills;
 * it uses the exact same `summarize` as the dashboard and the agent meter.
 */

function monthBounds(d = new Date()): { start: string; end: string } {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

async function resolveRates(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
): Promise<Record<string, ModelRate>> {
  const rates: Record<string, ModelRate> = { ...RATE_CARD };
  const { data: pricing } = await admin
    .from("model_pricing")
    .select("model, base_input_rate, cached_input_rate");
  for (const row of pricing ?? []) {
    rates[row.model] = {
      baseInputRate: Number(row.base_input_rate),
      cachedInputRate: Number(row.cached_input_rate),
    };
  }
  const { data: overrides } = await admin
    .from("pricing_config")
    .select("model, effective_input_rate, effective_cached_rate")
    .eq("tenant_id", tenantId);
  for (const o of overrides ?? []) {
    const base = o.effective_input_rate ?? rates[o.model]?.baseInputRate;
    const cached = o.effective_cached_rate ?? rates[o.model]?.cachedInputRate ?? base;
    if (base != null) rates[o.model] = { baseInputRate: Number(base), cachedInputRate: Number(cached) };
  }
  return rates;
}

export async function rollupTenant(tenantId: string): Promise<{ tenantId: string; fee: number }> {
  const admin = createAdminClient();
  const { start, end } = monthBounds();

  const [{ data: events }, { data: cfg }] = await Promise.all([
    admin
      .from("usage_events")
      .select("model, input_tokens_removed, input_tokens_compressed, input_tokens_cache_read")
      .eq("tenant_id", tenantId)
      .gte("window_start", start)
      .lt("window_start", end),
    admin
      .from("billing_config")
      .select("take_rate, monthly_cap")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
  ]);

  const rates = await resolveRates(admin, tenantId);
  const windows: UsageWindow[] = (events ?? [])
    .filter((e) => rates[e.model])
    .map((e) => ({
      model: e.model,
      inputTokensRemoved: Number(e.input_tokens_removed),
      inputTokensCompressed: Number(e.input_tokens_compressed),
      inputTokensCacheRead: Number(e.input_tokens_cache_read),
    }));

  const s = summarize(windows, rates, Number(cfg?.take_rate ?? 0.1), cfg?.monthly_cap ?? undefined);

  // Note: `status` is intentionally omitted. On insert the column default
  // ('open') applies; on conflict we must NOT clobber a webhook-set
  // 'invoiced'/'paid' status with 'open' on the next daily run.
  await admin.from("billing_periods").upsert(
    {
      tenant_id: tenantId,
      period_start: start.slice(0, 10),
      period_end: end.slice(0, 10),
      total_tokens_removed: Math.round(s.totalTokensRemoved),
      gross_savings: s.grossSavings,
      measured_savings: s.measuredSavings,
      wisp_fee: s.wispFee,
    },
    { onConflict: "tenant_id,period_start" },
  );

  try {
    const { reportMeteredUsage, getStripe } = await import("@/lib/billing/stripe");
    if (getStripe()) {
      await reportMeteredUsage(tenantId, s.wispFee, start.slice(0, 10));
    }
  } catch (err) {
    log("error", "rollup.stripe_failed", {
      tenantId,
      periodStart: start.slice(0, 10),
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return { tenantId, fee: s.wispFee };
}

export async function rollupAllTenants(): Promise<{ tenants: number; totalFee: number }> {
  const admin = createAdminClient();
  const { data: tenants } = await admin.from("tenants").select("id");
  let totalFee = 0;
  for (const t of tenants ?? []) {
    const { fee } = await rollupTenant(t.id);
    totalFee += fee;
  }
  return { tenants: (tenants ?? []).length, totalFee };
}
