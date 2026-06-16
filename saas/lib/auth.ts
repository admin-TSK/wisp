/** Only allow same-origin relative paths (blocks open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/app"): string {
  const n = (next ?? fallback).trim();
  return n.startsWith("/") && !n.startsWith("//") ? n : fallback;
}
