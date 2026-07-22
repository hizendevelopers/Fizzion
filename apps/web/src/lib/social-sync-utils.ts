import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  APIFY_ACTORS,
  INSTAGRAM_CONTENT_FALLBACK_ACTORS,
  INSTAGRAM_SUPPLEMENTAL_PROFILE_ACTORS,
} from "@/lib/apify/actors";
import { startApifyActor, startApifyActorById, waitForApifyRun, readEntireDataset } from "@/lib/apify/apify-service";
import { buildTikTokInput } from "@/lib/apify/input-builders/tiktok";
import { buildInstagramInput, buildInstagramLegacyInput } from "@/lib/apify/input-builders/instagram";
import { buildInstagramProfileInput } from "@/lib/apify/input-builders/instagram-profile";
import { buildYouTubeInput } from "@/lib/apify/input-builders/youtube";
import { buildFacebookInput } from "@/lib/apify/input-builders/facebook";
import { normalizeTikTokProfile, normalizeTikTokContent, normalizeTikTokComments } from "@/lib/apify/normalization/tiktok";
import { normalizeInstagramProfile, normalizeInstagramContent, normalizeInstagramComments } from "@/lib/apify/normalization/instagram";
import { normalizeYouTubeProfile, normalizeYouTubeContent, normalizeYouTubeComments } from "@/lib/apify/normalization/youtube";
import { normalizeFacebookProfile, normalizeFacebookContent, normalizeFacebookComments } from "@/lib/apify/normalization/facebook";
import type { NormalizedSocialInput, NormalizedSocialProfile, NormalizedSocialContent, NormalizedSocialComment } from "@/lib/apify/unified-provider";
import type { SocialProviderKey } from "@/lib/social-schemas";

export type SyncStage =
  | "validating"
  | "starting_scraper"
  | "scraper_running"
  | "fetching_results"
  | "processing_profile"
  | "importing_content"
  | "calculating_metrics"
  | "finalizing"
  | "completed"
  | "failed";

export interface SyncProgress {
  stage: SyncStage;
  progressPercent: number;
  recordsProcessed: number;
  message: string;
  startedAt: string;
}

export interface SyncResult {
  success: boolean;
  connectionId: string;
  profile?: NormalizedSocialProfile;
  contentCount: number;
  commentCount: number;
  errorMessage?: string;
}

export interface ScrapeBundleResult {
  primary: {
    actorId: string;
    runId: string;
    datasetId?: string;
    status: string;
  };
  supplemental: Array<{
    actorId: string;
    runId: string;
    datasetId?: string;
    status: string;
    purpose: "profile" | "content_fallback";
  }>;
}

const DEFAULT_INSTAGRAM_RESULTS_LIMIT = 2500;
const INSTAGRAM_PRIMARY_RESULTS_LIMIT_CAP = 100;

/**
 * Build normalized input for a social account discovery/validation.
 */
export async function validateAndNormalizeInput(
  platform: SocialProviderKey,
  input: string,
): Promise<NormalizedSocialInput> {
  const trimmed = input.trim();

  // Determine input type
  const looksLikeUrl = trimmed.startsWith("http://") || trimmed.startsWith("https://");
  const isHandle = trimmed.startsWith("@");
  let normalizedUrl: string | undefined;
  let username: string | undefined;
  let handle: string | undefined;
  let externalId: string | undefined;

  if (looksLikeUrl) {
    const url = new URL(trimmed);
    // SSRF protection: reject non-https and private network URLs
    if (url.protocol !== "https:") {
      throw new Error("Only https:// URLs are supported.");
    }
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      throw new Error("Localhost and private network URLs are not allowed.");
    }

    // Remove tracking query parameters
    const cleanUrl = new URL(url.toString());
    const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "ref", "source"];
    trackingParams.forEach((param) => cleanUrl.searchParams.delete(param));
    normalizedUrl = cleanUrl.toString().replace(/\/+$/, "");

    // Extract username/handle from URL
    const pathParts = cleanUrl.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    if (platform === "youtube") {
      if (pathParts[0] === "channel" && pathParts[1]) {
        externalId = pathParts[1];
      } else if (pathParts[0] === "watch" && cleanUrl.searchParams.get("v")) {
        externalId = cleanUrl.searchParams.get("v")!;
        handle = pathParts[0];
      } else if (pathParts[0]?.startsWith("@")) {
        handle = pathParts[0].replace(/^@/, "");
      }
    } else if (platform === "tiktok") {
      if (pathParts[0]?.startsWith("@")) {
        handle = pathParts[0].replace(/^@/, "");
        username = handle;
      }
    } else if (platform === "instagram") {
      username = pathParts[0]?.replace(/^@/, "");
    } else if (platform === "facebook") {
      username = pathParts[0]?.replace(/^@/, "");
    }
  } else if (isHandle) {
    handle = trimmed.replace(/^@/, "").trim();
    username = handle;
    // Build normalized URL
    const baseUrls: Record<SocialProviderKey, string> = {
      tiktok: "https://www.tiktok.com/@",
      instagram: "https://www.instagram.com/",
      youtube: "https://www.youtube.com/@",
      facebook: "https://www.facebook.com/",
    };
    normalizedUrl = `${baseUrls[platform]}${handle}`;
  } else {
    // Plain username
    username = trimmed;
    handle = trimmed;
    const baseUrls: Record<SocialProviderKey, string> = {
      tiktok: "https://www.tiktok.com/@",
      instagram: "https://www.instagram.com/",
      youtube: "https://www.youtube.com/@",
      facebook: "https://www.facebook.com/",
    };
    normalizedUrl = `${baseUrls[platform]}${username}`;
  }

  return {
    platform,
    originalInput: input,
    normalizedUrl,
    username,
    handle,
    externalId,
    inputType: looksLikeUrl ? "url" : isHandle ? "handle" : "username",
  };
}

