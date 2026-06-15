#!/usr/bin/env bash
# Enrol a Mac with the Wisp SaaS and write the agent profile.
#
# Run as root after the Wisp PKG is installed (Jamf/Intune policy script).
# The tenant enrol secret is minted in the dashboard: Fleet → Rotate enrol secret.
# It is sent as X-Wisp-Enrol-Secret; the tenant is resolved server-side.
#
# Required environment (set via MDM script parameters or a secrets payload):
#   WISP_SAAS_ENDPOINT   e.g. https://saas-tau-teal.vercel.app
#   WISP_TENANT_ID       tenant UUID (shown in dashboard / onboarding)
#   WISP_ENROL_SECRET    per-tenant enrol secret (plaintext, one-time from Fleet)
#
# Optional:
#   WISP_DEVICE_LABEL    defaults to hostname
#   WISP_GROUP_NAME      fleet group label
#   WISP_POLICY_LEVEL    off | conservative | balanced | aggressive (default: aggressive)
#
# Writes /Library/Application Support/Wisp/profile.json and restarts the agent.

set -euo pipefail

: "${WISP_SAAS_ENDPOINT:?Set WISP_SAAS_ENDPOINT (e.g. https://your-saas.vercel.app)}"
: "${WISP_TENANT_ID:?Set WISP_TENANT_ID (tenant UUID from the Wisp dashboard)}"
: "${WISP_ENROL_SECRET:?Set WISP_ENROL_SECRET (Fleet → Rotate enrol secret)}"

export WISP_SAAS_ENDPOINT="${WISP_SAAS_ENDPOINT%/}"
export WISP_DEVICE_LABEL="${WISP_DEVICE_LABEL:-$(hostname -s)}"
export WISP_GROUP_NAME="${WISP_GROUP_NAME:-}"
export WISP_POLICY_LEVEL="${WISP_POLICY_LEVEL:-aggressive}"

PROFILE="/Library/Application Support/Wisp/profile.json"
mkdir -p "$(dirname "$PROFILE")" /var/log/wisp /var/lib/wisp

python3 <<'PY' | curl -sf -X POST "${WISP_SAAS_ENDPOINT}/api/enrol" \
  -H "Content-Type: application/json" \
  -H "X-Wisp-Enrol-Secret: ${WISP_ENROL_SECRET}" \
  -d @- > /tmp/wisp-enrol.json
import json, os
body = {"enrolment_label": os.environ["WISP_DEVICE_LABEL"]}
if os.environ.get("WISP_GROUP_NAME"):
    body["group_name"] = os.environ["WISP_GROUP_NAME"]
print(json.dumps(body))
PY

python3 <<'PY'
import json, os, pathlib

resp = json.load(open("/tmp/wisp-enrol.json"))
profile = {
    "tenancy_id": os.environ["WISP_TENANT_ID"],
    "device_id": resp["device_id"],
    "saas_endpoint": os.environ["WISP_SAAS_ENDPOINT"].rstrip("/"),
    "enrolment_token": resp["enrolment_token"],
    "policy_level": os.environ.get("WISP_POLICY_LEVEL", "aggressive"),
}
path = pathlib.Path("/Library/Application Support/Wisp/profile.json")
path.write_text(json.dumps(profile, indent=2) + "\n")
path.chmod(0o600)
print(f"Wrote {path} for device {profile['device_id']}")
PY

rm -f /tmp/wisp-enrol.json

launchctl kickstart -k system/com.wisp.agent 2>/dev/null || \
  launchctl bootstrap system /Library/LaunchDaemons/com.wisp.agent.plist 2>/dev/null || \
  launchctl load /Library/LaunchDaemons/com.wisp.agent.plist 2>/dev/null || true

echo "Wisp enrolment complete. Verify: curl -sf http://127.0.0.1:8787/readyz"
