"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/queries";

const LEVELS = ["off", "conservative", "balanced", "aggressive", "hyper"] as const;

export async function savePolicy(formData: FormData) {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  if (ctx.role === "viewer") {
    redirect("/app/policy?error=Viewers%20cannot%20change%20policy");
  }

  const level = String(formData.get("policy-level") ?? "");
  if (!LEVELS.includes(level as (typeof LEVELS)[number])) {
    redirect("/app/policy?error=Invalid%20policy%20level");
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("policies")
    .select("id")
    .eq("tenant_id", ctx.tenantId)
    .eq("scope", "tenant")
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("policies")
      .update({ level, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) redirect(`/app/policy?error=${encodeURIComponent(error.message)}`);
  } else {
    const { error } = await supabase.from("policies").insert({
      tenant_id: ctx.tenantId,
      scope: "tenant",
      level,
    });
    if (error) redirect(`/app/policy?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app/policy");
  revalidatePath("/app/fleet");
  redirect("/app/policy?saved=1");
}
