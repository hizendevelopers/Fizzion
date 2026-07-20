import { NextResponse } from "next/server";

import { makeSocialRequestId, socialApiError } from "@/lib/social-api";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { validateAndNormalizeInput, performFullSync } from "@/lib/social-sync-utils";
import { socialSyncSchema } from "@/lib/social-schemas";
import type { SocialProviderKey } from "@/lib/social-schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = makeSocialRequestId();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = socialSyncSchema.safeParse(body);

  if (!parsed.success) {
    return socialApiError(
      "INVALID_SYNC_REQUEST",
      parsed.error.issues[0]?.message ?? "Invalid social sync payload.",
      400,
      requestId,
    );
  }

  try {
    const supabase = getSupabaseAdminClient();

    // Get connection details
    const { data: connection } = await supabase
      .from("social_connections")
      .select("*, social_accounts!inner(id, organization_id)")
      .eq("id", id)
      .limit(1)
      .maybeSingle();

    if (!connection) {
      return socialApiError("SOCIAL_CONNECTION_NOT_FOUND", "Social connection was not found.", 404, requestId);
    }

    const socialAccount = connection.social_accounts as unknown as { id: string; organization_id: string };
    const platform = connection.connection_type as SocialProviderKey;

    // Get the input value to scrape
    let inputValue = connection.input_value || connection.normalized_url;

    if (!inputValue) {
      return socialApiError(
        "NO_INPUT_VALUE",
        "This connection has no saved input value. Please reconnect the account.",
        400,
        requestId,
      );
    }

    // Validate and normalize the input
    const normalized = await validateAndNormalizeInput(platform, inputValue);

    // Check if a sync is already running
    const { data: activeJobs } = await supabase
      .from("social_sync_jobs")
      .select("id")
      .eq("connection_id", id)
      .eq("status", "running")
      .limit(1);

    if (activeJobs && activeJobs.length > 0) {
      return socialApiError(
        "SYNC_ALREADY_RUNNING",
        "A synchronization is already in progress for this connection.",
        409,
        requestId,
      );
    }

    // Create sync job record
    const now = new Date().toISOString();
    await supabase.from("social_sync_jobs").insert({
      organization_id: socialAccount.organization_id,
      social_account_id: socialAccount.id,
      connection_id: id,
      platform,
      sync_mode: parsed.data.mode,
      job_type: parsed.data.mode === "initial" ? "initial_import" : "incremental_refresh",
      status: "running",
      started_at: now,
    });

    // Perform the full sync asynchronously (we'll return immediately and let the client poll)
    performFullSync(
      id,
      platform,
      socialAccount.organization_id,
      socialAccount.id,
      normalized,
    ).catch((error) => {
      console.error(`Social sync failed for connection ${id}:`, error);
    });

    return NextResponse.json({
      requestId,
      ok: true,
      connectionId: id,
      message: "Synchronization started. Poll /api/social/connections/:id/sync-status for progress.",
      syncStarted: true,
    });
  } catch (error) {
    return socialApiError(
      "SOCIAL_SYNC_FAILED",
      error instanceof Error ? error.message : "Social sync failed to start.",
      500,
      requestId,
    );
  }
}
</create_file>
