#!/usr/bin/env bash
# Build an unsigned macOS PKG for Wisp endpoint agent + pinned Headroom.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VERSION="${WISP_VERSION:-0.1.0}"
STAGING="${ROOT}/packaging/macos/staging"
PKG_ID="com.wisp.agent"
OUTPUT="${ROOT}/packaging/macos/dist/WispAgent-${VERSION}-unsigned.pkg"

SCRIPTS="${ROOT}/packaging/macos/scripts"
rm -rf "$STAGING" "$SCRIPTS" "${ROOT}/packaging/macos/dist"
mkdir -p "$STAGING/usr/local/wisp" "$STAGING/Library/LaunchDaemons" "$STAGING/etc/wisp" "$SCRIPTS" "${ROOT}/packaging/macos/dist"

# Agent bundle (Python venv with pinned headroom-ai[proxy]).
python3.13 -m venv "$STAGING/usr/local/wisp/venv"
"$STAGING/usr/local/wisp/venv/bin/pip" install -q -U pip
"$STAGING/usr/local/wisp/venv/bin/pip" install -q "$ROOT/agent"

# LaunchDaemon — supervises wisp-agent; IT fills profile.json via MDM.
cat > "$STAGING/Library/LaunchDaemons/com.wisp.agent.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.wisp.agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/wisp/venv/bin/wisp-agent</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/var/log/wisp/agent.log</string>
  <key>StandardErrorPath</key><string>/var/log/wisp/agent.err</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>WISP_CONFIG_PROFILE</key>
    <string>/Library/Application Support/Wisp/profile.json</string>
    <key>WISP_LOG_FILE</key>
    <string>/var/log/wisp/headroom.jsonl</string>
  </dict>
</dict>
</plist>
PLIST

# Placeholder until packaging/mdm/enrol_device.sh runs (Jamf/Intune policy script).
cat > "$STAGING/etc/wisp/profile.template.json" <<'JSON'
{
  "_note": "Run packaging/mdm/enrol_device.sh after PKG install. See packaging/mdm/jamf/README.md.",
  "tenancy_id": "",
  "device_id": "",
  "saas_endpoint": "",
  "enrolment_token": "",
  "policy_level": "aggressive"
}
JSON

# Tool base-URL hints for Claude Code / OpenAI-compatible clients.
cat > "$STAGING/etc/wisp/base-url.env" <<'ENV'
# Point coding agents at the local Headroom proxy (installed by wisp-agent).
export ANTHROPIC_BASE_URL=http://127.0.0.1:8787
export OPENAI_BASE_URL=http://127.0.0.1:8787/v1
ENV

# Postinstall script
cat > "$SCRIPTS/postinstall" <<'POST'
#!/bin/bash
set -e
mkdir -p "/Library/Application Support/Wisp" /var/log/wisp /var/lib/wisp
PROFILE="/Library/Application Support/Wisp/profile.json"
if [[ ! -f "$PROFILE" ]]; then
  cp /etc/wisp/profile.template.json "$PROFILE"
  chmod 600 "$PROFILE"
fi
# Only start the agent when the profile has been populated by enrol_device.sh.
if python3 -c "import json,sys; p=json.load(open('$PROFILE')); sys.exit(0 if p.get('enrolment_token') and p.get('tenancy_id') else 1)" 2>/dev/null; then
  launchctl bootstrap system /Library/LaunchDaemons/com.wisp.agent.plist 2>/dev/null || \
    launchctl load /Library/LaunchDaemons/com.wisp.agent.plist 2>/dev/null || true
fi
POST
chmod +x "$SCRIPTS/postinstall"

# Component + product pkg (unsigned).
pkgbuild \
  --root "$STAGING" \
  --identifier "$PKG_ID" \
  --version "$VERSION" \
  --scripts "$SCRIPTS" \
  --install-location / \
  "${ROOT}/packaging/macos/dist/wisp-component.pkg"

productbuild \
  --package "${ROOT}/packaging/macos/dist/wisp-component.pkg" \
  "$OUTPUT"

echo "Built unsigned PKG: $OUTPUT"
