# MDM pilot validation runbook

Use this on **1–2 physical managed Macs** (Jamf Pro or Microsoft Intune) before design-partner rollout. The goal is to prove the full value chain — especially **base-URL interception** — not just that the agent installs.

**Time budget:** ~2 hours first device (includes one 300s telemetry flush wait).

---

## Pre-flight

| Item | Source |
|------|--------|
| Signed + notarized PKG | [`docs/APPLE_SIGNING.md`](APPLE_SIGNING.md) |
| SaaS URL | e.g. `https://saas-tau-teal.vercel.app` |
| Tenant UUID | Dashboard or `WISP_TENANT_ID` |
| Enrol secret (plaintext, once) | Fleet → Rotate enrol secret |
| Pilot Smart Group | 1–2 internal Macs |
| Test API keys | Anthropic/OpenAI keys for Claude Code / Codex on pilot Mac |

Confirm Upstash rate limiting is wired (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` in Vercel) — otherwise ingest returns **503**.

---

## Phase 1 — Install agent

### Jamf

Follow [`packaging/mdm/jamf/README.md`](../packaging/mdm/jamf/README.md):

1. Upload **signed** `WispAgent-*-signed.pkg`
2. Policy order: **Install PKG** → **Run `enrol_device.sh` as root**

Enrol script env (Policy Secret / parameters):

```bash
export WISP_SAAS_ENDPOINT="https://YOUR_SAAS_URL"
export WISP_TENANT_ID="YOUR_TENANT_UUID"
export WISP_ENROL_SECRET="YOUR_ENROL_SECRET"
export WISP_GROUP_NAME="Pilot"
export WISP_POLICY_LEVEL="aggressive"
```

### Intune

Follow [`packaging/mdm/intune/README.md`](../packaging/mdm/intune/README.md) — same env vars.

### Verify install

On the pilot Mac (SSH or local admin):

```bash
# LaunchDaemon loaded
sudo launchctl list | grep com.wisp.agent

# Agent logs
sudo tail -50 /var/log/wisp/agent.log
sudo tail -20 /var/log/wisp/agent.err

# Profile written by enrol script
sudo cat "/Library/Application Support/Wisp/profile.json"
# Expect: tenancy_id, device_id, saas_endpoint, enrolment_token, policy_level

# Proxy health (critical)
curl -sf http://127.0.0.1:8787/readyz && echo OK
curl -sf http://127.0.0.1:8788/glance 2>/dev/null | head -c 200; echo
```

**Pass criteria:** `readyz` returns 200; `profile.json` has non-empty `enrolment_token` and `device_id`.

**Fail:** Empty profile → PKG postinstall ran before enrol script; re-run [`enrol_device.sh`](../packaging/mdm/enrol_device.sh). Proxy not ready → check `/var/log/wisp/agent.err` for Headroom startup errors.

---

## Phase 2 — Base-URL interception (critical)

This is the **core unproven assumption**: developer tools must send API traffic through the local Headroom proxy.

### Deploy base-URL hints

From PKG: `packaging/macos/staging/etc/wisp/base-url.env` (or equivalent):

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:8787
export OPENAI_BASE_URL=http://127.0.0.1:8787/v1
```

Deploy via Jamf **Configuration Profile**, **Script**, or shell profile in the pilot group. Ensure variables are visible in the **same user session** that runs Claude Code / Codex.

### Confirm interception

**Before** running a coding agent:

```bash
# Optional: watch proxy access in agent log while testing
sudo tail -f /var/log/wisp/headroom.jsonl
```

**Test A — Claude Code (Anthropic)**

1. Open Terminal as the pilot user (with `ANTHROPIC_BASE_URL` set).
2. Run a small Claude Code task (single prompt, minimal tokens).
3. **Pass:** new lines append to `/var/log/wisp/headroom.jsonl` with token counts; `curl http://127.0.0.1:8787/readyz` still OK.

**Test B — Codex / OpenAI-compatible CLI**

1. Ensure `OPENAI_BASE_URL=http://127.0.0.1:8787/v1`.
2. Run a minimal completion.
3. **Pass:** JSONL log shows the model + token fields.

**Test C — Negative control**

1. Unset `ANTHROPIC_BASE_URL` / `OPENAI_BASE_URL` in a fresh shell.
2. Run the same tool.
3. **Pass:** traffic goes **direct** to provider (no new compression lines in JSONL, or provider IP in network trace). Confirms base URL is what steers traffic, not a system-wide redirect.

**Common failures**

| Symptom | Likely cause |
|---------|----------------|
| Tool works but JSONL empty | Base URL not set in tool's environment (GUI apps don't inherit Jamf script env) |
| Connection refused | Agent/proxy not running — check LaunchDaemon |
| 401 from proxy | Upstream API key missing in tool config (expected; proxy still intercepts) |
| Savings always zero | Policy `off` or no compressible input |

---

## Phase 3 — SaaS dashboard

1. Open SaaS → **Fleet** as tenant member.
2. **Pass:** pilot device appears with **Last seen** within ~5 minutes of agent start.
3. After Phase 2 token usage, wait **≥300s** (default `WISP_FLUSH_INTERVAL`) for telemetry flush.
4. Refresh **Dashboard** → savings counters increase.
5. Optional: Supabase `usage_events` row for pilot `device_id` with recent `window_end`.

**Telemetry contract:** agent sends RFC 3339 **`Z`** timestamps; server accepts `Z` and legacy `+00:00`.

---

## Phase 4 — Rate limit & error sanity

| Test | Expected |
|------|----------|
| Normal flush cadence | HTTP 200 on `/api/telemetry` |
| Burst >12 telemetry posts / 5 min / token | HTTP 429 + `Retry-After` |
| Invalid batch field (e.g. `prompt`) | HTTP 422, nothing stored |
| Revoked enrol secret | HTTP 401 on `/api/enrol` |

---

## Rollback

1. Jamf/Intune: remove PKG policy from pilot group.
2. On device:
   ```bash
   sudo launchctl bootout system /Library/LaunchDaemons/com.wisp.agent.plist
   sudo rm -f "/Library/Application Support/Wisp/profile.json"
   sudo rm -rf /usr/local/wisp
   ```
3. Unset base-URL env from configuration profile.
4. SaaS: optionally delete pilot device from Fleet (orphan `usage_events` cascade on device delete).

---

## Sign-off checklist

- [ ] Signed PKG installs without Gatekeeper block
- [ ] `enrol_device.sh` writes valid `profile.json`
- [ ] `readyz` healthy
- [ ] Claude Code / Codex traffic appears in `headroom.jsonl`
- [ ] Fleet `last_seen` updates
- [ ] Dashboard savings populate after flush interval
- [ ] Negative control confirms base URL is required for interception
