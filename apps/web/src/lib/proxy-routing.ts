// Pure routing-decision helpers used by proxy.ts (Next.js's middleware
// entry point). Kept in a separate module so they're directly unit
// testable without needing to invoke the full proxy() function (which
// requires a NextRequest and makes real Supabase network calls).

export const PUBLIC_PAGE_PATHS = new Set(["/login", "/forgot-password", "/mfa", "/set-password"]);
export const PUBLIC_EXACT_PATHS = new Set(["/auth/callback"]);
export const PUBLIC_API_PREFIXES = [
  "/api/social/webhooks",
  "/api/tv/youtube/channels/scheduled-sync",
  "/api/health",
];

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true;
  if (PUBLIC_PAGE_PATHS.has(pathname)) return true;
  return PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAdminPath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/")
  );
}
