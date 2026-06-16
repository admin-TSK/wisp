import { z } from "zod";

/**
 * Server-side mirror of the agent's UsageBatch contract. zod's `.strict()`
 * rejects any unexpected field, which is how we enforce the PII-free guarantee
 * at the ingest boundary: a payload carrying prompt text / paths / identifiers
 * is rejected, not stored.
 */

export const usageEventSchema = z
  .object({
    model: z.string().min(1).max(128),
    requests: z.number().int().nonnegative(),
    input_tokens_original: z.number().int().nonnegative(),
    input_tokens_compressed: z.number().int().nonnegative(),
    input_tokens_removed: z.number().int().nonnegative(),
    input_tokens_cache_read: z.number().int().nonnegative(),
    output_tokens: z.number().int().nonnegative(),
    policy_level: z.enum(["off", "conservative", "balanced", "aggressive"]),
    headroom_input_digest: z.string().max(128).optional(),
  })
  .strict();

export const usageBatchSchema = z
  .object({
    // tenant_id is intentionally accepted but IGNORED server-side; the real
    // tenant is resolved from the bearer enrolment token.
    tenant_id: z.string().optional(),
    device_id: z.string().uuid(),
    // Stable per-window id reused on retry; (batch_id, model) is the ingest
    // idempotency key so a re-delivered batch cannot double-count.
    batch_id: z.string().uuid(),
    agent_version: z.string().max(32),
    headroom_version: z.string().max(32),
    // Accept both 'Z' and explicit UTC offsets (e.g. +00:00). The Python agent's
    // datetime.isoformat() emits a +00:00 offset, which the default Z-only
    // validator rejected — silently 422-ing every real batch. Still rejects
    // zone-less (naive) timestamps.
    window_start: z.string().datetime({ offset: true }),
    window_end: z.string().datetime({ offset: true }),
    events: z.array(usageEventSchema).max(2000),
  })
  .strict();

export type UsageBatch = z.infer<typeof usageBatchSchema>;
