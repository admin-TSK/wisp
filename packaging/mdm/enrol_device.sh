#!/usr/bin/env bash
# Enrol a Mac with the Wisp SaaS and write the agent profile.
#
# Run as root after the Wisp PKG is installed (Jamf/Intune policy script).
# The tenant enrol secret is minted in the dashboard: Fleet → Rotate enrol secret.
#
# Required: WISP_SAAS_ENDPOINT, WISP_TENANT_ID, WISP_ENROL_SECRET
# Optional: WISP_DEVICE_LABEL, WISP_GROUP_NAME, WISP_POLICY_LEVEL

set -euo pipefail

: "${WISP_SAAS_ENDPOINT:?Set WISP_SAAS_ENDPOINT}"
: "${WISP_TENANT_ID:?Set WISP_TENANT_ID}"
: "${WISP_ENROL_SECRET:?Set WISP_ENROL_SECRET}"

export WISP_SAAS_ENDPOINT="${WISP_SAAS_ENDPOINT%/}"
export WISP_DEVICE_LABEL="${WISP_DEVICE_LABEL:-$(hostname -s)}"
export WISP_GROUP_NAME="${WISP_GROUP_NAME:-}"
export WISP_POLICY_LEVEL="${WISP_POLICY_LEVEL:-aggressive}"

PYTHON="${WISP_PYTHON:-/usr/local/wisp/venv/bin/python3}"
if [[ ! -x "$PYTHON" ]]; then
  PYTHON="$(command -v python3)"
fi

PROFILE="/Library/Application Support/Wisp/profile.json"
PROFILE_TMP="${PROFILE}.tmp"
export PROFILE PROFILE_TMP
mkdir -p "$(dirname "$PROFILE")" /var/log/wisp /var/lib/wisp

RESP_FILE="$(mktemp)"
export RESP_FILE
trap 'rm -f "$RESP_FILE" "$PROFILE_TMP"' EXIT

"$PYTHON" <<'PY' > /tmp/wisp-enrol-body.json
import json, os
body = {"enrolment_label": os.environ["WISP_DEVICE_LABEL"]}
if os.environ.get("WISP_GROUP_NAME"):
    body["group_name"] = os.environ["WISP_GROUP_NAME"]
print(json.dumps(body))
PY

HTTP_CODE=$(curl -sf --retry 3 --retry-delay 2 -w "%{http_code}" -o "$RESP_FILE" \
  -X POST "${WISP_SAAS_ENDPOINT}/api/enrol" \
  -H "Content-Type: application/json" \
  -H "X-Wisp-Enrol-Secret: ${WISP_ENROL_SECRET}" \
  -d @/tmp/wisp-enrol-body.json) || true

rm -f /tmp/wisp-enrol-body.json

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "Enrolment failed (HTTP ${HTTP_CODE:-unknown}): $(cat "$RESP_FILE" 2>/dev/null || true)" >&2
  exit 1
fi

"$PYTHON" <<'PY'
import json, os, pathlib, sys

resp_path = os.environ["RESP_FILE"]
profile_tmp = os.environ["PROFILE_TMP"]
profile = os.environ["PROFILE"]

with open(resp_path) as fh:
    resp = json.load(fh)

for key in ("device_id", "enrolment_token"):
    if not resp.get(key):
        print(f"Enrol response missing {key}", file=sys.stderr)
        sys.exit(1)

out = {
    "tenancy_id": os.environ["WISP_TENANT_ID"],
    "device_id": resp["device_id"],
    "saas_endpoint": os.environ["WISP_SAAS_ENDPOINT"].rstrip("/"),
    "enrolment_token": resp["enrolment_token"],
    "policy_level": os.environ.get("WISP_POLICY_LEVEL", "aggressive"),
}
pathlib.Path(profile_tmp).write_text(json.dumps(out, indent=2) + "\n")
pathlib.Path(profile_tmp).chmod(0o600)
pathlib.Path(profile_tmp).replace(profile)
print(f"Wrote {profile} for device {out['device_id']}")
PY

launchctl kickstart -k system/com.wisp.agent 2>/dev/null || \
  launchctl bootstrap system /Library/LaunchDaemons/com.wisp.agent.plist 2>/dev/null || \
  launchctl load /Library/LaunchDaemons/com.wisp.agent.plist 2>/dev/null || true

echo "Wisp enrolment complete. Verify: curl -sf http://127.0.0.1:8787/readyz"
