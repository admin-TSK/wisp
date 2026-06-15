import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { getTenantContext } from "@/lib/queries";
import { createWorkspace, joinDemo } from "./actions";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Already onboarded? Go to the dashboard.
  const ctx = await getTenantContext();
  if (ctx) redirect("/app");

  const { error } = await searchParams;
  const demoEnabled = Boolean(process.env.WISP_DEMO_TENANT_ID);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-base">
      <div className="mb-lg">
        <Logo href="/app" size="md" />
      </div>
      <h1 className="mb-xs text-title font-bold tracking-tight">Welcome to Wisp</h1>
      <p className="mb-lg text-callout text-text-secondary">
        Create a workspace for your fleet, or explore live sample data.
      </p>

      {error ? (
        <p role="alert" className="mb-base rounded-md border border-destructive/40 bg-destructive/10 px-md py-sm text-caption text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Create a workspace</CardTitle>
        </CardHeader>
        <form className="flex flex-col gap-md">
          <label className="flex flex-col gap-xs">
            <span className="text-caption text-text-secondary">Workspace name</span>
            <input
              name="name"
              required
              placeholder="Acme Engineering"
              className="rounded-md border border-border bg-bg px-md py-sm text-body text-text-primary"
            />
          </label>
          <div className="flex justify-end">
            <Button formAction={createWorkspace}>Create Workspace</Button>
          </div>
        </form>
      </Card>

      {demoEnabled ? (
        <form action={joinDemo} className="mt-base">
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-headline text-text-primary">Explore the demo workspace</p>
              <p className="text-caption text-text-secondary">
                Live, seeded fleet + savings data — no setup.
              </p>
            </div>
            <Button variant="secondary" type="submit">
              Join Demo
            </Button>
          </Card>
        </form>
      ) : null}
    </div>
  );
}
