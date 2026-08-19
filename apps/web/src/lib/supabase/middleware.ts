import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Deliberately NOT importing from "@/lib/env" here: that module reads
// local .env files via node:fs as a dev convenience, and Turbopack
// refuses to bundle node:fs into the Edge Middleware runtime at all
// (even behind a runtime guard — it's a build-time restriction). Edge
// Middleware always has NEXT_PUBLIC_*/server env vars available via
// process.env directly, so we read them here without that fallback.
function getEdgeSupabaseUrl() {
  const projectId = process.env.SUPABASE_PROJECT_ID;
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ||
    (projectId ? `https://${projectId}.supabase.co` : undefined);

  if (!url) {
    throw new Error("Supabase URL is not configured.");
  }
  return url;
}

function getEdgeSupabasePublishableKey() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY;

  if (!key) {
    throw new Error("Supabase publishable key is not configured.");
  }
  return key;
}

/**
 * Refreshes the Supabase session cookie on every request and returns
 * both the (possibly updated) response and the current user, if any.
 * Must be called from `middleware.ts` — this is what keeps
 * `auth.getUser()` working in Server Components without them being able
 * to write cookies themselves.
 */
export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient<any>(getEdgeSupabaseUrl(), getEdgeSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, supabase, user };
}
