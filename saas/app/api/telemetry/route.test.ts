import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({ log: vi.fn() }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tokenRow: any = { tenant_id: "TEN", device_id: "DEV", revoked_at: null };
const upsertSpy = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "enrolment_tokens") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: tokenRow }) }) }) };
      }
      if (table === "usage_events") {
        return { upsert: upsertSpy };
      }
      if (table === "devices") {
        return { update: () => ({ eq: () => ({ eq: async () => ({}) }) }) };
      }
      return {};
    },
  }),
}));

const DEVICE_UUID = "00000000-0000-4000-8000-0000000000aa";
const BATCH_UUID = "00000000-0000-4000-8000-0000000000b1";

function validBatch(extraEvent: Record<string, unknown> = {}) {
  return {
    tenant_id: "EVIL-from-body", // must be ignored server-side
    device_id: DEVICE_UUID,
    batch_id: BATCH_UUID,
    agent_version: "0.1.0",
    headroom_version: "0.25.0",
    window_start: "2026-06-15T09:00:00Z",
    window_end: "2026-06-15T09:05:00Z",
    events: [
      {
        model: "claude-sonnet-4-6",
        requests: 1,
        input_tokens_original: 100,
        input_tokens_compressed: 40,
        input_tokens_removed: 60,
        input_tokens_cache_read: 0,
        output_tokens: 5,
        policy_level: "aggressive",
        ...extraEvent,
      },
    ],
  };
}

function makeReq(body: unknown, headers: Record<string, string> = { authorization: "Bearer tkn" }) {
  return new Request("http://x/api/telemetry", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  tokenRow = { tenant_id: "TEN", device_id: "DEV", revoked_at: null };
  upsertSpy.mockResolvedValue({ error: null });
});

describe("POST /api/telemetry", () => {
  it("401 without a bearer token", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeReq(validBatch(), {}));
    expect(res.status).toBe(401);
  });

  it("401 for a revoked token", async () => {
    tokenRow = { tenant_id: "TEN", device_id: "DEV", revoked_at: "2026-01-01T00:00:00Z" };
    const { POST } = await import("./route");
    const res = await POST(makeReq(validBatch()));
    expect(res.status).toBe(401);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("422 when an event carries a forbidden/unexpected field (PII contract)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeReq(validBatch({ prompt: "secret source" })));
    expect(res.status).toBe(422);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it("ingests with tenant from the TOKEN (never the body) and dedupes by (batch_id, model)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeReq(validBatch()));
    expect(res.status).toBe(200);
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    const [rows, opts] = upsertSpy.mock.calls[0];
    expect(rows.every((r: { tenant_id: string }) => r.tenant_id === "TEN")).toBe(true);
    expect(rows.every((r: { device_id: string }) => r.device_id === "DEV")).toBe(true);
    expect(opts).toMatchObject({ onConflict: "batch_id,model", ignoreDuplicates: true });
  });
});
