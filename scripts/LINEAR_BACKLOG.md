# Wisp — Linear backlog (ready to import)

When the Linear MCP is reachable, create a project **"Wisp"** and these issues
(map to the build-spec phases). Each is sized to be independently shippable.

## Phase 0 — Wrapper skeleton + measurement
- [ ] Pin headroom-ai + proxy supervisor lifecycle (start/health/restart)
- [ ] stats_adapter: confirm Headroom stats surface incl. cache-read counts (spec §11.1)
- [ ] PII-free telemetry batch + ingest stub
- [ ] Deterministic-meter proof: reproduce removed-counts from same input

## Phase 1 — Enterprise endpoint (the moat)
- [ ] macOS PKG + LaunchDaemon + .mobileconfig profile (Jamf silent install)
- [ ] Policy levels via config profile -> Headroom env overlay
- [ ] local_stats feed + SwiftUI menu-bar UI (glanceable, a11y-complete)
- [ ] Security review pack: documented counts-only data flow

## Phase 2 — SaaS control plane + measured billing
- [ ] Supabase schema + RLS deploy; tenant resolved server-side on ingest
- [ ] Dashboard: fleet, savings (gross+net), policy, billing, reconciliation export
- [ ] Stripe metered billing + shadow period; freeze blend + cap with design partner
- [ ] Design + a11y review gate wired into CI

## Phase 3 — Broaden + harden
- [ ] Gateway mode deployment (LiteLLM / Bedrock / Azure chokepoint)
- [ ] Windows/Intune packaging; Copilot CLI / Aider coverage
- [ ] SOC2 prep, DPA templates, savings-methodology doc
- [ ] Cache-alignment optimisation surfaced + counted

> Tip: with the Linear MCP available, this file can be turned into issues via
> `save_project` (name "Wisp", addTeams: [<your team>]) then `save_issue` per line.
