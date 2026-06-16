import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";
import {
  checkTelemetryRateLimit,
  rateLimitMisconfiguredResponse,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { usageBatchSchema } from "@/lib/telemetry-contract";
import { bearerFrom, hashToken } from "@/lib/tokens";

export const runtime = "nodejs";

/**
 * Ingest a PII-free UsageBatch from an enrolled agent.
 *  1. Authenticate via bearer enrolment token -> resolve tenant_id + device_id.
 *  2. Validate body with a STRICT schema (rejects any content/identifying field).
 *  3. Insert usage_events with the tenant_id from the token, never the body.
 */
export async function POST(req: Request) {
  const token = bearerFrom(req);
  if (!token) {
    return NextResponse.json({ error: "Missing enrolment token" }, { status: 401 });
  }

  const tokenHash = hashToken(token);
  const rl = await checkTelemetryRateLimit(req, tokenHash);
  if ("misconfigured" in rl) return rateLimitMisconfiguredResponse();
  if (rl.limited) return rateLimitResponse(rl);

  const supabase = createAdminClient();

  const { data: tokenRow } = await supabase
    .from("enrolment_tokens")
    .select("tenant_id, device_id, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!tokenRow || tokenRow.revoked_at) {
    return NextResponse.json({ error: "Invalid or revoked token" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = usageBatchSchema.safeParse(body);
  if (!parsed.success) {
    // Strict-schema failure most often means an unexpected (possibly PII) field.
    return NextResponse.json(
      { error: "Payload rejected by PII-free contract", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const batch = parsed.data;

  // The device the token is bound to wins over any device_id in the body.
  const deviceId = tokenRow.device_id ?? batch.device_id;
  const tenantId = tokenRow.tenant_id;

  const rows = batch.events.map((e) => ({
    tenant_id: tenantId,
    device_id: deviceId,
    batch_id: batch.batch_id,
    model: e.model,
    window_start: batch.window_start,
    window_end: batch.window_end,
    requests: e.requests,
    input_tokens_original: e.input_tokens_original,
    input_tokens_compressed: e.input_tokens_compressed,
    input_tokens_removed: e.input_tokens_removed,
    input_tokens_cache_read: e.input_tokens_cache_read,
    output_tokens: e.output_tokens,
    policy_level: e.policy_level,
  }));

  if (rows.length > 0) {
    // Idempotent: a re-delivered batch (same batch_id) is ignored per (batch_id,
    // model), so agent retries never double-count.
    const { error } = await supabase
      .from("usage_events")
      .upsert(rows, { onConflict: "batch_id,model", ignoreDuplicates: true });
    if (error) {
      log("error", "telemetry.ingest_failed", { tenantId, deviceId, error: error.message });
      return NextResponse.json({ error: "Ingest failed" }, { status: 500 });
    }
  }

  log("info", "telemetry.accepted", { tenantId, deviceId, events: rows.length });

  await supabase
    .from("devices")
    .update({
      last_seen: new Date().toISOString(),
      agent_version: batch.agent_version,
      headroom_version: batch.headroom_version,
    })
    .eq("id", deviceId)
    .eq("tenant_id", tenantId);

  return NextResponse.json({ accepted: rows.length });
}
