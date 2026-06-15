# Wisp menu-bar app (macOS)

A native SwiftUI menu-bar app that shows glanceable, **read-only** token savings
from the local Wisp agent. It reads `http://127.0.0.1:8788/glance` (counts only),
never talks to the SaaS, and never changes policy (IT owns policy).

## Design
Follows `../apple_ui_ux_guideline.md` literally: `MenuBarExtra` status item +
popover, SF Symbols, system materials (Liquid Glass via `.regularMaterial`,
which respects Reduce Transparency), watchOS-style brevity, accessible labels,
status communicated with symbol + text (never color alone).

## Build
Requires macOS 13+ and Xcode 15+.

1. Create a new macOS App target in Xcode named `WispMenuBar`.
2. Add the three sources in `WispMenuBar/` (`WispMenuBarApp.swift`,
   `GlanceModel.swift`, `GlanceView.swift`).
3. In the target's Info, set **Application is agent (UIElement)** = YES so it runs
   as a menu-bar-only app (no Dock icon).
4. Add the App Transport Security exception for `127.0.0.1` (local HTTP) or use
   the loopback exemption.
5. Run. The leaf icon shows today's net savings; the popover shows detail.

The agent (`../agent`) must be running so the local stats feed is available.
