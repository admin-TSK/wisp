#!/usr/bin/env bash
# Local Mac pilot (no MDM/PKG). Enrols against prod, writes a user profile, runs wisp-agent.
#
# Usage:
#   export WISP_SAAS_ENDPOINT="https://saas-tau-teal.vercel.app"
#   export WISP_TENANT_ID="00000000-0000-4000-8000-000000000001"
#   export WISP_ENROL_SECRET="your-secret"
#   bash packaging/macos/pilot_local.sh
#
# Optional: WISP_FLUSH_INTERVAL=60 for faster dashboard updates during pilot.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PILOT_DIR="${WISP_PILOT_DIR:-$HOME/.wisp-pilot}"
PYTHON="${WISP_PYTHON:-python3.13}"

: "${WISP_SAAS_ENDPOINT:?Set WISP_SAAS_ENDPOINT}"
: "${WISP_TENANT_ID:?Set WISP_TENANT_ID}"
: "${WISP_ENROL_SECRET:?Set WISP_ENROL_SECRET}"

export WISP_SAAS_ENDPOINT="${WISP_SAAS_ENDPOINT%/}"
LABEL="${WISP_DEVICE_LABEL:-$(hostname -s)-pilot}"
GROUP="${WISP_GROUP_NAME:-Pilot}"
POLICY="${WISP_POLICY_LEVEL:-aggressive}"
FLUSH="${WISP_FLUSH_INTERVAL:-60}"

mkdir -p "$PILOT_DIR"/{log,var}

echo "==> Enrolling device ($LABEL) against $WISP_SAAS_ENDPOINT"
BODY=$(LABEL="$LABEL" GROUP="$GROUP" python3 -c "import json,os; print(json.dumps({'enrolment_label': os.environ['LABEL'], 'group_name': os.environ.get('GROUP') or None}))")
RESP=$(curl -sf -X POST "${WISP_SAAS_ENDPOINT}/api/enrol" \
  -H "Content-Type: application/json" \
  -H "X-Wisp-Enrol-Secret: ${WISP_ENROL_SECRET}" \
  -d "$BODY")

DEVICE_ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['device_id'])")
TOKEN=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['enrolment_token'])")
export DEVICE_ID TOKEN

PROFILE="$PILOT_DIR/profile.json"
export WISP_TENANT_ID WISP_SAAS_ENDPOINT PILOT_DIR PROFILE POLICY
python3 <<'PY'
import json, os, pathlib
out = {
    "tenancy_id": os.environ["WISP_TENANT_ID"],
    "device_id": os.environ["DEVICE_ID"],
    "saas_endpoint": os.environ["WISP_SAAS_ENDPOINT"],
    "enrolment_token": os.environ["TOKEN"],
    "policy_level": os.environ.get("POLICY", "aggressive"),
    "log_file": str(pathlib.Path(os.environ["PILOT_DIR"]) / "log" / "headroom.jsonl"),
    "state_file": str(pathlib.Path(os.environ["PILOT_DIR"]) / "var" / "state.json"),
}
pathlib.Path(os.environ["PROFILE"]).write_text(json.dumps(out, indent=2) + "\n")
print("Wrote", os.environ["PROFILE"])
print("device_id", out["device_id"])
PY

echo "==> Creating agent venv ($PILOT_DIR/venv)"
"$PYTHON" -m venv "$PILOT_DIR/venv"
"$PILOT_DIR/venv/bin/pip" install -q -U pip
"$PILOT_DIR/venv/bin/pip" install -q "$ROOT/agent"

if lsof -i :8787 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "==> Port 8787 busy — stop other Headroom/wisp processes first:"
  lsof -i :8787 -sTCP:LISTEN || true
  echo "    kill <pid>  # often a standalone 'headroom proxy --port 8787'"
  exit 1
fi

cat > "$PILOT_DIR/base-url.env" <<'ENV'
export ANTHROPIC_BASE_URL=http://127.0.0.1:8787
export OPENAI_BASE_URL=http://127.0.0.1:8787/v1
ENV

echo "==> Starting wisp-agent (logs: $PILOT_DIR/agent.log)"
export WISP_CONFIG_PROFILE="$PROFILE"
export WISP_FLUSH_INTERVAL="$FLUSH"
nohup "$PILOT_DIR/venv/bin/wisp-agent" >"$PILOT_DIR/agent.log" 2>&1 &
echo $! > "$PILOT_DIR/agent.pid"

for i in $(seq 1 45); do
  if curl -sf http://127.0.0.1:8787/readyz >/dev/null 2>&1; then
    echo "==> Proxy ready (attempt $i)"
    curl -sf http://127.0.0.1:8787/readyz | head -c 120
    echo
    break
  fi
  sleep 2
  if [[ $i -eq 45 ]]; then
    echo "Proxy not ready — tail $PILOT_DIR/agent.log"
    tail -30 "$PILOT_DIR/agent.log" || true
    exit 1
  fi
done

echo
echo "Pilot running. Autonomous verify (no Claude Code required):"
echo "  bash packaging/macos/pilot_verify.sh"
echo
echo "Optional: copy packaging/macos/pilot.env.example → $PILOT_DIR/pilot.env (ANTHROPIC_API_KEY)"
echo "Manual Claude Code test:"
echo "  source $PILOT_DIR/base-url.env && claude"
echo "Stop: kill \$(cat $PILOT_DIR/agent.pid)"
