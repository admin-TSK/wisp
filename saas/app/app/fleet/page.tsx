import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getTenantContext, getFleet } from "@/lib/queries";
import { consumeFlash } from "@/lib/tenant-session";
import { rotateEnrolSecret } from "./actions";

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default async function FleetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await getTenantContext();
  const devices = ctx ? await getFleet(ctx.tenantId) : [];
  const { error } = await searchParams;
  const flash = await consumeFlash();
  const enrol_secret = flash?.enrol_secret;
  const canManage = Boolean(ctx && ctx.role !== "viewer");

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-lg flex items-center justify-between">
        <div>
          <h1 className="text-title text-text-primary">Fleet</h1>
          <p className="mt-xs text-callout text-text-secondary">Enrolled devices and their status.</p>
        </div>
        {canManage ? (
          <form action={rotateEnrolSecret}>
            <Button type="submit" variant="secondary">
              Rotate enrol secret
            </Button>
          </form>
        ) : null}
      </header>

      {error ? (
        <p
          role="alert"
          className="mb-base rounded-md border border-destructive/40 bg-destructive/10 px-md py-sm text-caption text-destructive"
        >
          {error}
        </p>
      ) : null}

      {enrol_secret ? (
        <Card className="mb-base border-accent/40">
          <p className="text-caption text-text-secondary">
            New enrolment secret — copy it now, it won&apos;t be shown again.
          </p>
          <p className="mt-xs break-all rounded-md bg-bg-elevated px-md py-sm font-mono text-footnote text-text-primary">
            {enrol_secret}
          </p>
          <p className="mt-xs text-footnote text-text-tertiary">
            Set this as <span className="font-mono">X-Wisp-Enrol-Secret</span> in your Jamf/Intune
            enrolment config. Any previous secret has been revoked.
          </p>
        </Card>
      ) : null}

      {devices.length === 0 ? (
        <EmptyState
          title="No devices enrolled"
          description="Push the Wisp configuration profile from Jamf or Intune to enrol devices automatically."
        />
      ) : (
        <Card className="p-0">
          <table className="w-full text-callout">
            <thead>
              <tr className="border-b border-border text-left text-caption text-text-secondary">
                <th className="px-base py-md font-normal">Device</th>
                <th className="px-base py-md font-normal">Group</th>
                <th className="px-base py-md font-normal">Policy</th>
                <th className="px-base py-md font-normal">Agent</th>
                <th className="px-base py-md font-normal">Last seen</th>
                <th className="px-base py-md font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id} className="border-b border-border/50">
                  <td className="px-base py-md text-text-primary">{d.label}</td>
                  <td className="px-base py-md text-text-secondary">{d.group ?? "—"}</td>
                  <td className="px-base py-md font-mono text-footnote text-text-secondary">
                    {d.policyLevel}
                  </td>
                  <td className="px-base py-md text-text-secondary">{d.agentVersion ?? "—"}</td>
                  <td className="px-base py-md text-text-secondary">{relativeTime(d.lastSeen)}</td>
                  <td className="px-base py-md">
                    <StatusBadge
                      tone={d.healthy ? "success" : "warning"}
                      label={d.healthy ? "Healthy" : "Stale"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
