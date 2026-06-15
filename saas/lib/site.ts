/** Public site URL for invite links and auth redirects. */
export function siteUrl(): string {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_URL ??
    process.env.WISP_SITE_URL ??
    "http://localhost:3000";
  return env.startsWith("http") ? env.replace(/\/$/, "") : `https://${env.replace(/\/$/, "")}`;
}
