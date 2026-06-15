# Microsoft Intune (macOS) deployment

## Overview

1. Upload a signed PKG (agent + Headroom proxy).
2. Assign a shell script that runs `packaging/mdm/enrol_device.sh` with your tenant enrol secret.
3. Optionally use compliance script `verify_agent.sh`.

The agent reads **`/Library/Application Support/Wisp/profile.json` only**. Each device must call `POST /api/enrol` to receive a unique enrolment token — do not embed static tokens in a profile.

## 1. Prerequisites (dashboard)

1. Create a workspace (or use an existing tenant).
2. **Fleet → Rotate enrol secret** — copy the plaintext once (`WISP_ENROL_SECRET`).
3. Note **tenant UUID** (`WISP_TENANT_ID`) and SaaS URL (`WISP_SAAS_ENDPOINT`).

## 2. Convert PKG

Use the unsigned PKG from `packaging/macos/build_pkg.sh`, then **sign + notarize** before upload (see `docs/HANDOFFS.md`).

## 3. Line-of-business app

1. Intune admin center → **Apps** → **macOS** → **Line-of-business apps**
2. Upload signed PKG
3. Assign to a pilot device group

## 4. Enrolment script

1. **Devices** → **macOS** → **Shell scripts** → **Add**
2. Upload `packaging/mdm/enrol_device.sh`
3. Run as **root**, assign to the same pilot group (after PKG install)

Script environment (Intune script arguments or embedded exports):

```bash
export WISP_SAAS_ENDPOINT="https://YOUR_WISP_SAAS_URL"
export WISP_TENANT_ID="YOUR_TENANT_UUID"
export WISP_ENROL_SECRET="YOUR_ENROL_SECRET_FROM_FLEET"
export WISP_GROUP_NAME="Engineering"          # optional
export WISP_POLICY_LEVEL="aggressive"         # optional
```

Store `WISP_ENROL_SECRET` in Intune **Settings Catalog** or a secure variable — never in source control.

## 5. Compliance (optional)

Shell script `packaging/mdm/intune/verify_agent.sh`:

- Exit 0 if `curl -sf http://127.0.0.1:8787/readyz`
- Exit 1 otherwise → mark device non-compliant

## 6. Validation

SaaS **Fleet** should show the device after the enrol script succeeds.

## Rotating the enrol secret

After rotation in the dashboard, update the Intune script secret for new enrolments. Already-enrolled devices keep their bearer tokens.
