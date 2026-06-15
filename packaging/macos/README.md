# macOS packaging

## Build PKG

```bash
bash packaging/macos/build_pkg.sh
```

Output: `packaging/macos/dist/WispAgent-0.1.0-unsigned.pkg`

Sign and notarize before production deployment — see `docs/HANDOFFS.md`.

## Device configuration

The agent reads **`/Library/Application Support/Wisp/profile.json`** (see `agent/wisp_agent/config.py`). It does **not** read MCX / mobileconfig preference payloads.

After PKG install, run **`packaging/mdm/enrol_device.sh`** with your tenant enrol secret. That script:

1. Calls `POST /api/enrol` with header `X-Wisp-Enrol-Secret`
2. Writes `profile.json` with the returned `device_id` and `enrolment_token`
3. Restarts the agent

See `packaging/mdm/jamf/README.md` or `packaging/mdm/intune/README.md` for MDM policy steps.

## Deprecated: `wisp.mobileconfig`

The previous mobileconfig delivered static `enrolment_token` placeholders. That flow is replaced by per-device enrol via `enrol_device.sh`. Do not use `wisp.mobileconfig` for new deployments.
