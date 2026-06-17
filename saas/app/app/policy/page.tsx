import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTenantContext, getTenantPolicy } from "@/lib/queries";
import { savePolicy } from "./actions";

const LEVELS = [
  { level: "off", desc: "Passthrough. No compression, no billing." },
  { level: "conservative", desc: "Compress large payloads only (≥2k tokens)." },
  { level: "balanced", desc: "Compress most payloads (≥500 tokens)." },
  {
    level: "aggressive",
    desc: "Compress tool/assistant output with no token floor (default). User and system messages stay verbatim.",
  },
  {
    level: "hyper",
    desc: "Maximum compression for PAYG/API-key fleets — compress user + system, force kompress. Headroom keeps its subscription-safe guard for Claude Pro/Max OAuth traffic.",
  },
] as const;

export default async function PolicyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const ctx = await getTenantContext();
  const active = ctx ? await getTenantPolicy(ctx.tenantId) : "aggressive";
  const { error, saved } = await searchParams;
  const readOnly = ctx?.role === "viewer";

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-lg">
        <h1 className="text-title text-text-primary">Policy</h1>
        <p className="mt-xs text-callout text-text-secondary">
          Set the tenant default compression level. To apply on devices, update{" "}
          <span className="font-mono">policy_level</span> in the MDM profile or re-run{" "}
          <span className="font-mono">packaging/mdm/enrol_device.sh</span>.
        </p>
      </header>

      {error ? (
        <p
          role="alert"
          className="mb-base rounded-md border border-destructive/40 bg-destructive/10 px-md py-sm text-caption text-destructive"
        >
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="mb-base rounded-md border border-border bg-bg-elevated px-md py-sm text-caption text-text-secondary">
          Policy saved. Devices will pick up the new level on their next check-in.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Tenant default</CardTitle>
        </CardHeader>
        <form action={savePolicy}>
          <fieldset className="flex flex-col gap-sm" disabled={readOnly}>
            <legend className="sr-only">Compression level</legend>
            {LEVELS.map(({ level, desc }) => (
              <label
                key={level}
                className="flex cursor-pointer items-start gap-md rounded-md border border-border p-md hover:bg-bg-elevated"
              >
                <input
                  type="radio"
                  name="policy-level"
                  value={level}
                  defaultChecked={level === active}
                  className="mt-1 accent-[var(--accent)]"
                />
                <span>
                  <span className="block font-mono text-footnote text-text-primary">{level}</span>
                  <span className="block text-caption text-text-secondary">{desc}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="mt-base flex justify-end">
            <Button type="submit" disabled={readOnly}>
              Save Policy
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
