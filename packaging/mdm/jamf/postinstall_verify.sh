#!/bin/bash
# Jamf postinstall verification — agent + Headroom proxy readiness.
set -euo pipefail
curl -sf http://127.0.0.1:8787/readyz | grep -q '"ready": true'
test -f /var/log/wisp/headroom.jsonl || test -d /var/log/wisp
echo "Wisp agent OK"
