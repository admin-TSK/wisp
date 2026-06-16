# Apple signing & notarization checklist

Wisp ships two macOS artifacts that require **Developer ID** signing and Apple notarization before end-user deployment:

1. **Agent PKG** — [`packaging/macos/build_pkg.sh`](../packaging/macos/build_pkg.sh)
2. **Menu-bar app** — [`agent-ui-macos/`](../agent-ui-macos/) (XcodeGen project, scheme `WispMenuBar`)

Both are currently **unsigned/ad-hoc** (`CODE_SIGN_IDENTITY: "-"` in `project.yml`). Gatekeeper will block them on managed Macs until signed.

---

## Prerequisites (fill in)

| Placeholder | Your value |
|-------------|------------|
| `TEAMID` | Apple Developer Team ID |
| `YOUR_ORG` | Legal entity name on the Developer ID certificate |
| `YOUR_APPLE_ID` | Apple ID email for notarytool |
| `APP_SPECIFIC_PASSWORD` | App-specific password (appleid.apple.com) |
| `WISP_VERSION` | Release version (default `0.1.0`) |

Certificates needed in Keychain:

- **Developer ID Installer** — for the `.pkg`
- **Developer ID Application** — for the `.app` / `.dmg`

---

## 1. Build unsigned PKG

```bash
cd /path/to/wisp
export WISP_VERSION=0.1.0
bash packaging/macos/build_pkg.sh
# Output: packaging/macos/dist/WispAgent-${WISP_VERSION}-unsigned.pkg
```

Verify: PKG installs agent venv at `/usr/local/wisp/venv`, LaunchDaemon at `/Library/LaunchDaemons/com.wisp.agent.plist`.

---

## 2. Sign + notarize PKG

```bash
export WISP_VERSION=0.1.0
export SIGNING_IDENTITY="Developer ID Installer: YOUR_ORG (TEAMID)"

productsign --sign "$SIGNING_IDENTITY" \
  "packaging/macos/dist/WispAgent-${WISP_VERSION}-unsigned.pkg" \
  "packaging/macos/dist/WispAgent-${WISP_VERSION}-signed.pkg"

xcrun notarytool submit "packaging/macos/dist/WispAgent-${WISP_VERSION}-signed.pkg" \
  --apple-id YOUR_APPLE_ID \
  --team-id TEAMID \
  --password APP_SPECIFIC_PASSWORD \
  --wait

xcrun stapler staple "packaging/macos/dist/WispAgent-${WISP_VERSION}-signed.pkg"
xcrun stapler validate "packaging/macos/dist/WispAgent-${WISP_VERSION}-signed.pkg"
```

Upload **`WispAgent-*-signed.pkg`** to Jamf/Intune (not the unsigned build).

---

## 3. Menu-bar app (WispMenuBar)

```bash
brew install xcodegen   # if needed
cd agent-ui-macos
xcodegen generate
```

**Local ad-hoc only** (not for distribution):

```bash
xcodebuild -scheme WispMenuBar -configuration Release build CODE_SIGN_IDENTITY="-"
```

**Distribution:**

1. Open `WispMenuBar.xcodeproj` in Xcode
2. Select target **WispMenuBar** → Signing & Capabilities → Team = `TEAMID`, **Developer ID Application**
3. **Product → Archive**
4. **Distribute App → Developer ID** → notarize via Organizer (or export `.app` and run `notarytool` + `stapler` on the `.app` or `.dmg`)

Bundle ID: `com.wisp.menubar` (from [`project.yml`](../agent-ui-macos/project.yml)).

---

## 4. Post-sign smoke test (on a clean Mac)

```bash
# After PKG + enrol script (see docs/MDM_PILOT_RUNBOOK.md)
curl -sf http://127.0.0.1:8787/readyz
spctl --assess --type execute -v /usr/local/wisp/venv/bin/wisp-agent
```

Both should pass without Gatekeeper prompts once stapled.
