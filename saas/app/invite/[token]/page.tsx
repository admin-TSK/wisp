import { Button } from "@/components/ui/button";
import { acceptInvite } from "@/app/app/members/actions";

export default async function InviteAcceptPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center p-base">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-lg text-center">
        <h1 className="text-title2 text-text-primary">Join workspace</h1>
        <p className="mt-sm text-callout text-text-secondary">
          Accept your invite to access the Wisp dashboard.
        </p>
        {error ? (
          <p role="alert" className="mt-base text-caption text-destructive">
            {error}
          </p>
        ) : null}
        <form action={acceptInvite.bind(null, token)} className="mt-lg">
          <Button type="submit">Accept invite</Button>
        </form>
      </div>
    </div>
  );
}
