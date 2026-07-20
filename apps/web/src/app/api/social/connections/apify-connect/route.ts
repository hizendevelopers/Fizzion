import { NextResponse } from "next/server";

import { makeSocialRequestId, socialApiError } from "@/lib/social-api";
import { getDefaultSocialOrganizationId, getSocialPlatformId, syncSocialConnection } from "@/lib/social-data";
import { getApifyApiToken } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { startPlatformScrape, validateAndNormalizeInput } from "@/lib/social-sync-utils";
import { APIFY_ACTORS } from "@/lib/apify/actors";
import type { SocialProviderKey } from "@/lib/social-schemas";

export async function POST(request: Request) {
  const requestId = makeSocialRequestId();

  try {
    const body = await request.json();
    const platform = body?.platform as SocialProviderKey;
    const inputValue = body?.input?.trim();

    if (!platform || !["tiktok", "instagram", "youtube", "facebook"].includes(platform)) {
      return socialApiError("INVALID_PLATFORM", "Please select a valid platform (tiktok, instagram, youtube, facebook).", 400, requestId);
    }

    if (!inputValue || inputValue.length < 2) {
      return socialApiError("INVALID_INPUT", "Please enter a valid profile URL, username, or handle.", 400, requestId);
    }

    // Validate and normalize the input
    const normalized = await validateAndNormalizeInput(platform, inputValue);
    let hasApifyToken = true;

    try {
      getApifyApiToken();
    } catch {
      hasApifyToken = false;
    }

    const supabase = getSupabaseAdminClient();
    const organizationId = await getDefaultSocialOrganizationId();
    const now = new Date().toISOString();
    const platformId = await getSocialPlatformId(platform);

    // Create social_account record
    const { data: socialAccount, error: accountError } = await supabase
      .from("social_accounts")
      .upsert(
        {
          organization_id: organizationId,
          platform_id: platformId,
          handle: normalized.username ?? normalized.handle ?? inputValue,
          normalized_url: normalized.normalizedUrl,
          display_name: normalized.username ?? inputValue,
          connection_type: "public_scrape",
          last_synchronized_at: now,
        },
        {
          onConflict: "organization_id,platform_id,handle",
        },
      )
      .select("id")
      .limit(1)
      .maybeSingle();

    if (accountError || !socialAccount?.id) {
      return socialApiError("ACCOUNT_CREATE_FAILED", accountError?.message ?? "Could not create social account record.", 500, requestId);
    }

    // Create connection record
    const { data: connection, error: connError } = await supabase
      .from("social_connections")
      .insert({
        organization_id: organizationId,
        social_account_id: socialAccount.id,
        connection_type: platform,
        status: "pending",
        connection_status: "pending",
        sync_status: "queued",
        input_value: inputValue,
        normalized_url: normalized.normalizedUrl,
        username: normalized.username ?? normalized.handle,
        account_type: "public_scrape",
        apify_actor_id: APIFY_ACTORS[platform],
        token_status: hasApifyToken ? "not_required" : "sandbox",
        sandbox_mode: !hasApifyToken,
        metadata: {
          source: hasApifyToken ? "apify_scrape" : "sandbox_fixture",
          normalizedInput: normalized,
        },
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .limit(1)
      .maybeSingle();

    if (connError || !connection?.id) {
      return socialApiError("CONNECTION_CREATE_FAILED", connError?.message ?? "Could not create connection record.", 500, requestId);
    }

    const connectionId = connection.id;

    if (!hasApifyToken) {
      await syncSocialConnection(connectionId, { mode: "initial" });
    } else {
      const { error: jobError } = await supabase.from("social_sync_jobs").insert({
        organization_id: organizationId,
        social_account_id: socialAccount.id,
        connection_id: connectionId,
        sync_mode: "initial",
        job_type: "initial_import",
        status: "running",
        started_at: now,
        actor_id: APIFY_ACTORS[platform],
        payload: {
          source: "apify_scrape",
        },
        created_at: now,
        updated_at: now,
      });

      if (jobError) {
        return socialApiError("SYNC_JOB_CREATE_FAILED", jobError.message, 500, requestId);
      }

      const { runId, datasetId } = await startPlatformScrape(normalized);
      if (!datasetId) {
        return socialApiError("SCRAPE_START_FAILED", "Scraper did not return a dataset ID.", 500, requestId);
      }

      await supabase.from("social_connections").update({
        connection_status: "importing",
        sync_status: "scraping",
        status: "importing",
        latest_apify_run_id: runId,
        latest_dataset_id: datasetId,
        updated_at: now,
      }).eq("id", connectionId);

      await supabase.from("social_sync_jobs").update({
        actor_id: APIFY_ACTORS[platform],
        apify_run_id: runId,
        dataset_id: datasetId,
        payload: {
          stage: "scraper_running",
        },
        updated_at: now,
      }).eq("connection_id", connectionId).eq("status", "running");
    }

    return NextResponse.json({
      requestId,
      ok: true,
      connectionId,
      mode: hasApifyToken ? "apify" : "sandbox",
      message: hasApifyToken
        ? "Scraping started. Your account will be connected automatically once data is imported."
        : "APIFY_API_TOKEN is not configured, so a clearly labeled sandbox fixture was imported for this account.",
    });
  } catch (error) {
    return socialApiError(
      "CONNECT_FAILED",
      error instanceof Error ? error.message : "Failed to connect social account via Apify.",
      500,
      requestId,
    );
  }
}
