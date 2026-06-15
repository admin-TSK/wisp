import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Service-role client for ingest paths (telemetry, enrol). Bypasses RLS, so
 * tenant_id is ALWAYS resolved server-side from the enrolment token and never
 * trusted from the request body.
 *
 * Never import this into a browser/client component.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.WISP_SUPABASE_URL!,
    process.env.WISP_SUPABASE_SERVICE_ROLE!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
