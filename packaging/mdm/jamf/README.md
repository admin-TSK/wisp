# Jamf Pro deployment

## Overview

1. Install the Wisp PKG (agent + Headroom proxy).
2. Run `packaging/mdm/enrol_device.sh` with your tenant enrol secret — it calls `POST /api/enrol` and writes `profile.json`.
3. Optionally deploy base-URL hints so dev tools point at the local proxy.

The agent reads **`/Library/Application Support/Wisp/profile.json` only** — not MCX preferences. Do not bake enrolment tokens into a static mobileconfig; each device gets a unique token from the enrol API.

## 1. Prerequisites (dashboard)

1. Create a workspace (or use an existing tenant).
2. **Fleet → Rotate enrol secret** — copy the plaintext secret once (this is `WISP_ENROL_SECRET` for MDM).
3. Note your **tenant UUID** (`WISP_TENANT_ID`) and SaaS URL (`WISP_SAAS_ENDPOINT`).

## 2. Upload artifacts

- **PKG**: `packaging/macos/dist/WispAgent-*-unsigned.pkg` (sign + notarize first for production — see `docs/HANDOFFS.md`)
- **Enrol script**: `packaging/mdm/enrol_device.sh`

## 3. Policies

Create a **Computer Configuration** policy scoped to a pilot Smart Group:

| Step | Action |
|------|--------|
| 1 | Install PKG (priority 10) |
| 2 | Run **Script** `enrol_device.sh` as root with parameters below |
| 3 | Optional: run `packaging/mdm/jamf/postinstall_verify.sh` (exit 0 = healthy) |

### Enrol script parameters

Set these as Jamf script parameters or environment variables:

```bash
export WISP_SAAS_ENDPOINT="https://YOUR_WISP_SAAS_URL"
export WISP_TENANT_ID="YOUR_TENANT_UUID"
export WISP_ENROL_SECRET="YOUR_ENROL_SECRET_FROM_FLEET"
export WISP_GROUP_NAME="Engineering"          # optional
export WISP_POLICY_LEVEL="aggressive"         # optional
```

Jamf can store `WISP_ENROL_SECRET` in a **Policy Secret** or Extended Attribute — never commit it to git.

## 4. Base URL for developers

Deploy `packaging/macos/staging/etc/wisp/base-url.env` via Jamf **Script** or shell profile:

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:8787
export OPENAI_BASE_URL=http://127.0.0.1:8787/v1
```

## 5. Validation

```bash
curl -sf http://127.0.0.1:8787/readyz   # agent + proxy healthy
```

SaaS **Fleet** page should show the device with a recent **Last seen**.

## 6. Extension attributes (optional)

- `wisp_agent_version` — `/usr/local/wisp/venv/bin/wisp-agent --version`
- `wisp_proxy_ready` — `curl -sf http://127.0.0.1:8787/readyz`

## Rotating the enrol secret

After **Fleet → Rotate enrol secret**, update the Jamf policy secret and re-run the enrol script on new devices. Existing enrolled devices keep their bearer tokens until revoked.
