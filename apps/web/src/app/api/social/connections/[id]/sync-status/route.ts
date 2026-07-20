import { NextResponse } from "next/server";

import { getApifyRunStatus } from "@/lib/apify/apify-service";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { makeSocialRequestId, socialApiError } from "@/lib/social-api";
import { processAndSaveResults } from "@/lib/social-sync-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = makeSocialRequestId();
  const { id } = await params;

  const supabase = getSupabaseAdminClient();
  const { data: connection } = await supabase
    .from("social_connections")
    .select("id, organization_id, social_account_id, connection_type, sync_status, last_synced_at, last_successful_sync_at, last_error")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (!connection) {
    return socialApiError("CONNECTION_NOT_FOUND", "Social connection was not found.", 404, requestId);
  }

  const { data: latestJob } = await supabase
    .from("social_sync_jobs")
    .select("*")
    .eq("connection_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    connection &&
    latestJob &&
    latestJob.status === "running" &&
    typeof latestJob.apify_run_id === "string" &&
    typeof latestJob.dataset_id === "string" &&
    connection.sync_status === "scraping"
  ) {
    const runStatus = await getApifyRunStatus(latestJob.apify_run_id);

    if (runStatus.status === "SUCCEEDED") {
      await processAndSaveResults(
        id,
        connection.connection_type,
        connection.organization_id,
        connection.social_account_id,
        latestJob.dataset_id,
      );
    } else if (["FAILED", "ABORTED", "TIMED-OUT"].includes(runStatus.status)) {
      const failureMessage = `Scraper run ended with status ${runStatus.status}.`;

      await supabase.from("social_connections").update({
        sync_status: "failed",
        last_error: failureMessage,
      }).eq("id", id);

      await supabase.from("social_sync_jobs").update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: failureMessage,
        updated_at: new Date().toISOString(),
      }).eq("connection_id", id).eq("status", "running");
    }
  }

  const { data: refreshedConnection } = await supabase
    .from("social_connections")
    .select("sync_status, last_synced_at, last_successful_sync_at, last_error")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  const { data: refreshedLatestJob } = await supabase
    .from("social_sync_jobs")
    .select("*")
    .eq("connection_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    requestId,
    syncStatus: refreshedConnection?.sync_status ?? connection.sync_status,
    lastSyncedAt: refreshedConnection?.last_synced_at ?? connection.last_synced_at,
    lastSuccessfulSyncAt:
      refreshedConnection?.last_successful_sync_at ?? connection.last_successful_sync_at,
    lastError: refreshedConnection?.last_error ?? connection.last_error,
    latestJob: refreshedLatestJob
      ? {
          status: refreshedLatestJob.status,
          recordsProcessed:
            refreshedLatestJob.payload &&
            typeof refreshedLatestJob.payload === "object" &&
            "recordsProcessed" in refreshedLatestJob.payload
              ? refreshedLatestJob.payload.recordsProcessed
              : null,
          errorMessage: refreshedLatestJob.error_message,
          startedAt: refreshedLatestJob.started_at,
          completedAt: refreshedLatestJob.completed_at,
        }
      : null,
  });
}
