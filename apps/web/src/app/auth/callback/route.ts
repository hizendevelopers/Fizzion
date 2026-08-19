import { NextResponse } from "next/server";

import { createSupabaseRequestClient } from "@/lib/supabase/server";

/**
 * Exchanges a Supabase invite/recovery `code` for a session and sets the
 * session cookie, then redirects on. Every invite and password-reset
 * email points here (via `redirectTo`) before landing on `/set-password`.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseRequestClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=invite_link_invalid", url.origin));
}
