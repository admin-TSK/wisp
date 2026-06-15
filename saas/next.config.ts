import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // typedRoutes disabled: server-action redirects use dynamic query-string URLs
  // (e.g. /login?error=...) which the typed-routes checker rejects.
  typedRoutes: false,
};

export default nextConfig;
