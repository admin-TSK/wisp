"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantContext } from "@/lib/queries";
import { hashToken, newEnrolSecret } from "@/lib/tokens";

/**
 * Rotate the tenant's enrolment secret: issue a new one, then revoke all prior
 * active secrets. Owner/admin only. The new plaintext is surfaced once via the
 * redirect; only its hash is stored.
 */
export async function rotateEnrolSecret() {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  if (ctx.role === "viewer") redirect("/app/fleet?error=Insufficient%20permissions");

  const admin = createAdminClient();
  const secret = newEnrolSecret();
  const secretHash = hashToken(secret);

  const { error } = await admin
    .from("enrol_secrets")
    .insert({ tenant_id: ctx.tenantId, secret_hash: secretHash, label: "rotated" });
  if (error) redirect(`/app/fleet?error=${encodeURIComponent(error.message)}`);

  // Invalidate every earlier secret so a leaked one can no longer enrol.
  await admin
    .from("enrol_secrets")
    .update({ revoked_at: new Date().toISOString() })
    .eq("tenant_id", ctx.tenantId)
    .neq("secret_hash", secretHash)
    .is("revoked_at", null);

  revalidatePath("/app/fleet");
  redirect(`/app/fleet?enrol_secret=${encodeURIComponent(secret)}`);
}
