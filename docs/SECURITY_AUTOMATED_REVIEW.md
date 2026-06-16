# Automated security first-pass (2026-06-17)

**Scope:** Wisp SaaS API surface, Supabase RLS, agent telemetry contract, rate limiting.  
**Not a substitute** for an independent human penetration test before customer billing/traffic at scale.

---

## Auth & session

| Control | Status | Notes |
|---------|--------|-------|
| Dashboard requires Supabase session | OK | [`saas/app/app/layout.tsx`](../saas/app/app/layout.tsx) redirects unauthenticated users |
| Open redirect hardening | OK | [`saas/lib/auth.ts`](../saas/lib/auth.ts) `safeNext()` on login/confirm |
| Workspace isolation | OK | `wisp_tenant_id` cookie + server-side tenant resolution |

---

## Row-level security (production)

All public tables have RLS enabled. Tenant-scoped tables use `private.is_tenant_member` or `private.has_tenant_role` policies.

| Table | RLS | Policy |
|-------|-----|--------|
| tenants, tenant_members, devices, policies, usage_events, pricing_config, billing_config, billing_periods, invites | ON | Member/role policies |
| enrolment_tokens, enrol_secrets | ON | **No policy** — service-role only (by design) |
| model_pricing | ON | Global read |

CI: `.github/workflows/ci.yml` `db-rls` job runs `supabase/tests/rls_test.sql` on migrations 0001–0008.

---

## Service role key handling

| Control | Status |
|---------|--------|
| `WISP_SUPABASE_SERVICE_ROLE` server-only | OK — `createAdminClient()` in API routes / server actions only |
| Not exposed to browser | OK — no `NEXT_PUBLIC_` prefix |
| Ingest resolves tenant from token hash | OK — never trusts body `tenant_id` |

**Recommendation:** rotate service role if ever logged or committed; Vercel env is encrypted at rest.

---

## Public API routes

| Route | Auth | Input validation | Rate limit |
|-------|------|------------------|------------|
| `POST /api/enrol` | `X-Wisp-Enrol-Secret` → hash lookup | Zod strict body | Upstash IP + secret |
| `POST /api/telemetry` | Bearer token → hash lookup | Zod `.strict()` PII-free contract | Upstash IP + token |
| `GET /api/cron/rollup` | `Bearer WISP_CRON_SECRET` | N/A | Vercel cron only |
| `POST /api/stripe/webhook` | Stripe signature | Raw body verify | Stripe-side |
| `GET /api/billing/reconciliation` | Session + tenant | Query params | Dashboard auth |

---

## Agent ↔ server contract

- Agent: `assert_pii_free` + forbidden field set ([`agent/wisp_agent/telemetry.py`](../agent/wisp_agent/telemetry.py))
- Server: `usageBatchSchema` strict ([`saas/lib/telemetry-contract.ts`](../saas/lib/telemetry-contract.ts))
- Parity test: [`saas/lib/telemetry-contract.test.ts`](../saas/lib/telemetry-contract.test.ts) + Python fixture

---

## Findings & gaps (human review still required)

| Severity | Item | Mitigation |
|----------|------|------------|
| HIGH | Base-URL interception unproven on real MDM Mac | [`docs/MDM_PILOT_RUNBOOK.md`](MDM_PILOT_RUNBOOK.md) |
| HIGH | No independent pen test yet | Schedule before GA billing |
| MED | Demo enrol secret in Vercel (`WISP_DEMO_ENROL_SECRET`) | High-entropy `wisp_es_*`; rotate at GA via Fleet |
| MED | Stripe live + Enable Billing | Test mode wired; live requires explicit approval |
| MED | Auth email deliverability | Supabase SMTP not wired (Resend pending) |
| LOW | `WISP_ENROL_SECRET` legacy env in Vercel | Deprecated global secret; per-tenant secrets only |
| LOW | Sentry not configured | No production error aggregation until DSNs set |

---

## Rate limiting (new)

Implementation: [`saas/lib/rate-limit.ts`](../saas/lib/rate-limit.ts) via Upstash Redis.

- Enrol: 10/min per IP + 10/min per secret hash
- Telemetry: 60/min per IP + 12/5min per token
- Production without `UPSTASH_*`: **503** (fail closed on misconfiguration)

Requires Upstash Marketplace terms acceptance + `vercel integration add upstash/upstash-kv`.
