import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** Auth-scoped client for dashboard server components (RLS enforced). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.WISP_SUPABASE_URL!,
    process.env.WISP_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component; safe to ignore when
            // middleware refreshes sessions.
          }
        },
      },
    },
  );
}