/**
 * Start an Apify scrape for a given platform and normalized input.
 */
export async function startPlatformScrapeBundle(
  normalized: NormalizedSocialInput,
  options?: Record<string, unknown>,
): Promise<ScrapeBundleResult> {
  const platform = normalized.platform;

  let actorInput: Record<string, unknown>;

  switch (platform) {
    case "tiktok":
      actorInput = buildTikTokInput(normalized, options as Parameters<typeof buildTikTokInput>[1]);
      break;
    case "instagram":
      actorInput = buildInstagramInput(
        normalized,
        Math.min(
          Number(options?.resultsLimit ?? DEFAULT_INSTAGRAM_RESULTS_LIMIT),
          INSTAGRAM_PRIMARY_RESULTS_LIMIT_CAP,
        ),
      );
      break;
    case "youtube":
      actorInput = buildYouTubeInput(normalized, options as Parameters<typeof buildYouTubeInput>[1]);
      break;
    case "facebook":
      actorInput = buildFacebookInput(normalized);
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  const primaryRun = await startApifyActor(platform, actorInput);
  const supplemental: ScrapeBundleResult["supplemental"] = [];

  if (platform === "instagram") {
    const profileInput = buildInstagramProfileInput(normalized);
    for (const actorId of INSTAGRAM_SUPPLEMENTAL_PROFILE_ACTORS) {
      const profileRun = await startApifyActorById(actorId, profileInput);
      supplemental.push({
        actorId,
        runId: profileRun.runId,
        datasetId: profileRun.datasetId,
        status: profileRun.status,
        purpose: "profile",
      });
    }

    const fallbackInput = buildInstagramLegacyInput(
      normalized,
      Number(options?.resultsLimit ?? DEFAULT_INSTAGRAM_RESULTS_LIMIT),
    );
    for (const actorId of INSTAGRAM_CONTENT_FALLBACK_ACTORS) {
      const fallbackRun = await startApifyActorById(actorId, fallbackInput);
      supplemental.push({
        actorId,
        runId: fallbackRun.runId,
        datasetId: fallbackRun.datasetId,
        status: fallbackRun.status,
        purpose: "content_fallback",
      });
    }
  }

  return {
    primary: {
      actorId: APIFY_ACTORS[platform],
      runId: primaryRun.runId,
      datasetId: primaryRun.datasetId,
      status: primaryRun.status,
    },
    supplemental,
  };
}

export async function startPlatformScrape(
  normalized: NormalizedSocialInput,
  options?: Record<string, unknown>,
) {
  const bundle = await startPlatformScrapeBundle(normalized, options);
  return bundle.primary;
}

/**
 * Process Apify dataset results through platform-specific normalizers and save to database.
 */
export async function processAndSaveResults(
  connectionId: string,
  platform: SocialProviderKey,
  organizationId: string,
  socialAccountId: string,
  datasetId: string,
  supplementalDatasets: Array<{ datasetId: string; purpose: "profile" | "content_fallback" }> = [],
  onProgress?: (progress: SyncProgress) => void,
): Promise<SyncResult> {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const allItems: Record<string, unknown>[] = [];
  const supplementalProfileItems: Record<string, unknown>[] = [];
  const fallbackContentItems: Record<string, unknown>[] = [];
  let profile: NormalizedSocialProfile | undefined;
  let contentItems: NormalizedSocialContent[] = [];
  let commentItems: NormalizedSocialComment[] = [];
  let errorMessage: string | undefined;

  const emitProgress = (stage: SyncStage, progressPercent: number, recordsProcessed: number, message: string) => {
    onProgress?.({ stage, progressPercent, recordsProcessed, message, startedAt: now });
  };

  try {
    // Fetch all items from dataset in batches
    emitProgress("fetching_results", 20, 0, "Fetching scraper results");
    await readEntireDataset(datasetId, async (batch) => {
      allItems.push(...batch);
      emitProgress("fetching_results", 30, allItems.length, `Fetched ${allItems.length} items`);
    });

    for (const supplementalDataset of supplementalDatasets) {
      await readEntireDataset(supplementalDataset.datasetId, async (batch) => {
        if (supplementalDataset.purpose === "profile") {
          supplementalProfileItems.push(...batch);
          return;
        }

        fallbackContentItems.push(...batch);
      });
    }

    if (allItems.length === 0 && fallbackContentItems.length > 0) {
      allItems.push(...fallbackContentItems);
    }

    if (allItems.length === 0) {
      await supabase.from("social_connections").update({
        connection_status: "connected",
        sync_status: "failed",
        last_synced_at: now,
        last_error:
          "The scraper completed, but no public content was returned for this account. The account may be private, unavailable, or unsupported by the selected scraper.",
      }).eq("id", connectionId);

      await supabase.from("social_sync_jobs").update({
        status: "failed",
        completed_at: now,
        error_message:
          "The scraper completed, but no public content was returned for this account. The account may be private, unavailable, or unsupported by the selected scraper.",
        payload: {
          recordsProcessed: 0,
          commentCount: 0,
        },
      }).eq("connection_id", connectionId).eq("status", "running");

      return {
        success: true,
        connectionId,
        contentCount: 0,
        commentCount: 0,
        errorMessage: "The scraper completed, but no public content was returned for this account. The account may be private, unavailable, or unsupported by the selected scraper.",
      };
    }

    // Normalize profile
    emitProgress("processing_profile", 40, allItems.length, "Processing profile data");
    switch (platform) {
      case "tiktok":
        profile = normalizeTikTokProfile(allItems);
        contentItems = normalizeTikTokContent(allItems);
        commentItems = normalizeTikTokComments(allItems);
        break;
      case "instagram":
        profile = normalizeInstagramProfile(
          supplementalProfileItems.length > 0
            ? [...supplementalProfileItems, ...allItems]
            : allItems,
        );
        contentItems = normalizeInstagramContent(allItems);
        commentItems = normalizeInstagramComments(allItems);
        break;
      case "youtube":
        profile = normalizeYouTubeProfile(allItems);
        contentItems = normalizeYouTubeContent(allItems);
        commentItems = normalizeYouTubeComments(allItems);
        break;
      case "facebook":
        profile = normalizeFacebookProfile(allItems);
        contentItems = normalizeFacebookContent(allItems);
        commentItems = normalizeFacebookComments(allItems);
        break;
    }

    // Save profile
    emitProgress("importing_content", 50, contentItems.length, "Importing content");
    if (profile) {
      const { error: profileError } = await supabase.from("social_profiles").insert({
        organization_id: organizationId,
        connection_id: connectionId,
        display_name: profile.displayName,
        username: profile.username,
        profile_url: profile.profileUrl,
        profile_image_url: profile.profileImageUrl,
        cover_image_url: profile.coverImageUrl,
        bio: profile.bio,
        category: profile.category,
        verified: profile.verified ?? false,
        followers: profile.followers,
        following: profile.following,
        total_posts: profile.totalPosts,
        total_likes: profile.totalLikes,
        total_views: profile.totalViews,
        reach: profile.reach,
        impressions: profile.impressions,
        engagements: profile.engagements,
        engagement_rate: profile.engagementRate,
        raw_data_json: {
          ...profile.rawData,
          supplementalProfileImported: supplementalProfileItems.length > 0,
        },
        captured_at: now,
      });

      if (profileError) {
        console.error("Failed to save profile:", profileError);
      }

      // Update connection with profile info
      await supabase.from("social_connections").update({
        display_name: profile.displayName,
        username: profile.username,
        profile_image_url: profile.profileImageUrl,
        external_account_id: profile.externalAccountId,
      }).eq("id", connectionId);

      await supabase.from("social_accounts").update({
        display_name: profile.displayName,
        profile_image_url: profile.profileImageUrl,
        bio: profile.bio,
        is_verified: profile.verified ?? false,
        last_synchronized_at: now,
        updated_at: now,
      }).eq("id", socialAccountId);
    }

    // Save content items
    let savedContent = 0;
    let savedComments = 0;

    for (const content of contentItems) {
      emitProgress("importing_content", 50 + Math.round((savedContent / contentItems.length) * 30), savedContent, `Importing content ${savedContent + 1}/${contentItems.length}`);

      const { data: post, error: postError } = await supabase
        .from("social_posts")
        .upsert(
          {
            organization_id: organizationId,
            social_account_id: socialAccountId,
            provider_post_id: content.externalContentId,
            content_type: content.contentType,
            title: content.title,
            caption: content.caption,
            description: content.description,
            hashtags: content.hashtags,
            mentions: content.mentions,
            tagged_accounts: content.taggedAccounts,
            collaborators: content.collaborators,
            language: null,
            published_at: content.publishedAt?.toISOString() ?? now,
            permalink: content.permalink,
            is_paid: false,
            duration_seconds: content.durationSeconds,
            location_name: null,
            paid_status: "organic",
            processing_status: "ready",
            content_status: "published",
            raw_payload_json: {
              ...content.rawData,
              supplementalProfileImported: supplementalProfileItems.length > 0,
            },
          },
          {
            onConflict: "social_account_id,provider_post_id",
          },
        )
        .select("id")
        .limit(1)
        .maybeSingle();

      if (postError || !post?.id) continue;
      savedContent++;

      const existingMedia = await supabase
        .from("social_post_media")
        .select("id, source_url, thumbnail_url, media_type")
        .eq("social_post_id", post.id)
        .limit(1)
        .maybeSingle();

      const resolvedSourceUrl = content.mediaUrls[0] ?? content.thumbnailUrl ?? null;
      const resolvedThumbnailUrl = content.thumbnailUrl ?? content.mediaUrls[0] ?? null;

      if (!existingMedia.data?.id) {
        await supabase.from("social_post_media").insert({
          organization_id: organizationId,
          social_post_id: post.id,
          media_type: content.contentType,
          source_url: resolvedSourceUrl,
          thumbnail_url: resolvedThumbnailUrl,
          duration_seconds: content.durationSeconds,
          metadata: {
            provider: platform,
            allMediaUrls: content.mediaUrls,
            supplementalProfileImported: supplementalProfileItems.length > 0,
          },
          alt_text: content.description ?? content.caption ?? null,
        });
      } else if (
        existingMedia.data.source_url !== resolvedSourceUrl ||
        existingMedia.data.thumbnail_url !== resolvedThumbnailUrl ||
        existingMedia.data.media_type !== content.contentType
      ) {
        await supabase
          .from("social_post_media")
          .update({
            source_url: resolvedSourceUrl,
            thumbnail_url: resolvedThumbnailUrl,
            media_type: content.contentType,
            duration_seconds: content.durationSeconds,
            metadata: {
              provider: platform,
              allMediaUrls: content.mediaUrls,
              supplementalProfileImported: supplementalProfileItems.length > 0,
            },
            alt_text: content.description ?? content.caption ?? null,
          })
          .eq("id", existingMedia.data.id);
      }

      // Save content metrics
      await supabase.from("social_content_metrics").insert({
        organization_id: organizationId,
        social_content_id: post.id,
        captured_at: now,
        views: content.views,
        reach: content.reach,
        impressions: content.impressions,
        likes: content.likes,
        comments: content.comments,
        shares: content.shares,
        saves: content.saves,
        reactions: content.reactions,
        engagements: content.engagements,
        engagement_rate: content.engagementRate,
        raw_metrics_json: {
          ...content.rawData,
          supplementalProfileImported: supplementalProfileItems.length > 0,
        },
      });

      // Upsert post metrics to social_post_metrics for backward compat
      await supabase.from("social_post_metrics").upsert(
        {
          organization_id: organizationId,
          social_post_id: post.id,
          metric_name: "summary",
          metric_value: content.engagements ?? null,
          availability: content.engagements != null ? "available" : "not_available",
          captured_at: now,
          normalized_metrics: {
            likes: content.likes,
            comments: content.comments,
            shares: content.shares,
            saves: content.saves,
            views: content.views,
            reach: content.reach,
            impressions: content.impressions,
            engagements: content.engagements,
            engagementRate: content.engagementRate,
          },
          raw_metrics_json: {
            ...content.rawData,
            supplementalProfileImported: supplementalProfileItems.length > 0,
          },
        },
        { onConflict: "social_post_id,metric_name" },
      );

      // Save comments only when they can be confidently mapped to this content item.
      const postComments = commentItems.filter((comment) => {
        if (comment.sourceContentId) {
          return comment.sourceContentId === content.externalContentId;
        }

        const sourceContentId = comment.rawData?.__sourceContentId;
        return typeof sourceContentId === "string" && sourceContentId === content.externalContentId;
      });
      if (postComments.length > 0) {
        for (const comment of postComments) {
          const { error: commentError } = await supabase.from("social_comments").upsert(
            {
              organization_id: organizationId,
              social_post_id: post.id,
              external_comment_id: comment.externalCommentId,
              author_name: comment.authorName,
              author_username: comment.authorUsername,
              author_avatar_url: comment.authorAvatarUrl,
              comment_text: comment.commentText,
              comment_likes: comment.likes,
              replies_count: comment.repliesCount ?? 0,
              published_at: comment.publishedAt?.toISOString() ?? now,
              raw_payload_json: comment.rawData,
            },
            { onConflict: "social_post_id,external_comment_id" },
          );
          if (!commentError) savedComments++;
        }
      }
    }

    emitProgress("calculating_metrics", 85, savedContent, "Calculating metrics");

    // Update account snapshot
    if (profile) {
      await supabase.from("social_account_snapshots").insert({
        organization_id: organizationId,
        social_account_id: socialAccountId,
        captured_at: now,
        follower_count: profile.followers,
        following_count: profile.following,
        content_count: profile.totalPosts,
        engagement_rate: profile.engagementRate,
        likes: profile.totalLikes,
        comments: null,
        shares: null,
        saves: null,
        normalized_metrics: {
          followers: profile.followers,
          following: profile.following,
          totalPosts: profile.totalPosts,
          totalLikes: profile.totalLikes,
          totalViews: profile.totalViews,
          engagements: profile.engagements,
          engagementRate: profile.engagementRate,
        },
        raw_summary: {
          source: "apify_scraper",
          platform,
          supplementalProfileImported: supplementalProfileItems.length > 0,
        },
      });
    }

    // Update account metrics
    await supabase.from("social_account_metrics").insert({
      organization_id: organizationId,
      social_account_id: socialAccountId,
      metric_name: "portfolio",
      metric_value: profile?.engagements ?? null,
      captured_at: now,
      views: profile?.totalViews,
      likes: profile?.totalLikes,
      reach: profile?.reach,
      impressions: profile?.impressions,
      engagements: profile?.engagements,
      engagement_rate: profile?.engagementRate,
      normalized_metrics: {
        followers: profile?.followers,
        following: profile?.following,
        reach: profile?.reach,
        impressions: profile?.impressions,
        views: profile?.totalViews,
        engagements: profile?.engagements,
        likes: profile?.totalLikes,
      },
      raw_metrics_json: {
        source: "apify_scraper",
        platform,
        supplementalProfileImported: supplementalProfileItems.length > 0,
      },
    });

    emitProgress("finalizing", 95, savedContent, "Finalizing dashboard");

    // Update connection status
    const nextSync = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour
    await supabase.from("social_connections").update({
      connection_status: "active",
      sync_status: "ready",
      last_synced_at: now,
      last_successful_sync_at: now,
      next_sync_at: nextSync,
      last_error: null,
    }).eq("id", connectionId);

    // Mark sync job as completed
    await supabase.from("social_sync_jobs").update({
      status: "completed",
      completed_at: now,
        payload: {
          recordsProcessed: savedContent,
          commentCount: savedComments,
          scraperItemsFetched: allItems.length,
          fallbackItemsFetched: fallbackContentItems.length,
        },
      }).eq("connection_id", connectionId).eq("status", "running");

    emitProgress("completed", 100, savedContent, "Completed");

    return {
      success: true,
      connectionId,
      profile,
      contentCount: savedContent,
      commentCount: savedComments,
    };
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error during sync processing";

    // Update connection with error
    await supabase.from("social_connections").update({
      sync_status: "failed",
      last_error: errorMessage,
    }).eq("id", connectionId);

    // Mark sync job as failed
    await supabase.from("social_sync_jobs").update({
      status: "failed",
      completed_at: now,
      error_message: errorMessage,
    }).eq("connection_id", connectionId).eq("status", "running");

    emitProgress("failed", 0, 0, errorMessage);

    return {
      success: false,
      connectionId,
      contentCount: 0,
      commentCount: 0,
      errorMessage,
    };
  }
}

/**
 * Perform a complete sync: validate input, start scrape, wait, process results.
 */
export async function performFullSync(
  connectionId: string,
  platform: SocialProviderKey,
  organizationId: string,
  socialAccountId: string,
  normalizedInput: NormalizedSocialInput,
  options?: { resultsLimit?: number },
  onProgress?: (progress: SyncProgress) => void,
): Promise<SyncResult> {
  const emitProgress = (stage: SyncStage, pct: number, records: number, msg: string) => {
    onProgress?.({ stage, progressPercent: pct, recordsProcessed: records, message: msg, startedAt: new Date().toISOString() });
  };

  emitProgress("validating", 5, 0, "Validating account");

  // Start the Apify Actor
  emitProgress("starting_scraper", 10, 0, "Starting scraper");
  const scrapeBundle = await startPlatformScrapeBundle(normalizedInput, {
    resultsLimit: options?.resultsLimit,
  });
  const { runId, datasetId } = scrapeBundle.primary;

  if (!datasetId) {
    throw new Error("Scraper did not return a dataset ID.");
  }

  // Update connection with run info
  const supabase = getSupabaseAdminClient();
  await supabase.from("social_connections").update({
    connection_status: "importing",
    sync_status: "scraping",
    latest_apify_run_id: runId,
    latest_dataset_id: datasetId,
    apify_actor_id: APIFY_ACTORS[platform],
  }).eq("id", connectionId);

  await supabase.from("social_sync_jobs").update({
    actor_id: APIFY_ACTORS[platform],
    apify_run_id: runId,
    dataset_id: datasetId,
    payload: {
      stage: "scraper_running",
      supplementalRuns: scrapeBundle.supplemental,
    },
  }).eq("connection_id", connectionId).eq("status", "running");

  // Wait for the Actor to finish
  emitProgress("scraper_running", 15, 0, "Scraper running");
  const runStatus = await waitForApifyRun(runId, 300);

  if (runStatus.status !== "SUCCEEDED") {
    throw new Error(`Scraper ${platform} finished with status: ${runStatus.status}`);
  }

  const supplementalDatasets = scrapeBundle.supplemental.flatMap((run) =>
    run.datasetId
      ? [{ datasetId: run.datasetId, purpose: run.purpose }]
      : [],
  );

  for (const supplementalRun of scrapeBundle.supplemental) {
    const supplementalWaitSecs = supplementalRun.purpose === "content_fallback" ? 900 : 300;
    const supplementalStatus = await waitForApifyRun(supplementalRun.runId, supplementalWaitSecs);
    if (supplementalStatus.status !== "SUCCEEDED") {
      throw new Error(
        `Supplemental Instagram scraper ${supplementalRun.actorId} (${supplementalRun.purpose}) finished with status: ${supplementalStatus.status}`,
      );
    }
  }

  // Process and save results
  return processAndSaveResults(
    connectionId,
      platform,
      organizationId,
      socialAccountId,
      datasetId,
      supplementalDatasets,
      onProgress,
  );
}

/**
 * Refresh an existing connection by re-running the scrape.
 */
export async function refreshConnection(
  connectionId: string,
  resultsLimit?: number,
): Promise<SyncResult> {
  const supabase = getSupabaseAdminClient();

  const { data: connection } = await supabase
    .from("social_connections")
    .select("*, social_accounts!inner(id, organization_id)")
    .eq("id", connectionId)
    .limit(1)
    .maybeSingle();

  if (!connection) {
    throw new Error("Social connection not found.");
  }

  const socialAccount = connection.social_accounts as unknown as { id: string; organization_id: string };
  const platform = connection.connection_type as SocialProviderKey;
  const inputValue = connection.input_value || connection.normalized_url;

  if (!inputValue) {
    throw new Error("Cannot refresh: no input value found for this connection.");
  }

  const normalized = await validateAndNormalizeInput(platform, inputValue);

  return performFullSync(
    connectionId,
    platform,
    socialAccount.organization_id,
    socialAccount.id,
    normalized,
    { resultsLimit },
  );
}
