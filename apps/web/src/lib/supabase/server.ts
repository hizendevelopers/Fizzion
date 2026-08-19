import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  getOptionalSupabaseSecretKey,
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/env";

// The ARY TV module adds migration-driven tables before generated database types are refreshed.
// We keep the server client intentionally loose for now so the app can compile against the evolving schema.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseSupabaseClient = ReturnType<typeof createClient<any>>;

let publicServerClient: LooseSupabaseClient | null = null;
let adminServerClient: LooseSupabaseClient | null = null;

/**
 * A stateless, anon-key Supabase client with no session and no cookie
 * access. Use for genuinely public, unauthenticated reads only (e.g.
 * health checks). This client is subject to RLS as the `anon` role.
 */
export function getSupabaseServerClient() {
  if (!publicServerClient) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    publicServerClient = createClient<any>(getSupabaseUrl(), getSupabasePublishableKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return publicServerClient;
}

/**
 * Service-role Supabase client. Bypasses RLS entirely. Every call site
 * using this client MUST have already verified the caller's session and
 * authorization via `requireSession()`/`requireAdmin()` from
 * `@/lib/auth/session` — this client itself performs no access control.
 */
export function getSupabaseAdminClient() {
  if (!adminServerClient) {
    const serviceKey = getOptionalSupabaseSecretKey();
    const accessKey = serviceKey ?? getSupabasePublishableKey();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adminServerClient = createClient<any>(getSupabaseUrl(), accessKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminServerClient;
}

export function getOptionalSupabaseAdminClient() {
  try {
    return getSupabaseAdminClient();
  } catch {
    return null;
  }
}

/**
 * Session-aware Supabase client for use in Server Components, Route
 * Handlers, and Server Actions. Reads the caller's session from cookies
 * (kept fresh by `middleware.ts`) so `auth.uid()` resolves inside RLS
 * policies and `supabase.auth.getUser()` returns the signed-in user.
 *
 * Uses the publishable (anon) key — this client is subject to RLS as
 * the authenticated user, not the service role.
 *
 * Cookie writes are best-effort: Server Components cannot set cookies,
 * so `setAll` failures there are swallowed (the middleware is
 * responsible for keeping the session cookie refreshed). Route Handlers
 * and Server Actions can set cookies normally.
 */
export async function createSupabaseRequestClient() {
  const cookieStore = await cookies();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient<any>(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — middleware refreshes
          // the session cookie on the next request instead.
        }
      },
    },
  });
}
