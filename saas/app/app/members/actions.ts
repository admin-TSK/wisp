"use server";

import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantContext } from "@/lib/queries";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function inviteMember(formData: FormData) {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  if (ctx.role === "viewer") redirect("/app/members?error=Insufficient%20permissions");

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "viewer");
  if (!email || !["admin", "viewer"].includes(role)) {
    redirect("/app/members?error=Enter%20a%20valid%20email%20and%20role");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

  const { error } = await supabase.from("invites").insert({
    tenant_id: ctx.tenantId,
    email,
    role,
    token_hash: hashToken(token),
    invited_by: user.id,
    expires_at: expires,
  });
  if (error) redirect(`/app/members?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/app/members");
  redirect(`/app/members?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`);
}

export async function acceptInvite(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);

  const admin = createAdminClient();
  const tokenHash = hashToken(token);
  const { data: invite } = await admin
    .from("invites")
    .select("*")
    .eq("token_hash", tokenHash)
    .is("accepted_at", null)
    .maybeSingle();

  if (!invite) redirect("/onboarding?error=Invite%20not%20found%20or%20already%20used");
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    redirect("/onboarding?error=Invite%20expired");
  }

  const userEmail = (user.email ?? "").toLowerCase();
  if (userEmail && userEmail !== invite.email.toLowerCase()) {
    redirect(
      `/invite/${token}?error=${encodeURIComponent(`Sign in as ${invite.email} to accept this invite`)}`,
    );
  }

  await admin.from("tenant_members").upsert(
    { tenant_id: invite.tenant_id, user_id: user.id, role: invite.role },
    { onConflict: "tenant_id,user_id" },
  );
  await admin
    .from("invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  redirect("/app");
}
