# Credential-gated handoffs

Steps that require accounts or secrets outside this repo. Everything else is implemented and deployable with Vercel + Supabase only.

---

## Apple Developer (PKG + menu-bar app signing)

### PKG (`packaging/macos/build_pkg.sh`)
1. Build unsigned PKG: `bash packaging/macos/build_pkg.sh`
2. Sign with **Developer ID Installer**:
   ```bash
   productsign --sign "Developer ID Installer: Your Org (TEAMID)" \
     packaging/macos/dist/WispAgent-0.1.0-unsigned.pkg \
     packaging/macos/dist/WispAgent-0.1.0-signed.pkg
   ```
3. Notarize:
   ```bash
   xcrun notarytool submit packaging/macos/dist/WispAgent-0.1.0-signed.pkg \
     --apple-id YOUR_APPLE_ID --team-id TEAMID --password APP_SPECIFIC_PASSWORD --wait
   xcrun stapler staple packaging/macos/dist/WispAgent-0.1.0-signed.pkg
   ```

### Menu-bar app (`agent-ui-macos/`)
1. Install XcodeGen: `brew install xcodegen`
2. Generate project: `cd agent-ui-macos && xcodegen generate`
3. Ad-hoc build (local only): `xcodebuild -scheme WispMenuBar -configuration Release build CODE_SIGN_IDENTITY="-"`
4. Distribution: open in Xcode → **Product → Archive** → sign with **Developer ID Application** → notarize `.app` or `.dmg`

---

## Jamf Pro / Microsoft Intune

1. Build PKG: `bash packaging/macos/build_pkg.sh` (sign + notarize for production)
2. Mint a tenant enrol secret: SaaS **Fleet → Rotate enrol secret** (shown once)
3. Deploy PKG + run `packaging/mdm/enrol_device.sh` with `WISP_SAAS_ENDPOINT`, `WISP_TENANT_ID`, and `WISP_ENROL_SECRET` — see `packaging/mdm/jamf/README.md` or `packaging/mdm/intune/README.md`
4. Assign to a **pilot device group**
5. Validate: `curl http://127.0.0.1:8787/readyz` → SaaS Fleet shows `last_seen` + savings

---

## Stripe (billing go-live)

1. Create Stripe account (test first)
2. Run once with test key:
   ```bash
   WISP_STRIPE_SECRET=sk_test_... node scripts/setup_stripe.mjs
   ```
3. Set in Vercel **Production** env:
   - `WISP_STRIPE_SECRET`
   - `WISP_STRIPE_WEBHOOK_SECRET` (from Stripe Dashboard → Webhooks → `/api/stripe/webhook`)
4. In SaaS: **Billing → Enable Billing** (creates customer + subscription)
5. For live: repeat with `sk_live_...`, update webhook endpoint to production URL

---

## SMTP / transactional email (auth + reports)

Supabase built-in email works for dev; production handoff:

1. **Resend** (or SendGrid): create API key
2. Supabase Dashboard → **Authentication → SMTP Settings** → custom SMTP
3. Optional: set `WISP_RESEND_KEY` for savings-report emails (future cron)

Auth flows already wired:
- Sign-up confirmation → `/auth/confirm`
- Password reset → `/auth/reset-password` → email link → `/auth/confirm?next=/login`

Set `NEXT_PUBLIC_SITE_URL` to your production SaaS URL so redirect links are correct.

---

## Sentry

1. Create Sentry project (Next.js)
2. Set `WISP_SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` in Vercel
3. Redeploy — errors from API routes and server components will appear in Sentry

---

## Vercel production env checklist

| Variable | Required | Notes |
|----------|----------|-------|
| `WISP_SUPABASE_URL` | yes | |
| `WISP_SUPABASE_ANON_KEY` | yes | |
| `WISP_SUPABASE_SERVICE_ROLE` | yes | server only; rotate if ever exposed |
| `WISP_CRON_SECRET` | yes | daily rollup cron |
| `WISP_DEMO_TENANT_ID` | optional | onboarding demo |
| `NEXT_PUBLIC_SITE_URL` | yes | invite + auth links |
| `WISP_STRIPE_*` | handoff | billing |
| `WISP_SENTRY_DSN` | handoff | observability |

Cron: `vercel.json` registers `0 2 * * *` → `/api/cron/rollup` with `Authorization: Bearer $WISP_CRON_SECRET`.
