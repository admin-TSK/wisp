import { StatusBadge } from "@/components/ui/status-badge";
import { usd } from "@/lib/utils";

/** Product UI preview for the marketing page — mirrors the real Fleet view. */
const devices = [
  { label: "MacBook Pro — eng-1", group: "Platform", policy: "aggressive", saved: 612.4, healthy: true },
  { label: "MacBook Pro — eng-2", group: "Platform", policy: "aggressive", saved: 548.1, healthy: true },
  { label: "Mac mini — ci-runner", group: "CI", policy: "aggressive", saved: 1240.0, healthy: true },
  { label: "MacBook Air — design", group: "Design", policy: "balanced", saved: 96.3, healthy: false },
] as const;

export function FleetPreview() {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl bg-accent/10 blur-3xl sm:-inset-8"
        aria-hidden="true"
      />
      <div className="relative overflow-hidden rounded-xl border border-border/80 bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/5">
        {/* Window chrome */}
        <div className="flex items-center gap-sm border-b border-border bg-bg-elevated/80 px-md py-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="ml-sm flex-1 text-caption text-text-tertiary">
            Acme Engineering · Fleet
          </span>
          <span className="hidden sm:block">
            <StatusBadge tone="success" label="4 devices live" />
          </span>
        </div>

        <table className="w-full text-footnote">
          <thead>
            <tr className="border-b border-border text-left text-text-tertiary">
              <th className="px-md py-sm font-normal">Device</th>
              <th className="hidden px-md py-sm font-normal sm:table-cell">Group</th>
              <th className="px-md py-sm font-normal">Policy</th>
              <th className="px-md py-sm text-right font-normal">Saved</th>
              <th className="px-md py-sm text-right font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.label} className="border-b border-border/40 last:border-0">
                <td className="px-md py-sm text-text-primary">{d.label}</td>
                <td className="hidden px-md py-sm text-text-secondary sm:table-cell">{d.group}</td>
                <td className="px-md py-sm">
                  <span className="rounded-pill border border-border bg-bg-elevated px-sm py-0.5 font-mono text-text-secondary">
                    {d.policy}
                  </span>
                </td>
                <td className="px-md py-sm text-right tabular-nums text-text-primary">{usd(d.saved)}</td>
                <td className="px-md py-sm">
                  <span className="flex justify-end">
                    <StatusBadge
                      tone={d.healthy ? "success" : "warning"}
                      label={d.healthy ? "Healthy" : "Stale"}
                    />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
