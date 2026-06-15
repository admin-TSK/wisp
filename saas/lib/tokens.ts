import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** We store only a hash of bearer tokens; the plaintext is shown once at enrol. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newEnrolmentToken(): string {
  return `wisp_ent_${randomBytes(24).toString("base64url")}`;
}

/** Per-tenant enrolment secret IT puts in the MDM profile. Shown once; only the
 *  hash is stored (enrol_secrets.secret_hash). */
export function newEnrolSecret(): string {
  return `wisp_es_${randomBytes(32).toString("base64url")}`;
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function bearerFrom(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}
