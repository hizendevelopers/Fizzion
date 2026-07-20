/**
 * Social sync worker module.
 * Handles background synchronization of social media accounts using Apify scrapers.
 *
 * In production, this would be registered as a BullMQ job or triggered via Cron.
 * For now, it provides the core sync logic that can be invoked from API routes.
 */
import type { SocialProviderKey } from "@/lib/social-schemas";
import type { NormalizedSocialInput } from "@/lib/apify/unified-provider";
import type { SyncProgress, SyncResult } from "@/lib/social-sync-utils";
import { validateAndNormalizeInput, performFullSync } from "@/lib/social-sync-utils";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export interface SocialSyncJobPayload {
  connectionId: string;
  platform: SocialProviderKey;
  organizationId: string;
  socialAccountId: string;
  inputValue: string;
  jobType: "initial_import" | "incremental_refresh" | "manual_refresh";
}

/**
 * Execute a social sync job with full lifecycle management.
 * This is the entry point for worker processes.
 */
export async function executeSocialSyncJob(
  payload: SocialSyncJobPayload,
  onProgress?: (progress: SyncProgress) => void,
): Promise<SyncResult> {
  const supabase = getSupabaseAdminClient();

  try {
    // Update job status
    await supabase
      .from("social_sync_jobs")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
      })
      .eq("connection_id", payload.connectionId)
      .eq("status", "queued");

    // Validate and normalize input
    const normalized: NormalizedSocialInput = await validateAndNormalizeInput(
      payload.platform,
      payload.inputValue,
    );

    // Perform the full sync
    const result = await performFullSync(
      payload.connectionId,
      payload.platform,
      payload.organizationId,
      payload.socialAccountId,
      normalized,
      onProgress,
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown sync error";

    // Mark job as failed
    await supabase
      .from("social_sync_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq("connection_id", payload.connectionId);

    return {
      success: false,
      connectionId: payload.connectionId,
      contentCount: 0,
      commentCount: 0,
      errorMessage,
    };
  }
}

/**
 * Refresh all active connections that are due for sync.
 * Meant to be called by a cron job or scheduler.
 */
export async function refreshDueConnections(): Promise<{
  refreshed: number;
  failed: number;
  errors: string[];
}> {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  // Find connections due for sync
  const { data: dueConnections } = await supabase
    .from("social_connections")
    .select("*, social_accounts!inner(id, organization_id)")
    .eq("connection_status", "active")
    .eq("sync_status", "ready")
    .lte("next_sync_at", now)
    .limit(10);

  if (!dueConnections || dueConnections.length === 0) {
    return { refreshed: 0, failed: 0, errors: [] };
  }

  let refreshed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const connection of dueConnections) {
    try {
      const socialAccount = connection.social_accounts as unknown as { id: string; organization_id: string };
      const platform = connection.connection_type as SocialProviderKey;
      const inputValue = connection.input_value || connection.normalized_url;

      if (!inputValue) {
        failed++;
        continue;
      }

      await executeSocialSyncJob({
        connectionId: connection.id,
        platform,
        organizationId: socialAccount.organization_id,
        socialAccountId: socialAccount.id,
        inputValue,
        jobType: "incremental_refresh",
      });

      refreshed++;
    } catch (error) {
      failed++;
      errors.push(error instanceof Error ? error.message : `Failed to refresh ${connection.id}`);
    }
  }

  return { refreshed, failed, errors };
}

/**
 * Cancel any running sync jobs for a connection.
 */
export async function cancelRunningSync(connectionId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();

  await supabase
    .from("social_sync_jobs")
    .update({
      status: "cancelled",
      completed_at: new Date().toISOString(),
      error_message: "Cancelled by user",
    })
    .eq("connection_id", connectionId)
    .eq("status", "running");
}
