# Wisp Design Principles

Wisp's design system applies [`../apple_ui_ux_guideline.md`](../apple_ui_ux_guideline.md) to two surfaces. Tokens live once in [`tokens.json`](tokens.json) and are consumed by both.

| Surface | Tech | How Apple guidance applies |
|---------|------|----------------------------|
| Web dashboard (`saas/`) | Next.js + shadcn/ui + Tailwind | As a design *language* — clarity/deference/depth, type scale, spacing, semantic color, microcopy, accessibility. Not literal native controls. |
| Device agent UI (`agent-ui-macos/`) | SwiftUI, native | *Literally* — SF Symbols, Liquid Glass materials, menu-bar conventions, glanceability, system controls. |

## Principles → Wisp (guideline §2)
- **Clarity** — one primary task per screen. The Savings view leads with a single dollar headline; everything else is secondary.
- **Deference** — minimal chrome; the data (fleet, savings) is the interface. No decorative panels.
- **Depth** — sheets/sidebars for policy editing and device detail; preserve spatial continuity.
- **Consistency** — native controls on macOS; shadcn defaults on web. Don't reinvent controls.
- **Accessibility** — mandatory release gate: Dynamic Type, VoiceOver, Increase Contrast, Reduce Motion, Reduce Transparency; never color-only status.

## Patterns mapped to real flows
- **Destructive confirmations (§6.6):** policy delete, device revoke, disable billing. "Delete this policy? This removes the policy from all scoped devices. This action can't be undone." Actions: `Cancel` / `Delete Policy`.
- **Lists/tables + empty states (§6.3, §6.7):** fleet table is the core list; ship empty / loading (skeleton) / no-result states. Empty: "No devices enrolled — push the Wisp profile from Jamf to get started."
- **Buttons (§6.1):** verb labels — `Create Policy`, `Approve Request`, `Export Reconciliation`. Never `Submit`/`OK`. Define default/hover/focus/pressed/disabled/loading/error.
- **Microcopy (§10):** recovery-focused errors; confirmations state the outcome.
- **AI transparency (§11):** Wisp compresses silently, so disclose it plainly — state *what* is compressed and *that originals are recoverable via Headroom CCR*. Never claim "guaranteed identical."

## Device UI specifics
Treat the menu-bar popover like watchOS (§12.4): extreme brevity, immediate value, no deep navigation. Primary glance = today's $ saved + labeled status dot. One level deeper = 7-day / total + active policy. Nothing configurable (IT owns policy).
