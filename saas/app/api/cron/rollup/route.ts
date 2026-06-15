import { NextResponse } from "next/server";
import { rollupAllTenants } from "@/lib/billing/rollup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Scheduled billing rollup. Secured by a shared secret (Vercel Cron sends it in
 * the Authorization header, configured via the WISP_CRON_SECRET env var).
 */
export async function GET(req: Request) {
  const secret = process.env.WISP_CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await rollupAllTenants();
  return NextResponse.json({ ok: true, ...result });
}
