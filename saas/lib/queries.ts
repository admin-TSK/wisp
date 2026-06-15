import "server-only";
import { createClient } from "@/lib/supabase/server";
import { RATE_CARD } from "@/lib/billing/rate-card";
import { summarize, type ModelRate, type UsageWindow } from "@/lib/billing/net-of-cache";

export interface TenantContext {
  tenantId: string;
  role: string;
}

export async function getTenantContext(): Promise<TenantContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return data ? { tenantId: data.tenant_id, role: data.role } : null;
}

/** Resolve $/token rates: tenant override (pricing_config) else global model_pricing else card. */
async function resolveRates(tenantId: string): Promise<Record<string, ModelRate>> {
  const supabase = await createClient();
  const rates: Record<string, ModelRate> = { ...RATE_CARD };

  const { data: pricing } = await supabase
    .from("model_pricing")
    .select("model, base_input_rate, cached_input_rate");
  for (const row of pricing ?? []) {
    rates[row.model] = {
      baseInputRate: Number(row.base_input_rate),
      cachedInputRate: Number(row.cached_input_rate),
    };
  }

  const { data: overrides } = await supabase
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

function monthStartISO(d = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export interface SavingsByModel {
  model: string;
  tokensRemoved: number;
  gross: number;
  net: number;
}

export async function getSavings(tenantId: string) {
  const supabase = await createClient();
  const rates = await resolveRates(tenantId);

  const { data: events } = await supabase
    .from("usage_events")
    .select("model, input_tokens_removed, input_tokens_compressed, input_tokens_cache_read")
    .eq("tenant_id", tenantId)
    .gte("window_start", monthStartISO());

  const windows: UsageWindow[] = (events ?? [])
    .filter((e) => rates[e.model])
    .map((e) => ({
      model: e.model,
      inputTokensRemoved: Number(e.input_tokens_removed),
      inputTokensCompressed: Number(e.input_tokens_compressed),
      inputTokensCacheRead: Number(e.input_tokens_cache_read),
    }));

  const byModelMap = new Map<string, UsageWindow[]>();
  for (const w of windows) {
    const arr = byModelMap.get(w.model) ?? [];
    arr.push(w);
    byModelMap.set(w.model, arr);
  }

  const byModel: SavingsByModel[] = [...byModelMap.entries()]
    .map(([model, ws]) => {
      const s = summarize(ws, rates);
      return { model, tokensRemoved: s.totalTokensRemoved, gross: s.grossSavings, net: s.measuredSavings };
    })
    .sort((a, b) => b.net - a.net);

  const totals = windows.length ? summarize(windows, rates, 0.1) : null;
  return { byModel, totals };
}

export interface DeviceRow {
  id: string;
  label: string;
  group: string | null;
  policyLevel: string;
  agentVersion: string | null;
  lastSeen: string | null;
  healthy: boolean;
}

export async function getTenantPolicy(tenantId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("policies")
    .select("level")
    .eq("tenant_id", tenantId)
    .eq("scope", "tenant")
    .maybeSingle();
  return data?.level ?? "aggressive";
}

export interface MemberRow {
  userId: string;
  role: string;
  email: string | null;
}

export async function getMembers(tenantId: string): Promise<MemberRow[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("tenant_members")
    .select("user_id, role")
    .eq("tenant_id", tenantId)
    .order("role", { ascending: true });

  // Emails live in auth.users — resolve via admin for display.
  const admin = (await import("@/lib/supabase/admin")).createAdminClient();
  const out: MemberRow[] = [];
  for (const row of rows ?? []) {
    const { data: authUser } = await admin.auth.admin.getUserById(row.user_id);
    out.push({
      userId: row.user_id,
      role: row.role,
      email: authUser.user?.email ?? null,
    });
  }
  return out;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
}

export async function getPendingInvites(tenantId: string): Promise<PendingInvite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invites")
    .select("id, email, role, expires_at")
    .eq("tenant_id", tenantId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  return (data ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    expiresAt: i.expires_at,
  }));
}

export async function getFleet(tenantId: string): Promise<DeviceRow[]> {
  const supabase = await createClient();
  const { data: devices } = await supabase
    .from("devices")
    .select("id, enrolment_label, group_name, agent_version, last_seen")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  const { data: tenantPolicy } = await supabase
    .from("policies")
    .select("level")
    .eq("tenant_id", tenantId)
    .eq("scope", "tenant")
    .maybeSingle();
  const defaultLevel = tenantPolicy?.level ?? "aggressive";

  const staleMs = 30 * 60 * 1000;
  return (devices ?? []).map((d) => ({
    id: d.id,
    label: d.enrolment_label ?? d.id.slice(0, 8),
    group: d.group_name,
    policyLevel: defaultLevel,
    agentVersion: d.agent_version,
    lastSeen: d.last_seen,
    healthy: d.last_seen ? Date.now() - new Date(d.last_seen).getTime() < staleMs : false,
  }));
}

export async function getBillingOverview(tenantId: string) {
  const supabase = await createClient();
  const { data: cfg } = await supabase
    .from("billing_config")
    .select("take_rate, monthly_cap, billing_enabled, shadow_until")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const { totals } = await getSavings(tenantId);
  const inShadow = cfg?.shadow_until ? new Date(cfg.shadow_until).getTime() > Date.now() : false;

  return {
    takeRate: cfg?.take_rate ?? 0.1,
    monthlyCap: cfg?.monthly_cap ?? null,
    billingEnabled: cfg?.billing_enabled ?? false,
    inShadow,
    measuredSavings: totals?.measuredSavings ?? 0,
    grossSavings: totals?.grossSavings ?? 0,
    wispFee: totals?.wispFee ?? 0,
  };
}
