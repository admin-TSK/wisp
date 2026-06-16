import "server-only";
import { cookies } from "next/headers";

export const TENANT_COOKIE = "wisp_tenant_id";
const FLASH_COOKIE = "wisp_flash";

/** One-time flash payload (httpOnly, 60s). Prefer over query strings for secrets. */
export async function setFlash(payload: Record<string, string>): Promise<void> {
  const store = await cookies();
  store.set(FLASH_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60,
  });
}

export async function consumeFlash(): Promise<Record<string, string> | null> {
  const store = await cookies();
  const raw = store.get(FLASH_COOKIE)?.value;
  if (!raw) return null;
  store.delete(FLASH_COOKIE);
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

export async function setActiveTenant(tenantId: string): Promise<void> {
  const store = await cookies();
  store.set(TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function getActiveTenantCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(TENANT_COOKIE)?.value;
}
