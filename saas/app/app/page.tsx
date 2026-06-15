import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getTenantContext, getSavings } from "@/lib/queries";
import { compactTokens, usd } from "@/lib/utils";

// Savings is THE headline (guideline 2.1: one primary task). Lead with the
// feel-good gross dollar figure; show the billable number beside it. Billable is
// net-of-cache, but until providers report per-request cache-read counts it
// equals gross — we say so rather than imply a discount we can't yet measure.
export default async function SavingsPage() {
  const ctx = await getTenantContext();
  const { byModel, totals } = ctx ? await getSavings(ctx.tenantId) : { byModel: [], totals: null };
  const billableEqualsGross = totals
    ? Math.abs(totals.grossSavings - totals.measuredSavings) < 1e-9
    : false;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-lg">
        <h1 className="text-title text-text-primary">Savings</h1>
        <p className="mt-xs text-callout text-text-secondary">
          Token reduction across your fleet, this month.
        </p>
      </header>

      {!totals ? (
        <EmptyState
          title="No usage yet"
          description="Enrol a device with the Wisp profile, or join the demo workspace to see live savings."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-base sm:grid-cols-3">
            <Card>
              <p className="text-caption text-text-secondary">Saved (gross)</p>
              <p className="mt-xs text-large-title text-text-primary">{usd(totals.grossSavings)}</p>
              <p className="mt-xs text-footnote text-text-tertiary">at full base rate</p>
            </Card>
            <Card>
              <p className="text-caption text-text-secondary">Billable</p>
              <p className="mt-xs text-large-title text-text-primary">{usd(totals.measuredSavings)}</p>
              <p className="mt-xs text-footnote text-text-tertiary">
                {billableEqualsGross
                  ? "what your fee is based on — equals gross until cache reads are reported"
                  : "net of cache — what your fee is based on"}
              </p>
            </Card>
            <Card>
              <p className="text-caption text-text-secondary">Your Wisp fee (10%)</p>
              <p className="mt-xs text-large-title text-accent">{usd(totals.wispFee)}</p>
              <p className="mt-xs text-footnote text-text-tertiary">
                you keep {usd(totals.measuredSavings - totals.wispFee)}
              </p>
            </Card>
          </div>

          <Card className="mt-lg">
            <CardHeader>
              <CardTitle>By model</CardTitle>
              <span className="text-caption text-text-tertiary">
                {compactTokens(totals.totalTokensRemoved)} tokens removed
              </span>
            </CardHeader>
            <table className="w-full text-callout">
              <thead>
                <tr className="border-b border-border text-left text-caption text-text-secondary">
                  <th className="py-sm font-normal">Model</th>
                  <th className="py-sm text-right font-normal">Tokens removed</th>
                  <th className="py-sm text-right font-normal">Gross</th>
                  <th className="py-sm text-right font-normal">Billable</th>
                </tr>
              </thead>
              <tbody>
                {byModel.map((m) => (
                  <tr key={m.model} className="border-b border-border/50">
                    <td className="py-sm font-mono text-footnote text-text-primary">{m.model}</td>
                    <td className="py-sm text-right tabular-nums text-text-secondary">
                      {compactTokens(m.tokensRemoved)}
                    </td>
                    <td className="py-sm text-right tabular-nums text-text-secondary">{usd(m.gross)}</td>
                    <td className="py-sm text-right tabular-nums text-text-primary">{usd(m.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
