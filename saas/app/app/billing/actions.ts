"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantContext } from "@/lib/queries";
import { ensureStripeCustomer, getStripe } from "@/lib/billing/stripe";
import { rollupTenant } from "@/lib/billing/rollup";

export async function enableBilling() {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  if (ctx.role === "viewer") redirect("/app/billing?error=Insufficient%20permissions");

  if (!getStripe()) {
    redirect("/app/billing?error=Stripe%20is%20not%20configured%20yet");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/app/billing?error=Missing%20account%20email");

  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("name").eq("id", ctx.tenantId).single();

  await ensureStripeCustomer(ctx.tenantId, user.email, tenant?.name ?? "Wisp workspace");
  await rollupTenant(ctx.tenantId);

  const { error } = await admin
    .from("billing_config")
    .update({ billing_enabled: true, shadow_until: null })
    .eq("tenant_id", ctx.tenantId);

  if (error) redirect(`/app/billing?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/app/billing");
  redirect("/app/billing?enabled=1");
}
