import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTenantContext, getMembers, getPendingInvites } from "@/lib/queries";
import { consumeFlash } from "@/lib/tenant-session";
import { siteUrl } from "@/lib/site";
import { inviteMember } from "./actions";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await getTenantContext();
  const members = ctx ? await getMembers(ctx.tenantId) : [];
  const pending = ctx ? await getPendingInvites(ctx.tenantId) : [];
  const { error } = await searchParams;
  const flash = await consumeFlash();
  const invite = flash?.invite_token;
  const email = flash?.invite_email;
  const canInvite = ctx && ctx.role !== "viewer";

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-lg">
        <h1 className="text-title text-text-primary">Members</h1>
        <p className="mt-xs text-callout text-text-secondary">
          Manage who can access this workspace and invite teammates.
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

      {invite && email ? (
        <Card className="mb-lg">
          <CardHeader>
            <CardTitle>Invite link</CardTitle>
          </CardHeader>
          <p className="text-callout text-text-secondary">
            Share this link with <strong>{email}</strong> (expires in 7 days):
          </p>
          <code className="mt-sm block break-all rounded-md bg-bg-elevated p-sm text-footnote">
            {`${siteUrl()}/invite/${invite}`}
          </code>
        </Card>
      ) : null}

      <Card className="mb-lg">
        <CardHeader>
          <CardTitle>Team</CardTitle>
        </CardHeader>
        <table className="w-full text-callout">
          <thead>
            <tr className="border-b border-border text-left text-caption text-text-secondary">
              <th className="py-sm font-normal">User</th>
              <th className="py-sm font-normal">Role</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId} className="border-b border-border/50">
                <td className="py-sm text-text-primary">{m.email ?? m.userId.slice(0, 8)}</td>
                <td className="py-sm font-mono text-footnote text-text-secondary">{m.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {canInvite ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite by email</CardTitle>
          </CardHeader>
          <form action={inviteMember} className="flex flex-col gap-md sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-xs">
              <span className="text-caption text-text-secondary">Email</span>
              <input
                type="email"
                name="email"
                required
                className="rounded-md border border-border bg-bg px-md py-sm text-body"
              />
            </label>
            <label className="flex flex-col gap-xs">
              <span className="text-caption text-text-secondary">Role</span>
              <select
                name="role"
                className="rounded-md border border-border bg-bg px-md py-sm text-body"
                defaultValue="viewer"
              >
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>
            <Button type="submit">Send Invite</Button>
          </form>
          {pending.length ? (
            <ul className="mt-base text-caption text-text-tertiary">
              {pending.map((p) => (
                <li key={p.id}>
                  Pending: {p.email} ({p.role})
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
