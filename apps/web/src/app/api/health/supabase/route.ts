import { NextResponse } from "next/server";

import { getSupabaseProjectId } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = getSupabaseAdminClient();

  const [jwksResponse, organizationsResponse] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`, {
      cache: "no-store",
    }),
    supabase.from("organizations").select("id", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    status: jwksResponse.ok && !organizationsResponse.error ? "ok" : "degraded",
    projectId: getSupabaseProjectId(),
    jwksReachable: jwksResponse.ok,
    organizationsTableReachable: !organizationsResponse.error,
    organizationsCount: organizationsResponse.count ?? null,
    error: organizationsResponse.error?.message ?? null,
  });
}

