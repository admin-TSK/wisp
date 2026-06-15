# Wisp — Product Specification

## Overview
**Wisp** is an enterprise efficiency layer that cuts AI coding token costs across a developer fleet. It is a productized, governance-and-billing wrapper around a high-ratio context-compression engine. The compression is commodity; the wrapper is the product.

### Core value proposition
- Compresses LLM inputs (tool outputs, logs, RAG, files, code context) by 60-95%.
- Risk-free pricing: customers pay nothing upfront and are billed a capped percentage (default 10%) of **measured, net-of-cache** token savings.
- Zero-touch fleet rollout via MDM (Jamf / Intune) or a central gateway deployment.
- Central dashboard for fleet analytics, savings, per-device policy, and auditable billing.
- A native, glanceable on-device menu-bar app so developers see their own savings.

### Brand identity
- **Name**: Wisp
- **Tagline**: "Invisible intelligence. Visible savings."
- **Tone**: Professional, trustworthy, technically sophisticated yet effortless. Apple-inspired, dark-mode-first, accessible by default.

## Why this is a business
- The underlying compression is a commodity; enterprises don't adopt raw OSS tooling for fleet token governance. Wisp sells distribution, policy, audited billing, and support — none of which a bare engine provides.
- Competitors (Compresr, The Token Company) are developer self-serve / API plays. None solve enterprise fleet distribution. That gap is the wedge.

## Architecture (summary)
Two deployment modes share one proxy and one telemetry/billing spine, both intercepting only via base-URL redirection:
1. **Endpoint agent mode** — a supervised, pinned compression proxy on each device (MDM-installed), serving base-URL-aware agents (Claude Code, Codex first).
2. **Gateway mode** — the same proxy at a centralized org gateway (LiteLLM / Bedrock / Azure) for orgs that don't want per-endpoint installs.

Out of scope by design: desktop GUI apps (ChatGPT/Claude Desktop) and Cursor's hardcoded agent paths — uninterceptable without MITM and/or flat-rate (no per-token spend to share).

## Prime directives
1. Depend on the pinned engine, never fork it (eval-gated bumps).
2. Telemetry is aggregate and PII-free, always (counts and non-identifying metadata only).
3. Bill on measured tokens removed, **net of provider cache discounts**, never on counterfactuals.
4. The meter must be deterministically reproducible (inspectable agent; recompute removed-counts).
5. Preserve third-party attribution in every artifact.
6. White-label freely, lead with the wrapper.
7. Only cover billable, cleanly-interceptable traffic.

## Billing model
- Gross savings (shown): `tokens_removed × base_rate`.
- Billable (net-of-cache): `tokens_removed × blended_rate`, where `blended_rate = cached_rate × hit_ratio + base_rate × (1 − hit_ratio)`.
- `wisp_fee = min(measured_savings × take_rate, monthly_cap)`.
- Onboarding shadow period: meter visible, billing disabled, blend + cap agreed and frozen.

## UI surfaces
- **Web dashboard** (Next.js + shadcn/ui, Apple-inspired tokens): fleet, savings (gross + net), policy, billing.
- **Device agent UI** (SwiftUI menu-bar, native HIG): glanceable, read-only savings; reinforces meter trust.

See the full technical build specification in the Cursor plan, and design standards in `apple_ui_ux_guideline.md` + `design/`.
