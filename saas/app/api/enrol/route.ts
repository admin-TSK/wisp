import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, newEnrolmentToken } from "@/lib/tokens";

export const runtime = "nodejs";

const enrolSchema = z
  .object({
    enrolment_label: z.string().max(120).optional(),
    group_name: z.string().max(120).optional(),
  })
  .strict();

/**
 * Register a device and mint an opaque enrolment token. Driven by MDM, authorized
 * by a PER-TENANT enrol secret (X-Wisp-Enrol-Secret). The tenant is resolved from
 * the secret's hash — never trusted from the request body — so a secret can only
 * enrol devices into its own tenant. The plaintext token is returned exactly
 * once; only its hash is stored.
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-wisp-enrol-secret") ?? "";
  if (!secret) {
    return NextResponse.json({ error: "Enrolment not authorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Resolve the tenant from the secret hash (constant-work index lookup). A
  // revoked or unknown secret is unauthorized.
  const { data: secretRow } = await supabase
    .from("enrol_secrets")
    .select("tenant_id, revoked_at")
    .eq("secret_hash", hashToken(secret))
    .maybeSingle();

  if (!secretRow || secretRow.revoked_at) {
    return NextResponse.json({ error: "Enrolment not authorized" }, { status: 401 });
  }

  const parsed = enrolSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid enrol request" }, { status: 400 });
  }

  const tenant_id = secretRow.tenant_id;
  const { enrolment_label, group_name } = parsed.data;

  const { data: device, error: devErr } = await supabase
    .from("devices")
    .insert({ tenant_id, enrolment_label, group_name })
    .select("id")
    .single();

  if (devErr || !device) {
    return NextResponse.json({ error: "Could not enrol device" }, { status: 500 });
  }

  const token = newEnrolmentToken();
  const { error: tokErr } = await supabase.from("enrolment_tokens").insert({
    token_hash: hashToken(token),
    tenant_id,
    device_id: device.id,
  });

  if (tokErr) {
    await supabase.from("devices").delete().eq("id", device.id);
    return NextResponse.json({ error: "Could not issue token" }, { status: 500 });
  }

  // Token shown once. The agent stores it; the server keeps only the hash.
  return NextResponse.json({ device_id: device.id, enrolment_token: token });
}
