"use client";

import { switchWorkspace } from "@/app/app/workspace-actions";
import type { WorkspaceOption } from "@/lib/queries";

export function WorkspaceSwitcher({
  workspaces,
  activeTenantId,
}: {
  workspaces: WorkspaceOption[];
  activeTenantId?: string;
}) {
  if (workspaces.length <= 1) return null;

  return (
    <form action={switchWorkspace} className="mb-base px-sm">
      <label htmlFor="workspace-select" className="sr-only">
        Active workspace
      </label>
      <select
        id="workspace-select"
        name="tenant_id"
        defaultValue={activeTenantId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="w-full rounded-md border border-border bg-bg-elevated px-sm py-xs text-footnote text-text-primary"
      >
        {workspaces.map((w) => (
          <option key={w.tenantId} value={w.tenantId}>
            {w.name} ({w.role})
          </option>
        ))}
      </select>
    </form>
  );
}
