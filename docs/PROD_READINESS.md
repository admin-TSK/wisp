# Wisp — Production & Sales Readiness

_Last reviewed: 2026-06-17 (post-verification refresh). Scope: agent, macOS UI, SaaS dashboard + marketing, telemetry/billing, packaging._

## Verdict

The **platform is ready for a controlled launch** — design-partner pilots and the live demo — and the **MDM agent→dashboard path is verified in production** (live enrol + telemetry both return 200). Remaining blockers are **credential-, account-, or hardware-gated**. Production rate limiting (Upstash KV) is wired and prod ingest is verified.

---

## Go-live hardening status

### A — Code (PR `chore/go-live-hardening`)

| Item | Status |
|------|--------|
| A1 Rate limit `/api/enrol` + `/api/telemetry` (Upstash) | **Done** — [`saas/lib/rate-limit.ts`](../saas/lib/rate-limit.ts) |
| A2 Contract-parity test (Python fixture → Zod) | **Done** — [`saas/lib/telemetry-contract.test.ts`](../saas/lib/telemetry-contract.test.ts) |
| A3 `scripts/LINEAR_BACKLOG.md` tidy | **Done** |

### B — Infra verification

| Item | Status | Finding |
|------|--------|---------|
| B4 Migrations 0001–0009 | **OK** | Prod Supabase: init_schema through `0009_policy_hyper` (hyper policy level) |
| B4 RLS on tenant tables | **OK** | All 12 public tables RLS ON; `enrolment_tokens` / `enrol_secrets` intentionally deny-all to authenticated |
| B4 Demo tenant seed | **OK** | 3 devices, 3 usage_events, 1 billing_config, 1 active `demo-fleet` enrol secret |
| B4 Demo secret hygiene | **Action needed** | DB stores SHA-256 hash only, **but the live demo enrol secret is a weak, low-entropy placeholder** (and was shared in plaintext during verification). Rotate to a high-entropy value — update the Supabase `enrol_secrets` hash + Vercel `WISP_DEMO_ENROL_SECRET` — before any public exposure. |
| B4 Hot-path indexes | **OK** | `usage_events_tenant_window_idx`, `usage_events_batch_model_uniq`, token/secret PKs, 0008 billing indexes |
| B5 Vercel env vars | **OK** | Supabase + cron + demo + Stripe test keys set; Upstash wired via Vercel Marketplace (`KV_REST_API_URL`/`KV_REST_API_TOKEN`; `rate-limit.ts` accepts either naming) |
| B5 Cron `0 2 * * *` → `/api/cron/rollup` | **OK** | [`saas/vercel.json`](../saas/vercel.json) |
| B5 Prod deployment | **OK** | https://saas-tau-teal.vercel.app |

### C — Credential go-lives

| Item | Status |
|------|--------|
| C6 Stripe test | **Done** — meter + price + webhook created; `WISP_STRIPE_SECRET` + `WISP_STRIPE_WEBHOOK_SECRET` in Vercel (test mode). **Enable Billing / live keys not activated.** |
| C7 Email (Resend/SMTP) | **Pending** — awaiting API key |
| C8 Sentry | **Pending** — awaiting DSNs |

### D — Human-only

| Item | Status |
|------|--------|
| D9 Apple sign + notarize | **Checklist** — [`docs/APPLE_SIGNING.md`](APPLE_SIGNING.md) |
| D10 MDM pilot runbook | **Ready** — [`docs/MDM_PILOT_RUNBOOK.md`](MDM_PILOT_RUNBOOK.md) |
| D11 Security automated review | **Done** — [`docs/SECURITY_AUTOMATED_REVIEW.md`](SECURITY_AUTOMATED_REVIEW.md); independent human review still required |

---

## Verified working (with evidence)

| Capability | Evidence |
|---|---|
| Agent → dashboard telemetry | Live prod checks: `POST /api/enrol` (valid secret) → 200, invalid secret → 401, `POST /api/telemetry` (agent `Z` timestamp) → 200 `{"accepted":1}`, row in `usage_events`. Server accepts `Z` and `+00:00`. |
| Contract parity | Python-exported fixture passes `usageBatchSchema` in CI |
| Rate limiting | Vitest: under-limit 200, over-limit 429 + `Retry-After`. Prod: Upstash KV-backed; fails **closed** (503) only if creds missing — a brief 503 window after the first deploy was resolved by fixing the KV env names + redeploy. |
| Token compression | `headroom-ai==0.25.0`; eval gate in CI; local pilot: **27.5% savings** on log fixture via `pilot_verify.py` (hyper) |
| Mac local pilot (base-URL) | **Verified** on internal Mac: Claude Code → `127.0.0.1:8787` → JSONL + Supabase `usage_events`; autonomous gate: `packaging/macos/pilot_verify.sh` |
| Multi-tenant isolation | RLS tests in CI + prod policy audit |
| PII-free telemetry | Agent `assert_pii_free` + server Zod `.strict()` |
| Stripe test infrastructure | Billing meter `wisp_savings_fee`, price lookup `wisp_savings_share_v1`, webhook on prod URL |

---

## GA blockers — require your action

1. **Rotate the weak demo enrol secret** — the live value is a low-entropy placeholder (and was exposed in plaintext during verification). Generate a high-entropy secret, update the Supabase `enrol_secrets` hash + Vercel `WISP_DEMO_ENROL_SECRET`, before any public demo exposure. _(Upstash KV is wired and prod ingest is verified — no longer a blocker.)_
2. **Apple Developer** — [`docs/APPLE_SIGNING.md`](APPLE_SIGNING.md)
3. **Stripe live** — repeat setup with `sk_live_...`; explicit approval before Enable Billing
4. **Transactional email** — Supabase custom SMTP + `WISP_RESEND_KEY`
5. **Sentry** — `WISP_SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN`
6. **Real-device MDM pilot** — [`docs/MDM_PILOT_RUNBOOK.md`](MDM_PILOT_RUNBOOK.md)
7. **Independent security review** — before customer billing at scale

---

## Risks (updated)

- **HIGH — prove base-URL interception on a real device** — **done on internal Mac pilot**; repeat on MDM-managed fleet per [`docs/MDM_PILOT_RUNBOOK.md`](MDM_PILOT_RUNBOOK.md)
- **MED — weak demo enrol secret** — rotate to high-entropy before public exposure; current value was shared in plaintext during verification
- **MED — net-of-cache positioning** — gross equals net until cache reads reported; frame honestly in sales
- **LOW — legacy `WISP_ENROL_SECRET` env** — remove when confirmed unused; per-tenant secrets only

---

## Suggested launch sequence

1. Rotate the weak demo enrol secret (Upstash KV + prod ingest already verified)
2. MDM pilot on internal Macs (base-URL + savings)
3. Independent security review
4. Stripe test shadow billing → live keys + Enable Billing when approved
5. SMTP + Sentry for production ops
