import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashToken } from "@/lib/tokens";

const checkEnrolRateLimit = vi.fn().mockResolvedValue({ limited: false });

vi.mock("@/lib/rate-limit", () => ({
  checkEnrolRateLimit: (...args: unknown[]) => checkEnrolRateLimit(...args),
  rateLimitResponse: (r: { retryAfterSeconds: number }) =>
    new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { "Retry-After": String(r.retryAfterSeconds) },
    }),
  rateLimitMisconfiguredResponse: () =>
    new Response(JSON.stringify({ error: "Rate limiting unavailable" }), { status: 503 }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let secretRow: any = { tenant_id: "TEN-from-secret", revoked_at: null };
const deviceInsertSpy = vi.fn(() => ({
  select: () => ({ single: async () => ({ data: { id: "DEV1" }, error: null }) }),
}));
const tokenInsertSpy = vi.fn(async () => ({ error: null }));
const secretEqSpy = vi.fn(() => ({ maybeSingle: async () => ({ data: secretRow }) }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "enrol_secrets") {
        return { select: () => ({ eq: secretEqSpy }) };
      }
      if (table === "devices") {
        return { insert: deviceInsertSpy };
      }
      if (table === "enrolment_tokens") {
        return { insert: tokenInsertSpy };
      }
      return {};
    },
  }),
}));

function makeReq(body: unknown, headers: Record<string, string> = { "x-wisp-enrol-secret": "plain-secret" }) {
  return new Request("http://x/api/enrol", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  secretRow = { tenant_id: "TEN-from-secret", revoked_at: null };
  checkEnrolRateLimit.mockResolvedValue({ limited: false });
});

describe("POST /api/enrol", () => {
  it("401 without the enrol secret header", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeReq({ enrolment_label: "Mac" }, {}));
    expect(res.status).toBe(401);
  });

  it("401 for an unknown secret", async () => {
    secretRow = null;
    const { POST } = await import("./route");
    const res = await POST(makeReq({ enrolment_label: "Mac" }));
    expect(res.status).toBe(401);
  });

  it("401 for a revoked secret", async () => {
    secretRow = { tenant_id: "TEN-from-secret", revoked_at: "2026-01-01T00:00:00Z" };
    const { POST } = await import("./route");
    const res = await POST(makeReq({ enrolment_label: "Mac" }));
    expect(res.status).toBe(401);
  });

  it("rejects a body that tries to supply tenant_id (strict schema)", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeReq({ tenant_id: "EVIL", enrolment_label: "Mac" }));
    expect(res.status).toBe(400);
    expect(deviceInsertSpy).not.toHaveBeenCalled();
  });

  it("looks the secret up by hash and enrols into the secret's tenant", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeReq({ enrolment_label: "Mac", group_name: "Platform" }));
    expect(res.status).toBe(200);
    // Resolved by hash of the presented secret, not the plaintext.
    expect(secretEqSpy).toHaveBeenCalledWith("secret_hash", hashToken("plain-secret"));
    // Device created under the secret's tenant.
    expect(deviceInsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: "TEN-from-secret", enrolment_label: "Mac" }),
    );
    const json = await res.json();
    expect(json.device_id).toBe("DEV1");
    expect(typeof json.enrolment_token).toBe("string");
  });

  it("429 when rate limited", async () => {
    checkEnrolRateLimit.mockResolvedValueOnce({ limited: true, retryAfterSeconds: 30 });
    const { POST } = await import("./route");
    const res = await POST(makeReq({ enrolment_label: "Mac" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    expect(deviceInsertSpy).not.toHaveBeenCalled();
  });
});
