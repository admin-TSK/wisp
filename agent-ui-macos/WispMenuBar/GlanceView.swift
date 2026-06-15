import SwiftUI

// Glanceable popover (watchOS-style brevity, guideline 12.4): primary glance is
// today's $ saved + labeled status; one level of detail below. Nothing
// configurable -- IT owns policy.
struct GlanceView: View {
    @ObservedObject var model: GlanceModel

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            header

            if let error = model.lastError {
                statusRow(symbol: "exclamationmark.triangle.fill",
                          tint: .orange,
                          text: error)
            } else {
                // Primary glance: net (billable) savings.
                VStack(alignment: .leading, spacing: 2) {
                    Text("Saved this period")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(model.netUSD())
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .accessibilityLabel("Saved \(model.netUSD()) this period")
                }

                Divider()

                detailRow(label: "Gross", value: model.grossUSD())
                detailRow(label: "Policy", value: model.policyLevel)
                statusRow(symbol: model.proxyHealthy ? "checkmark.circle.fill" : "pause.circle.fill",
                          tint: model.proxyHealthy ? .green : .orange,
                          text: model.proxyHealthy ? "Compression active" : "Paused")
            }

            Divider()
            Text("Managed by your IT team")
                .font(.footnote)
                .foregroundStyle(.tertiary)
        }
        .padding(16)
        .background(.regularMaterial) // respects Reduce Transparency automatically
    }

    private var header: some View {
        HStack(spacing: 8) {
            Image(systemName: "leaf.fill").foregroundStyle(.green)
            Text("Wisp").font(.headline)
            Spacer()
            Button {
                model.refresh()
            } label: {
                Image(systemName: "arrow.clockwise")
            }
            .buttonStyle(.borderless)
            .accessibilityLabel("Refresh savings")
        }
    }

    private func detailRow(label: String, value: String) -> some View {
        HStack {
            Text(label).font(.callout).foregroundStyle(.secondary)
            Spacer()
            Text(value).font(.callout.monospacedDigit())
        }
    }

    // Status never relies on color alone (guideline 3.2): symbol + text + tint.
    private func statusRow(symbol: String, tint: Color, text: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: symbol).foregroundStyle(tint)
            Text(text).font(.callout)
        }
        .accessibilityElement(children: .combine)
    }
}
