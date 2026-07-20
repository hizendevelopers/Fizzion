import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { makeSocialRequestId, socialApiError } from "@/lib/social-api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = makeSocialRequestId();
  const { id } = await params;

  const supabase = getSupabaseAdminClient();
  const { data: connection } = await supabase
    .from("social_connections")
    .select("sync_status, last_synced_at, last_successful_sync_at, last_error")
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

  return NextResponse.json({
    requestId,
    syncStatus: connection.sync_status,
    lastSyncedAt: connection.last_synced_at,
    lastSuccessfulSyncAt: connection.last_successful_sync_at,
    lastError: connection.last_error,
    latestJob: latestJob
      ? {
          status: latestJob.status,
          recordsProcessed: latestJob.records_processed,
          errorMessage: latestJob.error_message,
          startedAt: latestJob.started_at,
          completedAt: latestJob.completed_at,
        }
      : null,
  });
}
</create_file>
