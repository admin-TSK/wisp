import SwiftUI

// Wisp menu-bar app: glanceable, read-only on-device savings.
// HIG: status item + popover, SF Symbols, system materials (respect Reduce
// Transparency), brevity over depth. The dollar figure shown here is the same
// number that gets billed (reinforces meter trust).
@main
struct WispMenuBarApp: App {
    @StateObject private var model = GlanceModel()

    var body: some Scene {
        MenuBarExtra {
            GlanceView(model: model)
                .frame(width: 280)
        } label: {
            // Compact label: leaf symbol + period net savings. Accessible name
            // set so VoiceOver reads a meaningful value, not just an icon.
            // (Value is the cumulative period figure, not a daily total.)
            Label {
                Text(model.netUSDShort)
            } icon: {
                Image(systemName: model.proxyHealthy ? "leaf.fill" : "leaf")
            }
            .accessibilityLabel("Wisp savings this period: \(model.netUSDShort)")
        }
        .menuBarExtraStyle(.window)
    }
}
