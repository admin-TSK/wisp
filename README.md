# Wisp

> Invisible intelligence. Visible savings.

Wisp is an enterprise efficiency layer that cuts AI coding token costs across a developer fleet. It wraps a high-ratio context-compression engine with governance, fleet distribution, and audited billing. **The compression is commodity. The wrapper is the product.**

## Monorepo layout

| Path | What |
|------|------|
| `agent/` | Python endpoint agent that supervises a pinned compression proxy, applies MDM policy, and emits PII-free telemetry. |
| `agent-ui-macos/` | SwiftUI menu-bar app — glanceable, read-only on-device savings. |
| `saas/` | Next.js (App Router) control plane: fleet dashboard, savings, policy, billing, telemetry/enrol/Stripe APIs. |
| `supabase/` | Postgres schema + RLS migrations and the `model_pricing` rate-card seed. |
| `design/` | Shared design system: tokens, principles, review checklist (Apple-inspired). |
| `evals/` | Compression-quality regression gate that runs on every compression-engine version bump. |
| `packaging/` | macOS PKG (Jamf-ready) first; Windows/Intune fast-follow. |

## Prime directives
1. **Depend on the pinned engine, never fork it** — eval-gated version bumps.
2. **Telemetry is aggregate and PII-free, always** — counts only, never content.
3. **Bill on measured tokens removed, net of provider cache discounts** — never counterfactuals.
4. **The meter must be deterministically reproducible** — inspectable agent.
5. **Preserve third-party attribution** — bundled-engine license notices ship in every artifact (`licenses/`).
6. **White-label freely, lead with the wrapper.**
7. **Only cover billable, cleanly-interceptable traffic** (base-URL redirection; no desktop-app MITM).

## Quick start (dev)

```bash
# Agent
cd agent && python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
PYTHONPATH=. pytest

# SaaS
cd saas && npm install
cp .env.example .env.local   # fill in values (see below)
npm run dev                  # http://localhost:3000
```

### SaaS environment
`saas/.env.local` (gitignored). Required to run the dashboard + ingest:

| Var | Used by | Notes |
|-----|---------|-------|
| `WISP_SUPABASE_URL` | all | Supabase project URL |
| `WISP_SUPABASE_ANON_KEY` | dashboard | RLS-scoped reads |
| `WISP_SUPABASE_SERVICE_ROLE` | ingest, onboarding, rollup | secret; never commit. Use a **separate dev project**, never prod. |
| `WISP_DEMO_TENANT_ID` | onboarding | optional; enables "Join Demo" |
| `WISP_CRON_SECRET` | `/api/cron/rollup` | Vercel Cron bearer secret |
| `WISP_STRIPE_SECRET` / `WISP_STRIPE_WEBHOOK_SECRET` | billing | use a `sk_test_...` key in dev |

### Auth + onboarding flow
1. Sign up / sign in at `/login` (Supabase Auth).
2. First visit routes to `/onboarding` — create a workspace, or **Join Demo** to land in the seeded "Acme Engineering" tenant with live data.
3. Dashboard reads are RLS-scoped to your tenant.

Device enrolment is authorized by a **per-tenant** secret minted in the dashboard (Fleet → Rotate enrol secret) and stored hashed in `enrol_secrets`; `/api/enrol` resolves the tenant from the secret, never from the request body. There is no global enrol secret.

## Deploy (Vercel)
1. `cd saas && vercel link` (or import the repo in the Vercel dashboard).
2. Set the env vars above in Vercel Project Settings (all environments).
3. The billing rollup runs daily via `vercel.json` cron (`/api/cron/rollup`, secured by `WISP_CRON_SECRET`).
4. Point Stripe's webhook at `/api/stripe/webhook` and set `WISP_STRIPE_WEBHOOK_SECRET`.

Database changes live in `supabase/migrations/` — apply with `scripts/apply_supabase.sh` (psql) or the Supabase MCP / CLI.

## Status
Production-shaped: auth, multi-tenant RLS (CI-tested), live fleet/savings/billing reads, deterministic net-of-cache meter, idempotent telemetry + Stripe meter events, scheduled billing rollup, MDM enrol script (`packaging/mdm/enrol_device.sh`), unsigned PKG + ad-hoc menu-bar app, and marketing site at `/`. Remaining before GA: Apple sign/notarize, MDM pilot validation on real devices, Stripe + SMTP + Sentry go-live. See `docs/HANDOFFS.md`.

## License
Wisp application code: proprietary. Bundled third-party components are used under their respective licenses (see `licenses/`).
