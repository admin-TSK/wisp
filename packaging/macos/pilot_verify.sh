#!/usr/bin/env bash
# Autonomous local pilot verification — one command, no manual curl/Claude steps.
#
# Prerequisite: run packaging/macos/pilot_local.sh once (creates ~/.wisp-pilot).
# Optional: ~/.wisp-pilot/pilot.env with ANTHROPIC_API_KEY for upstream + compression test.
#
# Usage:
#   bash packaging/macos/pilot_verify.sh
#   bash packaging/macos/pilot_verify.sh --policy hyper
#   WISP_POLICY_LEVEL=hyper bash packaging/macos/pilot_verify.sh --skip-telemetry

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PILOT_DIR="${WISP_PILOT_DIR:-$HOME/.wisp-pilot}"
PYTHON="${WISP_PYTHON:-python3.13}"

if [[ -f "$PILOT_DIR/pilot.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$PILOT_DIR/pilot.env"
  set +a
fi

exec "$PYTHON" "$ROOT/agent/scripts/pilot_verify.py" --pilot-dir "$PILOT_DIR" "$@"
