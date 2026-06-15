"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, newEnrolSecret } from "@/lib/tokens";

// Soft cap on workspaces a single user may own, to blunt automated abuse.
const MAX_OWNED_WORKSPACES = 5;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

/** Create a new workspace owned by the current user. Uses the service role
 *  because RLS intentionally blocks direct tenant inserts by authenticated. */
export async function createWorkspace(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/onboarding?error=Enter%20a%20workspace%20name");

  const admin = createAdminClient();

  // Abuse guard: cap how many workspaces one user can own.
  const { count } = await admin
    .from("tenant_members")
    .select("tenant_id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("role", "owner");
  if ((count ?? 0) >= MAX_OWNED_WORKSPACES) {
    redirect("/onboarding?error=Workspace%20limit%20reached");
  }

  const { data: tenant, error } = await admin
    .from("tenants")
    .insert({ name })
    .select("id")
    .single();
  if (error || !tenant) redirect("/onboarding?error=Could%20not%20create%20workspace");

  await admin.from("tenant_members").insert({ tenant_id: tenant.id, user_id: user.id, role: "owner" });
  // Start a 30-day shadow period: meter visible, billing paused.
  const shadowUntil = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  await admin
    .from("billing_config")
    .insert({ tenant_id: tenant.id, take_rate: 0.1, billing_enabled: false, shadow_until: shadowUntil });
  await admin
    .from("policies")
    .insert({ tenant_id: tenant.id, scope: "tenant", level: "aggressive" });

  // Mint the tenant's first enrolment secret. IT puts this in the MDM profile.
  // Plaintext is shown once on the fleet page; only its hash is stored.
  const enrolSecret = newEnrolSecret();
  await admin
    .from("enrol_secrets")
    .insert({ tenant_id: tenant.id, secret_hash: hashToken(enrolSecret), label: "initial" });

  redirect(`/app/fleet?enrol_secret=${encodeURIComponent(enrolSecret)}`);
}

/** Join the seeded demo workspace (if configured) to explore live data fast.
 *  Granted as a read-only viewer so strangers sharing the demo can't edit it. */
export async function joinDemo() {
  const user = await requireUser();
  const demoTenant = process.env.WISP_DEMO_TENANT_ID;
  if (!demoTenant) redirect("/onboarding?error=Demo%20workspace%20not%20configured");

  const admin = createAdminClient();
  await admin
    .from("tenant_members")
    .upsert(
      { tenant_id: demoTenant, user_id: user.id, role: "viewer" },
      { onConflict: "tenant_id,user_id", ignoreDuplicates: true },
    );
  redirect("/app");
}
