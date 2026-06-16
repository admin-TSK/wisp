import Foundation
import Combine

/// Reads the agent's read-only local stats feed (127.0.0.1:8788/glance).
/// Counts only; never talks to the SaaS; never mutates policy.
@MainActor
final class GlanceModel: ObservableObject {
    struct Glance: Decodable {
        let policy_level: String
        let proxy_healthy: Bool
        let total_tokens_removed: Int
        let gross_savings_usd: Double
        let net_savings_usd: Double
    }

    /// Cold-start, loaded, and error are distinct states so the UI never
    /// renders "no data / paused" while the very first fetch is still in
    /// flight (review checklist §14.1: loading and error states must exist).
    enum LoadState {
        case loading
        case loaded
        case failed(String)
    }

    @Published private(set) var glance: Glance?
    @Published private(set) var state: LoadState = .loading

    private var pollTask: Task<Void, Never>?
    private let port: Int
    private let pollInterval: Duration = .seconds(30)

    init(port: Int = 8788) {
        self.port = port
        // Glanceable surface: poll gently in a cancellable loop. A structured
        // Task avoids the run-loop-mode pitfall of Timer during menu tracking
        // and tears down cleanly (see deinit). Respect battery; no tight loop.
        pollTask = Task { [weak self] in
            while !Task.isCancelled {
                await self?.refreshAsync()
                guard let interval = self?.pollInterval else { return }
                try? await Task.sleep(for: interval)
            }
        }
    }

    deinit {
        pollTask?.cancel()
    }

    /// Healthy only counts when we actually have a fresh, successful read.
    /// During loading or after a failure we report not-healthy so the UI
    /// (menu-bar glyph + status row) never shows a stale "active" state.
    var proxyHealthy: Bool {
        if case .loaded = state { return glance?.proxy_healthy ?? false }
        return false
    }

    var policyLevel: String { glance?.policy_level ?? "—" }

    /// Net (billable) savings, compact — shown in the menu-bar label.
    /// NOTE: this is the cumulative period figure the agent reports, not a
    /// daily total (the /glance contract has no date window).
    var netUSDShort: String { format(glance?.net_savings_usd) }

    func grossUSD() -> String { format(glance?.gross_savings_usd) }
    func netUSD() -> String { format(glance?.net_savings_usd) }

    /// Tokens removed, grouped (e.g. "1,240,000"). Reinforces meter trust.
    func tokensRemoved() -> String {
        guard let n = glance?.total_tokens_removed else { return "—" }
        return Self.decimal.string(from: NSNumber(value: n)) ?? "\(n)"
    }

    func refresh() { Task { await refreshAsync() } }

    func refreshAsync() async {
        guard let url = URL(string: "http://127.0.0.1:\(port)/glance") else { return }
        var request = URLRequest(url: url)
        request.timeoutInterval = 5 // localhost; fail fast rather than hang the glance
        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            glance = try JSONDecoder().decode(Glance.self, from: data)
            state = .loaded
        } catch {
            // Recovery-focused and non-alarming: the agent is usually just
            // starting up or restarting. Last-known glance value is retained.
            state = .failed("Can’t reach the Wisp agent — it may be starting up.")
        }
    }

    private func format(_ v: Double?) -> String {
        guard let v else { return "—" }
        return Self.currency.string(from: NSNumber(value: v)) ?? "$0"
    }

    private static let currency: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "USD"
        return f
    }()

    private static let decimal: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.maximumFractionDigits = 0
        return f
    }()
}
