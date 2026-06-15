import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { compactTokens, usd } from "@/lib/utils";

/** Product UI preview for the marketing hero — mirrors the real Savings dashboard. */
export function HeroDashboard() {
  const rows = [
    { model: "claude-sonnet-4-6", removed: 1_312_710, gross: 157.52, net: 118.14 },
    { model: "gpt-5.2-codex", removed: 233_000, gross: 23.3, net: 18.2 },
    { model: "claude-opus-4-8", removed: 51_000, gross: 8.06, net: 4.59 },
  ];

  return (
    <div className="relative">
      {/* Glow behind the mockup */}
      <div
        className="pointer-events-none absolute -inset-8 rounded-3xl bg-accent/20 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative overflow-hidden rounded-xl border border-border/80 bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/5">
        {/* Window chrome */}
        <div className="flex items-center gap-sm border-b border-border bg-bg-elevated/80 px-md py-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="ml-sm flex-1 text-caption text-text-tertiary">Acme Engineering · Savings</span>
          <span className="hidden sm:block">
            <StatusBadge tone="success" label="3 devices live" />
          </span>
        </div>

        <div className="p-md lg:p-base">
          <div className="grid grid-cols-3 gap-sm">
            <Card className="!p-md">
              <p className="text-footnote text-text-tertiary">Saved (gross)</p>
              <p className="mt-xs text-title2 font-bold tabular-nums text-text-primary">{usd(188.88)}</p>
            </Card>
            <Card className="!p-md ring-1 ring-accent/30">
              <p className="text-footnote text-text-tertiary">Billable (net)</p>
              <p className="mt-xs text-title2 font-bold tabular-nums text-text-primary">{usd(140.93)}</p>
            </Card>
            <Card className="!p-md">
              <p className="text-footnote text-text-tertiary">Wisp fee (10%)</p>
              <p className="mt-xs text-title2 font-bold tabular-nums text-accent">{usd(14.09)}</p>
            </Card>
          </div>

          <Card className="mt-sm !p-0">
            <CardHeader className="border-b border-border px-md py-sm">
              <CardTitle className="!text-callout">By model</CardTitle>
              <span className="text-footnote text-text-tertiary">
                {compactTokens(1_596_710)} removed
              </span>
            </CardHeader>
            <table className="w-full text-footnote">
              <thead>
                <tr className="border-b border-border text-left text-text-tertiary">
                  <th className="px-md py-xs font-normal">Model</th>
                  <th className="px-md py-xs text-right font-normal">Net</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.model} className="border-b border-border/40 last:border-0">
                    <td className="px-md py-xs font-mono text-text-secondary">{r.model}</td>
                    <td className="px-md py-xs text-right tabular-nums text-text-primary">
                      {usd(r.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  );
}
