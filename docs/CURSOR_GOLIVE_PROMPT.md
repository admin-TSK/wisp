# Cursor prompt — Wisp go-live execution

> Copy everything below the line into Cursor (Agent mode, with the Vercel + Supabase MCPs connected).

---

You are working in the **Wisp** monorepo (`admin-TSK/wisp`, `main`). PR #1 is merged and prod is deployed at https://saas-tau-teal.vercel.app. Read `docs/PROD_READINESS.md` and `docs/HANDOFFS.md` first — they define the remaining work. Your job is to execute the items below, using your **Vercel** and **Supabase** MCP connections for infra, and to clearly hand back anything that needs a human credential or physical hardware.

## Operating rules (important)
- Work on a branch and open a PR; do not push to `main` directly.
- Keep CI green: `ruff` + `pytest` (agent), `npm run test` (vitest) + `npm run typecheck` (saas), and the `db-rls` job. Run them before opening the PR.
- **Never commit secrets.** Set all secrets via the Vercel MCP (env vars), never in files. Never print secret *values* in your output — names only.
- Use **test/sandbox** credentials by default. **Stop and ask me** before: flipping Stripe to live keys, enabling billing, rotating any production secret, or deleting/altering production data.
- If a task needs a credential you don't have (Apple cert, Stripe key, Resend key, Sentry DSN), **stop and ask me for it** — do not fabricate or stub it silently.
- As you finish each item, update its status in `docs/PROD_READINESS.md`.

## A. Code tasks (implement, test, include in the PR)

1. **Rate limit the public ingest routes.** `middleware.ts` only refreshes the session; `app/api/enrol/route.ts` and `app/api/telemetry/route.ts` are unthrottled.
   - Add rate limiting keyed by enrol secret/bearer token **and** client IP. Suggested: `@upstash/ratelimit` + Upstash Redis (set `UPSTASH_*` via Vercel MCP) or a Vercel WAF rule — pick one and justify it.
   - Limits: enrol ~10/min/IP; telemetry generous enough for normal flush cadence (agents flush every 300s) but bounded per token. Return HTTP 429 with `Retry-After`.
   - Add vitest cases: under-limit → 200, over-limit → 429, and confirm the happy path (valid batch) still passes.
   - Acceptance: new tests green; existing telemetry/enrol tests still green.

2. **Contract-parity regression test.** Prevent agent↔server drift (the class of bug that 422'd all telemetry). Add a test asserting the agent's serialized `UsageBatch` shape (field names + the real `_now_iso()` timestamp format) is accepted by `lib/telemetry-contract.ts`'s `usageBatchSchema`. A fixture generated from the Python side checked into the SaaS test is acceptable.

3. **Tidy `scripts/LINEAR_BACKLOG.md`** — mark implemented items (telemetry batch + ingest) done.

## B. Infra verification via MCP (report findings; fix the safe ones)

4. **Supabase** — verify and report:
   - All migrations `0001`–`0008` are applied in production.
   - **RLS is enabled with policies on every tenant-scoped table** — enumerate the tables (devices, usage_events, enrol_secrets, enrolment_tokens, billing_config, memberships, tenants, invites, …) and flag any table missing RLS or a tenant policy.
   - Demo tenant `00000000-0000-4000-8000-000000000001` is seeded (devices, usage_events, billing_config, an active `enrol_secrets` row).
   - **Demo enrol secret hygiene:** confirm `enrol_secrets` stores only a hash and that the demo secret value is high-entropy. If it's a weak/guessable string, rotate it, update `WISP_DEMO_ENROL_SECRET` in Vercel, and tell me the new value out-of-band (do not print it in the repo/PR).
   - Indexes exist for the hot query paths (`usage_events` by tenant + `window_start`; token/secret hash lookups).

5. **Vercel** — verify and report:
   - All required production env vars from the `HANDOFFS.md` checklist are present (names only): `WISP_SUPABASE_URL/ANON_KEY/SERVICE_ROLE`, `WISP_CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`, plus any you add in A1.
   - The daily rollup cron (`0 2 * * *` → `/api/cron/rollup`) is registered and the latest production deployment is healthy.
   - After the PR merges, confirm a clean redeploy.

## C. Credential go-lives (wire only when I provide keys; otherwise produce a checklist and stop)

6. **Stripe** — with a **test** key: run `scripts/setup_stripe.mjs`, set `WISP_STRIPE_SECRET` + `WISP_STRIPE_WEBHOOK_SECRET` in Vercel, point the webhook at `/api/stripe/webhook`, and verify a test event. Do **not** switch to live keys or enable billing without my explicit go-ahead.
7. **Transactional email** — when I provide a Resend/SMTP key: configure Supabase Auth custom SMTP and set `WISP_RESEND_KEY` in Vercel; verify a sign-up confirmation and password-reset email actually send.
8. **Sentry** — when I provide DSNs: set `WISP_SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` in Vercel, redeploy, and confirm a test error appears.

## D. Cannot be done by an agent — prepare, then flag for me

9. **Apple sign + notarize** (needs Apple Developer cert + a Mac): do **not** attempt. Instead, verify `packaging/macos/build_pkg.sh` and `agent-ui-macos` build configs are correct, and output the exact `productsign`/`notarytool`/`stapler` commands I need to run, with the placeholders I must fill.
10. **Real-device MDM pilot** (needs a physical managed Mac + Jamf/Intune): produce a step-by-step validation runbook from `packaging/mdm/*` that confirms base-URL interception of Claude Code/Codex traffic and that Fleet `last_seen` + savings populate. This base-URL interception is the single biggest unproven assumption — make the runbook thorough.
11. **Security review:** run an automated first-pass (auth, RLS coverage, service-role key handling, the new rate limits, input validation on all API routes) and summarize findings, but flag that an independent human review is still required before handling customer billing/traffic.

## Deliverable
Open one PR titled `chore: go-live hardening` containing A + B fixes, with a description that checks off each item, lists C/D items still pending my input, and links the updated `docs/PROD_READINESS.md`. Re-run the prod enrol→telemetry E2E (agent's real `+00:00` timestamp → expect 200 + a `usage_events` row) after the rate-limit change to confirm the happy path still works.
