import * as React from "react";

// Empty states explain what belongs here + a useful next action (guideline 6.3).
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-lg py-xl text-center">
      <p className="text-headline text-text-primary">{title}</p>
      <p className="mt-sm max-w-md text-callout text-text-secondary">{description}</p>
      {action ? <div className="mt-base">{action}</div> : null}
    </div>
  );
}
