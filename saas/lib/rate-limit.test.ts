import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({ log: vi.fn() }));

const ipLimit = vi.fn();
const secretLimit = vi.fn();
const tokenLimit = vi.fn();

vi.mock("@upstash/ratelimit", () => {
  const MockRatelimit = vi.fn(function (this: unknown, opts: { prefix?: string }) {
    const prefix = opts.prefix ?? "";
    if (prefix.includes("enrol:ip")) return { limit: ipLimit };
    if (prefix.includes("enrol:secret")) return { limit: secretLimit };
    if (prefix.includes("telemetry:ip")) return { limit: ipLimit };
    if (prefix.includes("telemetry:token")) return { limit: tokenLimit };
    return { limit: vi.fn() };
  }) as ReturnType<typeof vi.fn> & { slidingWindow: ReturnType<typeof vi.fn> };
  MockRatelimit.slidingWindow = vi.fn();
  return { Ratelimit: MockRatelimit };
});

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(),
}));

function ok() {
  return { success: true, reset: Date.now() + 60_000 };
}
function blocked(retrySec = 30) {
  return { success: false, reset: Date.now() + retrySec * 1000 };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  ipLimit.mockResolvedValue(ok());
  secretLimit.mockResolvedValue(ok());
  tokenLimit.mockResolvedValue(ok());
});

describe("clientIp", () => {
  it("uses the first x-forwarded-for hop", async () => {
    const { clientIp } = await import("./rate-limit");
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(clientIp(req)).toBe("1.2.3.4");
  });
});

describe("checkEnrolRateLimit", () => {
  it("passes when Upstash is not configured outside production", async () => {
    vi.stubEnv("VERCEL_ENV", "development");
    vi.resetModules();
    const { checkEnrolRateLimit } = await import("./rate-limit");
    const req = new Request("http://x");
    const result = await checkEnrolRateLimit(req, "abc123");
    expect(result).toEqual({ limited: false });
  });

  it("returns misconfigured in production without Upstash env", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const { checkEnrolRateLimit } = await import("./rate-limit");
    const req = new Request("http://x");
    const result = await checkEnrolRateLimit(req, "abc123");
    expect(result).toEqual({ misconfigured: true });
  });

  it("blocks when IP limit is exceeded", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://example.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "token");
    ipLimit.mockResolvedValue(blocked(45));
    vi.resetModules();
    const { checkEnrolRateLimit } = await import("./rate-limit");
    const req = new Request("http://x", { headers: { "x-real-ip": "9.9.9.9" } });
    const result = await checkEnrolRateLimit(req, "deadbeef".repeat(8));
    expect(result).toMatchObject({ limited: true, retryAfterSeconds: expect.any(Number) });
  });
});

describe("checkTelemetryRateLimit", () => {
  it("blocks when token limit is exceeded", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://example.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "token");
    tokenLimit.mockResolvedValue(blocked(120));
    vi.resetModules();
    const { checkTelemetryRateLimit } = await import("./rate-limit");
    const req = new Request("http://x");
    const result = await checkTelemetryRateLimit(req, "cafebabe".repeat(8));
    expect(result).toMatchObject({ limited: true, retryAfterSeconds: expect.any(Number) });
  });
});

describe("rateLimitResponse", () => {
  it("returns 429 with Retry-After", async () => {
    const { rateLimitResponse } = await import("./rate-limit");
    const res = rateLimitResponse({ limited: true, retryAfterSeconds: 42 });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
  });
});
