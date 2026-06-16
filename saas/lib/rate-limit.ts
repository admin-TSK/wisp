import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { log } from "@/lib/logger";

export type RateLimitResult =
  | { limited: false }
  | { limited: true; retryAfterSeconds: number }
  | { misconfigured: true };

function upstashConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function redis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

/** First client IP from Vercel/proxy headers. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

async function checkDualLimit(
  checks: { limit: () => Promise<{ success: boolean; reset: number }> }[],
): Promise<RateLimitResult> {
  let maxRetry = 0;
  for (const check of checks) {
    const { success, reset } = await check.limit();
    if (!success) {
      const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      maxRetry = Math.max(maxRetry, retryAfterSeconds);
    }
  }
  if (maxRetry > 0) return { limited: true, retryAfterSeconds: maxRetry };
  return { limited: false };
}

function misconfiguredResult(): RateLimitResult {
  log("error", "rate_limit.misconfigured", { env: process.env.VERCEL_ENV ?? "unknown" });
  return { misconfigured: true };
}

/** Enrol: 10/min per IP and per secret hash prefix. */
export async function checkEnrolRateLimit(req: Request, secretHash: string): Promise<RateLimitResult> {
  if (!upstashConfigured()) {
    if (process.env.VERCEL_ENV === "production") return misconfiguredResult();
    return { limited: false };
  }

  const r = redis()!;
  const ip = clientIp(req);
  const secretKey = secretHash.slice(0, 16);

  const ipLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "wisp:enrol:ip",
  });
  const secretLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "wisp:enrol:secret",
  });

  return checkDualLimit([
    { limit: () => ipLimiter.limit(ip) },
    { limit: () => secretLimiter.limit(secretKey) },
  ]);
}

/** Telemetry: 12/5min per token hash + 60/min per IP (flush every 300s + retries). */
export async function checkTelemetryRateLimit(req: Request, tokenHash: string): Promise<RateLimitResult> {
  if (!upstashConfigured()) {
    if (process.env.VERCEL_ENV === "production") return misconfiguredResult();
    return { limited: false };
  }

  const r = redis()!;
  const ip = clientIp(req);
  const tokenKey = tokenHash.slice(0, 16);

  const ipLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    prefix: "wisp:telemetry:ip",
  });
  const tokenLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(12, "5 m"),
    prefix: "wisp:telemetry:token",
  });

  return checkDualLimit([
    { limit: () => ipLimiter.limit(ip) },
    { limit: () => tokenLimiter.limit(tokenKey) },
  ]);
}

export function rateLimitResponse(result: Extract<RateLimitResult, { limited: true }>): Response {
  return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(result.retryAfterSeconds),
    },
  });
}

export function rateLimitMisconfiguredResponse(): Response {
  return new Response(JSON.stringify({ error: "Rate limiting unavailable" }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}
