import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Deliberately NOT importing from "@/lib/env" here: that module falls
// back to reading local .env files via node:fs when a var isn't in
// process.env (needed in this monorepo because .env.local lives at the
// repo root, one level above apps/web, which Next's own env loader
// doesn't search by default). Turbopack refuses to bundle node:fs into
// this file's runtime at all — a build-time restriction, not a runtime
// guard — so that fallback can't be used here. Instead, local dev keeps
// a copy of the root .env.local at apps/web/.env.local (gitignored;
// re-copy it if you update the root one) so Next's normal loader picks
// it up and process.env.NEXT_PUBLIC_* / process.env.SUPABASE_* resolve
// directly, same as any real deployment where the platform injects env
// vars itself rather than relying on a checked-in file.
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
