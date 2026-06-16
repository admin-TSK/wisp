import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";
import { safeNext } from "@/lib/auth";

export const runtime = "nodejs";

/** Supabase email confirmation callback (magic link / signup confirm). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"), "/");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=Missing%20confirmation%20code", req.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    log("error", "auth.confirm_failed", { error: error.message });
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url),
    );
  }

  log("info", "auth.confirmed", { next });
  return NextResponse.redirect(new URL(next, req.url));
}
