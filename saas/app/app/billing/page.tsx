import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getTenantContext, getBillingOverview } from "@/lib/queries";
import { usd } from "@/lib/utils";
import { enableBilling } from "./actions";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; enabled?: string }>;
}) {
  const ctx = await getTenantContext();
  const b = ctx
    ? await getBillingOverview(ctx.tenantId)
    : { measuredSavings: 0, wispFee: 0, inShadow: true, billingEnabled: false, takeRate: 0.1 };

  const { error, enabled } = await searchParams;
  const paused = b.inShadow || !b.billingEnabled;
  const canEnable = ctx && ctx.role !== "viewer";

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-lg flex items-center justify-between">
        <div>
          <h1 className="text-title text-text-primary">Billing</h1>
          <p className="mt-xs text-callout text-text-secondary">
            Billed on measured savings, net of provider cache discounts, capped.
          </p>
        </div>
        <StatusBadge
          tone={paused ? "neutral" : "success"}
          label={paused ? "Shadow period — billing paused" : "Billing active"}
        />
      </header>

      {error ? (
        <p role="alert" className="mb-base rounded-md border border-destructive/40 bg-destructive/10 px-md py-sm text-caption text-destructive">
          {error}
        </p>
      ) : null}
      {enabled ? (
        <p className="mb-base rounded-md border border-border bg-bg-elevated px-md py-sm text-caption text-text-secondary">
          Billing enabled. Metered usage will be reported on the next rollup.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Current period</CardTitle>
        </CardHeader>
        <dl className="grid grid-cols-2 gap-base">
          <div>
            <dt className="text-caption text-text-secondary">Billable savings</dt>
            <dd className="text-title2 text-text-primary">{usd(b.measuredSavings)}</dd>
          </div>
          <div>
            <dt className="text-caption text-text-secondary">
              Wisp fee ({Math.round(b.takeRate * 100)}%, capped)
            </dt>
            <dd className="text-title2 text-accent">{usd(b.wispFee)}</dd>
          </div>
        </dl>
        <p className="mt-base text-footnote text-text-tertiary">
          During the shadow period the meter is visible but no invoice is issued. The net-of-cache
          blend and monthly cap are agreed and frozen before billing begins. Billable is net of
          provider cache discounts; it currently equals gross until providers report per-request
          cache-read counts.
        </p>
        <div className="mt-base flex justify-end gap-sm">
          <a
            href="/api/billing/reconciliation"
            className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-base py-sm text-callout font-medium text-text-primary hover:bg-bg-elevated"
          >
            Export Reconciliation
          </a>
          <form action={enableBilling}>
            <Button type="submit" disabled={!canEnable || b.billingEnabled}>
              {b.billingEnabled ? "Billing enabled" : "Enable Billing"}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
