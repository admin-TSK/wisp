import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(v: string | number): string {
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Stream per-window usage_events as CSV for FinOps reconciliation. */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const month = url.searchParams.get("month"); // YYYY-MM optional
  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid month; use YYYY-MM" }, { status: 400 });
  }
  const now = new Date();
  const [y, m] = month
    ? month.split("-").map(Number)
    : [now.getUTCFullYear(), now.getUTCMonth() + 1];
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const end = new Date(Date.UTC(y, m, 1)).toISOString();

  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from("usage_events")
    .select(
      "device_id, model, window_start, window_end, requests, input_tokens_original, input_tokens_compressed, input_tokens_removed, input_tokens_cache_read, output_tokens, policy_level",
    )
    .eq("tenant_id", ctx.tenantId)
    .gte("window_start", start)
    .lt("window_start", end)
    .order("window_start", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = [
    "device_id",
    "model",
    "window_start",
    "window_end",
    "requests",
    "input_tokens_original",
    "input_tokens_compressed",
    "input_tokens_removed",
    "input_tokens_cache_read",
    "output_tokens",
    "policy_level",
  ].join(",");

  const lines = (events ?? []).map((e) =>
    [
      e.device_id,
      e.model,
      e.window_start,
      e.window_end,
      e.requests,
      e.input_tokens_original,
      e.input_tokens_compressed,
      e.input_tokens_removed,
      e.input_tokens_cache_read,
      e.output_tokens,
      e.policy_level,
    ]
      .map(csvEscape)
      .join(","),
  );

  const body = [header, ...lines].join("\n");
  const filename = `wisp-reconciliation-${y}-${String(m).padStart(2, "0")}.csv`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
