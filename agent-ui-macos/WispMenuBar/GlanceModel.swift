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

    @Published private(set) var glance: Glance?
    @Published private(set) var lastError: String?

    private var timer: Timer?
    private let port: Int

    init(port: Int = 8788) {
        self.port = port
        refresh()
        // Glanceable surface: poll gently. Respect battery; no tight loop.
        timer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            Task { await self?.refreshAsync() }
        }
    }

    var proxyHealthy: Bool { glance?.proxy_healthy ?? false }
    var policyLevel: String { glance?.policy_level ?? "—" }

    var todayUSDShort: String {
        guard let g = glance else { return "—" }
        return Self.currency.string(from: NSNumber(value: g.net_savings_usd)) ?? "$0"
    }

    func grossUSD() -> String { format(glance?.gross_savings_usd) }
    func netUSD() -> String { format(glance?.net_savings_usd) }

    func refresh() { Task { await refreshAsync() } }

    func refreshAsync() async {
        guard let url = URL(string: "http://127.0.0.1:\(port)/glance") else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            glance = try JSONDecoder().decode(Glance.self, from: data)
            lastError = nil
        } catch {
            lastError = "Wisp agent not reachable"
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
}
