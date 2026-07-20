import { NextResponse } from "next/server";

import { makeSocialRequestId, socialApiError } from "@/lib/social-api";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { validateAndNormalizeInput, performFullSync } from "@/lib/social-sync-utils";
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

    // Get organization
    const supabase = getSupabaseAdminClient();
    let { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", "coca_cola_iraq")
      .limit(1)
      .maybeSingle();

    if (!org) {
      const { data: fallbackOrg } = await supabase
        .from("organizations")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!fallbackOrg) {
        return socialApiError("NO_ORGANIZATION", "No organization found. Please set up an organization first.", 500, requestId);
      }
      org = fallbackOrg;
    }

    const organizationId = org.id;
    const now = new Date().toISOString();

    // Get platform ID
    let platformId: string | undefined;
    const { data: platformRow } = await supabase
      .from("social_platforms")
      .select("id")
      .eq("key", platform)
      .limit(1)
      .maybeSingle();
    if (platformRow) {
      platformId = platformRow.id;
    }

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
        token_status: "not_required",
        metadata: {
          source: "apify_scrape",
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

    // Create sync job record
    await supabase.from("social_sync_jobs").insert({
      organization_id: organizationId,
      social_account_id: socialAccount.id,
      connection_id: connectionId,
      platform,
      sync_mode: "initial",
      job_type: "initial_import",
      status: "running",
      started_at: now,
      created_at: now,
      updated_at: now,
    });

    // Update connection status to importing
    await supabase.from("social_connections").update({
      connection_status: "importing",
      sync_status: "scraping",
      status: "importing",
      updated_at: now,
    }).eq("id", connectionId);

    // Start the full sync in background (fire-and-forget)
    performFullSync(
      connectionId,
      platform,
      organizationId,
      socialAccount.id,
      normalized,
    ).catch((error) => {
      console.error(`Social Apify sync failed for connection ${connectionId}:`, error);
    });

    return NextResponse.json({
      requestId,
      ok: true,
      connectionId,
      message: "Scraping started. Your account will be connected automatically once data is imported.",
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
