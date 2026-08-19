import { NextResponse, type NextRequest } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/middleware";

const PUBLIC_PAGE_PATHS = new Set(["/login", "/forgot-password", "/mfa", "/set-password"]);
const PUBLIC_EXACT_PATHS = new Set(["/auth/callback"]);
const PUBLIC_API_PREFIXES = [
  "/api/social/webhooks",
  "/api/tv/youtube/channels/scheduled-sync",
  "/api/health",
];

function isPublicPath(pathname: string) {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true;
  if (PUBLIC_PAGE_PATHS.has(pathname)) return true;
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAdminPath(pathname: string) {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}

/**
 * Checks the caller's organization membership for the `admin` role via a
 * direct PostgREST request (service-role key). Proxy files are meant to
 * stay self-contained rather than pull in shared app modules, so this
 * intentionally doesn't import the full supabase-js client or the
 * app's `lib/auth/session` helpers.
 */
async function isOrganizationAdmin(userId: string): Promise<boolean> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return false;
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/organization_members?user_id=eq.${encodeURIComponent(
        userId,
      )}&status=eq.active&select=roles(slug)`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return false;
    }

    const rows = (await response.json()) as Array<{ roles: { slug: string } | null }>;
    return rows.some((row) => row.roles?.slug === "admin");
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, user } = await updateSupabaseSession(request);
  const isApiRequest = pathname.startsWith("/api");

  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isPublicPath(pathname)) {
    return response;
  }

  if (!user) {
    if (isApiRequest) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in required." } },
        { status: 401 },
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminPath(pathname) && !(await isOrganizationAdmin(user.id))) {
    if (isApiRequest) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Administrator access is required." } },
        { status: 403 },
      );
    }

    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|icon\\.png).*)"],
};
