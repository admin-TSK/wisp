import SwiftUI

// Glanceable popover (watchOS-style brevity, guideline 12.4): primary glance is
// the period $ saved + labeled status; one level of detail below. Nothing
// configurable -- IT owns policy.
struct GlanceView: View {
    @ObservedObject var model: GlanceModel

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            header

            switch model.state {
            case .loading:
                loadingRow
            case .failed(let message):
                statusRow(symbol: "exclamationmark.triangle.fill",
                          tint: .orange,
                          text: message)
            case .loaded:
                savings
            }

            Divider()

            // AI transparency (review checklist §AI-specific; guideline §11):
            // disclose what Wisp does and that originals are recoverable.
            // Deliberately avoids any "identical / guaranteed" claim.
            Text("Compresses context to cut tokens. Originals are recoverable via Headroom CCR.")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            Text("Managed by your IT team")
                .font(.footnote)
                .foregroundStyle(.tertiary)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial) // respects Reduce Transparency automatically
    }

    // Primary glance + one level of detail.
    private var savings: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Saved this period")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                // Semantic largeTitle role => scales with Dynamic Type
                // (tokens.json rule; checklist §14.4). Rounded for the meter.
                Text(model.netUSD())
                    .font(.system(.largeTitle, design: .rounded).weight(.bold))
            }
            // One combined VoiceOver phrase instead of caption + value twice.
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Saved \(model.netUSD()) this period")

            Divider()

            detailRow(label: "Gross", value: model.grossUSD())
            detailRow(label: "Tokens saved", value: model.tokensRemoved())
            detailRow(label: "Policy", value: model.policyLevel)
            statusRow(symbol: model.proxyHealthy ? "checkmark.circle.fill" : "pause.circle.fill",
                      tint: model.proxyHealthy ? .green : .orange,
                      text: model.proxyHealthy ? "Compression active" : "Compression inactive")
        }
    }

    private var loadingRow: some View {
        HStack(spacing: 8) {
            ProgressView().controlSize(.small)
            Text("Checking savings…")
                .font(.callout)
                .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
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
            .help("Refresh savings")
            .accessibilityLabel("Refresh savings")
        }
    }

    private func detailRow(label: String, value: String) -> some View {
        HStack {
            Text(label).font(.callout).foregroundStyle(.secondary)
            Spacer()
            Text(value).font(.callout.monospacedDigit())
        }
        .accessibilityElement(children: .combine)
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
