import type { ModelRate } from "./net-of-cache";

// Fallback rate card mirroring supabase/seed.sql. Authoritative billing reads
// model_pricing (+ per-tenant overrides) from the DB; this is the default when
// a tenant has no override row. $/token = ($/1M) / 1e6.
const M = 1e6;
const r = (base: number, cached?: number): ModelRate => ({
  baseInputRate: base / M,
  cachedInputRate: (cached ?? base) / M,
});

export const RATE_CARD: Record<string, ModelRate> = {
  "gpt-5.5": r(5.0, 0.5),
  "gpt-5.4": r(2.5, 0.25),
  "gpt-5.4-mini": r(0.75, 0.075),
  "gpt-5.2-codex": r(1.75),
  "gpt-5": r(1.25),
  "gpt-5-mini": r(0.25),
  "gpt-4o": r(2.5),
  "claude-opus-4-8": r(5.0, 0.5),
  "claude-opus-4-7": r(5.0, 0.5),
  "claude-sonnet-4-6": r(3.0, 0.3),
  "claude-haiku-4-5": r(1.0, 0.1),
  "claude-fable-5": r(10.0, 1.0),
  "gemini-3.1-pro": r(2.0),
  "gemini-3.5-flash": r(1.5, 0.15),
  "gemini-2.5-pro": r(1.25),
  "grok-4": r(3.0),
  "grok-4-fast": r(0.2),
};
