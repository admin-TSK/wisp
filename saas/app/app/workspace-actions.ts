"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setActiveTenant } from "@/lib/tenant-session";

export async function switchWorkspace(formData: FormData) {
  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  if (!tenantId) redirect("/app");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!membership) redirect("/app?error=Invalid%20workspace");

  await setActiveTenant(tenantId);
  revalidatePath("/app");
  redirect("/app");
}
