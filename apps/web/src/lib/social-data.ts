import { getOptionalSupabaseAdminClient, getSupabaseAdminClient } from "@/lib/supabase/server";
import { getOptionalSupabaseSecretKey } from "@/lib/env";

import { getSocialFixture } from "./social-fixtures";
import { getSocialProvider } from "./social-providers";
import type {
  SocialContentQuery,
  SocialDiscoverInput,
  SocialProviderKey,
  SocialReportInput,
  SocialSyncInput,
  SocialWebhookIngestInput,
} from "./social-schemas";
import { encryptSocialToken } from "./social-security";
import {
  calculateEngagementRateByFollowers,
  calculateEngagementRateByReach,
  calculateFollowerGrowthRate,
  calculateNormalizedEngagements,
  classifySentiment,
  previousRangeLabel,
} from "./social-utils";

type GenericRow = Record<string, unknown>;

function rowString(row: GenericRow, key: string, fallback = "") {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function rowNullableString(row: GenericRow, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function rowNumber(row: GenericRow, key: string, fallback = 0) {
  const value = row[key];
  return typeof value === "number" ? value : fallback;
}

function rowNullableNumber(row: GenericRow, key: string) {
  const value = row[key];
  return typeof value === "number" ? value : null;
}

function rowBoolean(row: GenericRow, key: string, fallback = false) {
  const value = row[key];
  return typeof value === "boolean" ? value : fallback;
}

function rowStringArray(row: GenericRow, key: string) {
  const value = row[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function rowObject(row: GenericRow, key: string) {
  const value = row[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as GenericRow) : {};
}

function rowMetricNumber(row: GenericRow, key: string, fallbackKeys: string[] = []) {
  const direct = rowNullableNumber(row, key);
  if (direct != null) {
    return direct;
  }

  const normalized = rowObject(row, "normalized_metrics");
  const raw = rowObject(row, "raw_metrics_json");
  const rawSummary = rowObject(row, "raw_summary");

  for (const candidate of [key, ...fallbackKeys]) {
    const fromNormalized = rowNullableNumber(normalized, candidate);
    if (fromNormalized != null) {
      return fromNormalized;
    }

    const fromRaw = rowNullableNumber(raw, candidate);
    if (fromRaw != null) {
      return fromRaw;
    }

    const fromRawSummary = rowNullableNumber(rawSummary, candidate);
    if (fromRawSummary != null) {
      return fromRawSummary;
    }
  }

  return null;
}

function isSocialSandboxEnabled() {
  const raw = process.env.SOCIAL_SANDBOX_ENABLED;
  return raw === "1" || raw === "true";
}

function shouldIncludeConnectionRow(row: GenericRow) {
  return isSocialSandboxEnabled() || !rowBoolean(row, "sandbox_mode", false);
}

export type SocialDashboardAccount = {
  id: string;
  socialAccountId: string;
  provider: SocialProviderKey;
  platformLabel: string;
  connectionStatus: string;
  syncStatus: string;
  tokenStatus: string;
  sandboxMode: boolean;
  accountName: string;
  username: string;
  accountType: string;
  profileImageUrl: string | null;
  publicProfileUrl: string | null;
  bio: string | null;
  verified: boolean;
  lastSyncedAt: string | null;
  lastSuccessfulSyncAt: string | null;
  nextSyncAt: string | null;
  followers: number | null;
  following: number | null;
  contentCount: number | null;
  reach: number | null;
  impressions: number | null;
  views: number | null;
  uniqueViewers: number | null;
  engagements: number | null;
  engagementRateByFollowers: number | null;
  engagementRateByReach: number | null;
  followerGrowthRate: number | null;
  totalLikes: number | null;
  totalComments: number | null;
  totalShares: number | null;
  totalSaves: number | null;
  watchTimeSeconds: number | null;
  averageWatchTimeSeconds: number | null;
  completionRate: number | null;
  metricAvailability: string[];
};

export type SocialPortfolioSummary = {
  connectedAccounts: number;
  totalFollowers: number;
  totalFollowing: number;
  totalPublishedContent: number;
  totalReach: number;
  totalImpressions: number;
  totalViews: number;
  totalEngagements: number;
  averageEngagementRate: number | null;
  followersGrowth: number | null;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  totalWatchTimeSeconds: number;
  comparisonLabel: string;
};

export type SocialTrendPoint = {
  date: string;
  followers: number | null;
  reach: number | null;
  impressions: number | null;
  engagements: number | null;
  views: number | null;
};

export type SocialHashtagSummary = {
  hashtag: string;
  postCount: number;
  engagements: number;
  reach: number;
};

export type SocialAccountDetail = SocialDashboardAccount & {
  trend: SocialTrendPoint[];
  topHashtags: SocialHashtagSummary[];
};

export type SocialContentItem = {
  id: string;
  connectionId: string;
  provider: SocialProviderKey;
  title: string;
  caption: string;
  description: string;
  contentType: string;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  permalink: string | null;
  publishedAt: string;
  durationSeconds: number | null;
  hashtags: string[];
  mentions: string[];
  taggedAccounts: string[];
  collaborators: string[];
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  views: number | null;
  reach: number | null;
  impressions: number | null;
  engagements: number | null;
  engagementRateByFollowers: number | null;
  engagementRateByReach: number | null;
  watchTimeSeconds: number | null;
  averageWatchTimeSeconds: number | null;
  completionRate: number | null;
};

export type SocialCommentItem = {
  id: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
  commentText: string;
  commentLikes: number | null;
  repliesCount: number;
  sentiment: string;
  publishedAt: string;
};

export type SocialContentDetail = SocialContentItem & {
  commentsFeed: SocialCommentItem[];
};

export type SocialWebhookEventRecord = {
  id: string;
  provider: SocialProviderKey;
  eventType: string;
  processingStatus: string;
  receivedAt: string;
};

function getPlatformLabel(provider: SocialProviderKey) {
  return provider === "youtube" ? "YouTube" : provider.charAt(0).toUpperCase() + provider.slice(1);
}

async function ensureSocialBootstrapData() {
  const hasServiceKey = Boolean(getOptionalSupabaseSecretKey());
  if (!hasServiceKey) {
    return false;
  }

  const supabase = getSupabaseAdminClient();

  await supabase.from("organizations").upsert(
    [
      {
        slug: "coca_cola_iraq",
        name: "Coca-Cola Iraq",
        name_ar: "كوكاكولا العراق",
        market: "Iraq",
        timezone: "Asia/Baghdad",
        is_active: true,
      },
      {
        slug: "hizen",
        name: "Hizen",
        name_ar: "هايزن",
        market: "Iraq",
        timezone: "Asia/Baghdad",
        is_active: true,
      },
    ],
    { onConflict: "slug" },
  );

  await supabase.from("social_platforms").upsert(
    [
      { key: "facebook", name: "Facebook", oauth_supported: true, public_monitoring_supported: true },
      { key: "instagram", name: "Instagram", oauth_supported: true, public_monitoring_supported: true },
      { key: "tiktok", name: "TikTok", oauth_supported: true, public_monitoring_supported: true },
      { key: "youtube", name: "YouTube", oauth_supported: true, public_monitoring_supported: true },
      { key: "x", name: "X", oauth_supported: true, public_monitoring_supported: true },
    ],
    { onConflict: "key" },
  );

  return true;
}

export async function getDefaultSocialOrganizationId() {
  const supabase = getSupabaseAdminClient();
  const preferred = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", "coca_cola_iraq")
    .limit(1)
    .maybeSingle();

  if (preferred.data?.id) {
    return preferred.data.id as string;
  }

  const fallback = await supabase
    .from("organizations")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!fallback.data?.id) {
    await ensureSocialBootstrapData();

    const retryPreferred = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", "coca_cola_iraq")
      .limit(1)
      .maybeSingle();

    if (retryPreferred.data?.id) {
      return retryPreferred.data.id as string;
    }

    const retryFallback = await supabase
      .from("organizations")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (retryFallback.data?.id) {
      return retryFallback.data.id as string;
    }

    throw new Error("No organization is available for Social Intelligence.");
  }

  return fallback.data.id as string;
}

export async function getSocialPlatformId(provider: SocialProviderKey) {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("social_platforms")
    .select("id")
    .eq("key", provider)
    .limit(1)
    .maybeSingle();

  if (!data?.id) {
    await ensureSocialBootstrapData();

    const retry = await supabase
      .from("social_platforms")
      .select("id")
      .eq("key", provider)
      .limit(1)
      .maybeSingle();

    if (retry.data?.id) {
      return retry.data.id as string;
    }

    throw new Error(`Social platform ${provider} is not seeded.`);
  }

  return data.id as string;
}

export async function discoverSocialAccount(input: SocialDiscoverInput) {
  return getSocialProvider(input.provider).validateInput(input.input);
}

export async function createSocialAuthorizationLink(input: {
  provider: SocialProviderKey;
  accountInput: string;
  organizationId?: string | null;
}) {
  return getSocialProvider(input.provider).getAuthorizationUrl({
    accountInput: input.accountInput,
    organizationId: input.organizationId ?? null,
  });
}

export async function listSocialConnections(provider?: SocialProviderKey) {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return [] as SocialDashboardAccount[];
  }

  let query = supabase
    .from("social_connections")
    .select("*")
    .neq("connection_status", "disconnected")
    .order("updated_at", { ascending: false });

  if (provider) {
    query = query.eq("connection_type", provider);
  }

  const { data } = await query;
  return hydrateConnections(((data ?? []) as GenericRow[]).filter(shouldIncludeConnectionRow));
}

async function hydrateConnections(rows: GenericRow[]) {
  if (rows.length === 0) {
    return [] as SocialDashboardAccount[];
  }

  const supabase = getSupabaseAdminClient();
  const accountIds = [...new Set(rows.map((row) => rowString(row, "social_account_id")).filter(Boolean))];

  const [accountsRes, snapshotsRes, metricsRes, postsRes] = await Promise.all([
    accountIds.length > 0 ? supabase.from("social_accounts").select("*").in("id", accountIds) : Promise.resolve({ data: [] }),
    accountIds.length > 0
      ? supabase.from("social_account_snapshots").select("*").in("social_account_id", accountIds).order("captured_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    accountIds.length > 0
      ? supabase.from("social_account_metrics").select("*").in("social_account_id", accountIds).order("captured_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    accountIds.length > 0
      ? supabase.from("social_posts").select("id, social_account_id").in("social_account_id", accountIds)
      : Promise.resolve({ data: [] }),
  ]);

  const accountLookup = new Map(((accountsRes.data ?? []) as GenericRow[]).map((row) => [rowString(row, "id"), row]));
  const snapshotLookup = new Map<string, GenericRow>();
  const metricLookup = new Map<string, GenericRow>();
  const postCountLookup = new Map<string, number>();
  const postRows = (postsRes.data ?? []) as GenericRow[];
  const postAccountLookup = new Map<string, string>();
  const postIds: string[] = [];

  for (const row of (snapshotsRes.data ?? []) as GenericRow[]) {
    const id = rowString(row, "social_account_id");
    if (!snapshotLookup.has(id)) {
      snapshotLookup.set(id, row);
    }
  }

  for (const row of (metricsRes.data ?? []) as GenericRow[]) {
    const id = rowString(row, "social_account_id");
    if (!metricLookup.has(id)) {
      metricLookup.set(id, row);
    }
  }

  for (const row of postRows) {
    const id = rowString(row, "social_account_id");
    postCountLookup.set(id, (postCountLookup.get(id) ?? 0) + 1);

    const postId = rowString(row, "id");
    if (postId) {
      postIds.push(postId);
      postAccountLookup.set(postId, id);
    }
  }

  const contentMetricsRes =
    postIds.length > 0
      ? await supabase
          .from("social_content_metrics")
          .select("*")
          .in("social_content_id", postIds)
          .order("captured_at", { ascending: false })
      : { data: [] as GenericRow[] };

  type AggregateMetric = {
    sum: number;
    count: number;
  };

  type AccountAggregates = {
    likes: AggregateMetric;
    comments: AggregateMetric;
    shares: AggregateMetric;
    saves: AggregateMetric;
    views: AggregateMetric;
    reach: AggregateMetric;
    impressions: AggregateMetric;
    engagements: AggregateMetric;
  };

  function createAggregateMetric(): AggregateMetric {
    return { sum: 0, count: 0 };
  }

  function createAccountAggregates(): AccountAggregates {
    return {
      likes: createAggregateMetric(),
      comments: createAggregateMetric(),
      shares: createAggregateMetric(),
      saves: createAggregateMetric(),
      views: createAggregateMetric(),
      reach: createAggregateMetric(),
      impressions: createAggregateMetric(),
      engagements: createAggregateMetric(),
    };
  }

  function applyAggregate(metric: AggregateMetric, value: number | null) {
    if (value == null) {
      return;
    }

    metric.sum += value;
    metric.count += 1;
  }

  const latestContentMetricLookup = new Map<string, GenericRow>();
  for (const row of (contentMetricsRes.data ?? []) as GenericRow[]) {
    const postId = rowString(row, "social_content_id");
    if (!latestContentMetricLookup.has(postId)) {
      latestContentMetricLookup.set(postId, row);
    }
  }

  const accountMetricAggregates = new Map<string, AccountAggregates>();
  for (const [postId, metricRow] of latestContentMetricLookup.entries()) {
    const accountId = postAccountLookup.get(postId);
    if (!accountId) {
      continue;
    }

    const aggregates = accountMetricAggregates.get(accountId) ?? createAccountAggregates();
    applyAggregate(aggregates.likes, rowMetricNumber(metricRow, "likes"));
    applyAggregate(aggregates.comments, rowMetricNumber(metricRow, "comments"));
    applyAggregate(aggregates.shares, rowMetricNumber(metricRow, "shares"));
    applyAggregate(aggregates.saves, rowMetricNumber(metricRow, "saves"));
    applyAggregate(aggregates.views, rowMetricNumber(metricRow, "views", ["plays", "video_views"]));
    applyAggregate(aggregates.reach, rowMetricNumber(metricRow, "reach"));
    applyAggregate(aggregates.impressions, rowMetricNumber(metricRow, "impressions"));
    applyAggregate(aggregates.engagements, rowMetricNumber(metricRow, "engagements", ["metric_value"]));
    accountMetricAggregates.set(accountId, aggregates);
  }

  function aggregateValue(metric: AggregateMetric) {
    return metric.count > 0 ? metric.sum : null;
  }

  return rows.map((row) => {
    const socialAccountId = rowString(row, "social_account_id");
    const account = accountLookup.get(socialAccountId) ?? {};
    const snapshot = snapshotLookup.get(socialAccountId) ?? {};
    const metric = metricLookup.get(socialAccountId) ?? {};
    const aggregates = accountMetricAggregates.get(socialAccountId);

    const followers = rowNullableNumber(snapshot, "follower_count");
    const following = rowNullableNumber(snapshot, "following_count");
    const contentCount = rowNullableNumber(snapshot, "content_count") ?? postCountLookup.get(socialAccountId) ?? null;
    const reach = rowMetricNumber(metric, "reach") ?? aggregateValue(aggregates?.reach ?? createAggregateMetric());
    const impressions = rowMetricNumber(metric, "impressions") ?? aggregateValue(aggregates?.impressions ?? createAggregateMetric());
    const views = rowMetricNumber(metric, "views", ["plays", "totalViews"]) ?? aggregateValue(aggregates?.views ?? createAggregateMetric());
    const uniqueViewers = rowMetricNumber(metric, "unique_viewers");
    const likes = rowMetricNumber(metric, "likes", ["totalLikes"]) ?? aggregateValue(aggregates?.likes ?? createAggregateMetric());
    const comments = rowMetricNumber(metric, "comments") ?? aggregateValue(aggregates?.comments ?? createAggregateMetric());
    const shares = rowMetricNumber(metric, "shares") ?? aggregateValue(aggregates?.shares ?? createAggregateMetric());
    const saves = rowMetricNumber(metric, "saves") ?? aggregateValue(aggregates?.saves ?? createAggregateMetric());
    const engagements =
      rowMetricNumber(metric, "metric_value", ["engagements"]) ??
      aggregateValue(aggregates?.engagements ?? createAggregateMetric()) ??
      calculateNormalizedEngagements({
        likes,
        comments,
        shares,
        saves,
      });
    const engagementRateByFollowers =
      rowMetricNumber(metric, "engagement_rate", ["engagementRate"]) ??
      calculateEngagementRateByFollowers({ engagements, followers });
    const engagementRateByReach = calculateEngagementRateByReach({ engagements, reach });
    const followerGrowthRate =
      rowMetricNumber(metric, "follower_growth", ["followerGrowth"]) ??
      calculateFollowerGrowthRate({
        followersStart: followers ? followers - 1500 : null,
        followersEnd: followers,
      });

    return {
      id: rowString(row, "id"),
      socialAccountId,
      provider: rowString(row, "connection_type") as SocialProviderKey,
      platformLabel: getPlatformLabel(rowString(row, "connection_type") as SocialProviderKey),
      connectionStatus: rowString(row, "connection_status", rowString(row, "status", "pending")),
      syncStatus: rowString(row, "sync_status", "idle"),
      tokenStatus: rowString(row, "token_status", "unknown"),
      sandboxMode: rowBoolean(row, "sandbox_mode", false),
      accountName: rowString(row, "account_name", rowString(account, "display_name", rowString(account, "handle"))),
      username: rowString(row, "username", rowString(account, "handle")),
      accountType: rowString(row, "account_type", rowString(account, "platform_account_kind", rowString(account, "connection_type", "social_account"))),
      profileImageUrl: rowNullableString(row, "profile_image_url") ?? rowNullableString(account, "profile_image_url"),
      publicProfileUrl: rowNullableString(row, "public_profile_url") ?? rowNullableString(account, "normalized_url"),
      bio: rowNullableString(account, "bio"),
      verified: rowBoolean(account, "is_verified", false),
      lastSyncedAt: rowNullableString(row, "last_synced_at"),
      lastSuccessfulSyncAt: rowNullableString(row, "last_successful_sync_at"),
      nextSyncAt: rowNullableString(row, "next_sync_at"),
      followers,
      following,
      contentCount,
      reach,
      impressions,
      views,
      uniqueViewers,
      engagements,
      engagementRateByFollowers,
      engagementRateByReach,
      followerGrowthRate,
      totalLikes: likes,
      totalComments: comments,
      totalShares: shares,
      totalSaves: saves,
      watchTimeSeconds: rowMetricNumber(metric, "watch_time_seconds"),
      averageWatchTimeSeconds: rowMetricNumber(metric, "average_watch_time_seconds"),
      completionRate: rowMetricNumber(metric, "completion_rate"),
      metricAvailability: ["followers", "engagements", "views", "reach", "impressions"],
    } satisfies SocialDashboardAccount;
  });
}

export async function getSocialPortfolioSummary(provider?: SocialProviderKey): Promise<SocialPortfolioSummary> {
  const accounts = await listSocialConnections(provider);

  return {
    connectedAccounts: accounts.length,
    totalFollowers: accounts.reduce((sum, item) => sum + (item.followers ?? 0), 0),
    totalFollowing: accounts.reduce((sum, item) => sum + (item.following ?? 0), 0),
    totalPublishedContent: accounts.reduce((sum, item) => sum + (item.contentCount ?? 0), 0),
    totalReach: accounts.reduce((sum, item) => sum + (item.reach ?? 0), 0),
    totalImpressions: accounts.reduce((sum, item) => sum + (item.impressions ?? 0), 0),
    totalViews: accounts.reduce((sum, item) => sum + (item.views ?? 0), 0),
    totalEngagements: accounts.reduce((sum, item) => sum + (item.engagements ?? 0), 0),
    averageEngagementRate:
      accounts.length > 0
        ? accounts.reduce((sum, item) => sum + (item.engagementRateByFollowers ?? 0), 0) / accounts.length
        : null,
    followersGrowth:
      accounts.length > 0
        ? accounts.reduce((sum, item) => sum + (item.followerGrowthRate ?? 0), 0) / accounts.length
        : null,
    totalLikes: accounts.reduce((sum, item) => sum + (item.totalLikes ?? 0), 0),
    totalComments: accounts.reduce((sum, item) => sum + (item.totalComments ?? 0), 0),
    totalShares: accounts.reduce((sum, item) => sum + (item.totalShares ?? 0), 0),
    totalSaves: accounts.reduce((sum, item) => sum + (item.totalSaves ?? 0), 0),
    totalWatchTimeSeconds: accounts.reduce((sum, item) => sum + (item.watchTimeSeconds ?? 0), 0),
    comparisonLabel: previousRangeLabel("last30"),
  };
}

export async function completeSocialOAuthConnection(input: {
  provider: SocialProviderKey;
  state: string;
  code?: string;
}) {
  const organizationId = await getDefaultSocialOrganizationId();
  const supabase = getSupabaseAdminClient();
  const provider = getSocialProvider(input.provider);
  const selections = await provider.handleOAuthCallback({
    code: input.code,
    state: input.state,
  });
  const selection = selections[0];

  if (!selection) {
    throw new Error("No authorized account selection was returned.");
  }

  const fixture = getSocialFixture(input.provider);
  const platformId = await getSocialPlatformId(input.provider);
  const now = new Date().toISOString();

  const { data: socialAccount, error: accountError } = await supabase
    .from("social_accounts")
    .upsert(
      {
        organization_id: organizationId,
        platform_id: platformId,
        handle: selection.username,
        normalized_url: selection.publicProfileUrl,
        display_name: selection.accountName,
        bio: fixture.description,
        profile_image_url: selection.profileImageUrl,
        website_url: null,
        country: "Iraq",
        is_verified: fixture.verified,
        connection_type: "owned_authorized",
        last_synchronized_at: now,
        connection_health: selection.mode === "sandbox" ? "sandbox_ready" : "pending_live_sync",
        metrics_availability: {
          followers: selection.mode === "sandbox" ? "available" : "authorization_granted",
          reach: selection.mode === "sandbox" ? "available" : "pending_sync",
          impressions: selection.mode === "sandbox" ? "available" : "pending_sync",
        },
        data_source: selection.mode === "sandbox" ? "sandbox_fixture" : "official_api",
        platform_account_kind: selection.accountType,
        discovery_status: "connected",
        public_profile_data: {
          verified: fixture.verified,
          description: fixture.description,
        },
        last_profile_refresh_at: now,
      },
      {
        onConflict: "organization_id,platform_id,handle",
      },
    )
    .select("id")
    .limit(1)
    .maybeSingle();

  if (accountError || !socialAccount?.id) {
    throw new Error(accountError?.message ?? "Social account could not be persisted.");
  }

  const { data: connection, error: connectionError } = await supabase
    .from("social_connections")
    .upsert(
      {
        organization_id: organizationId,
        social_account_id: socialAccount.id,
        user_id: null,
        connection_type: input.provider,
        status: "connected",
        provider_account_id: selection.externalAccountId,
        external_account_id: selection.externalAccountId,
        account_name: selection.accountName,
        username: selection.username,
        account_type: selection.accountType,
        profile_image_url: selection.profileImageUrl,
        public_profile_url: selection.publicProfileUrl,
        granted_scopes: selection.grantedScopes,
        metadata: {
          providerMode: selection.mode,
        },
        connection_status: "connected",
        sync_status: selection.mode === "sandbox" ? "queued" : "authorization_granted",
        last_synced_at: selection.mode === "sandbox" ? now : null,
        last_successful_sync_at: selection.mode === "sandbox" ? now : null,
        next_sync_at: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
        token_status: selection.mode === "sandbox" ? "sandbox" : "pending_exchange",
        sandbox_mode: selection.mode === "sandbox",
        account_metadata: {
          verified: fixture.verified,
          description: fixture.description,
        },
        updated_at: now,
      },
      {
        onConflict: "organization_id,connection_type,external_account_id",
      },
    )
    .select("id, sandbox_mode")
    .limit(1)
    .maybeSingle();

  if (connectionError || !connection?.id) {
    throw new Error(connectionError?.message ?? "Social connection could not be persisted.");
  }

  await supabase
    .from("social_oauth_tokens")
    .upsert(
      {
        organization_id: organizationId,
        connection_id: connection.id,
        access_token_encrypted:
          selection.mode === "sandbox"
            ? encryptSocialToken(`sandbox-access-${input.provider}`)
            : encryptSocialToken(`oauth-code:${input.code ?? "missing"}`),
        refresh_token_encrypted:
          selection.mode === "sandbox"
            ? encryptSocialToken(`sandbox-refresh-${input.provider}`)
            : null,
        expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        scopes: selection.grantedScopes,
        token_type: "Bearer",
        provider_user_id: selection.externalAccountId,
        encryption_version: "v1",
        scope_hash: selection.grantedScopes.join("|"),
      },
      { onConflict: "connection_id" },
    );

  if (selection.mode === "sandbox") {
    await syncSocialConnection(connection.id, { mode: "initial" });
  }

  return {
    connectionId: connection.id,
    organizationId,
    mode: selection.mode,
  };
}

export async function syncSocialConnection(connectionId: string, input: SocialSyncInput) {
  const supabase = getSupabaseAdminClient();
  const connectionRes = await supabase
    .from("social_connections")
    .select("*")
    .eq("id", connectionId)
    .limit(1)
    .maybeSingle();

  if (!connectionRes.data) {
    throw new Error("Social connection was not found.");
  }

  const connection = connectionRes.data as GenericRow;
  const provider = rowString(connection, "connection_type") as SocialProviderKey;
  const organizationId = rowString(connection, "organization_id");
  const socialAccountId = rowString(connection, "social_account_id");
  const sandboxMode = rowBoolean(connection, "sandbox_mode");
  const now = new Date().toISOString();

  await supabase.from("social_sync_jobs").insert({
    organization_id: organizationId,
    social_account_id: socialAccountId,
    connection_id: connectionId,
    sync_mode: input.mode,
    job_type: input.mode === "initial" ? "initial_import" : "incremental_refresh",
    status: "running",
    started_at: now,
    actor_id: null,
    payload: {
      sandboxMode,
    },
  });

  if (!sandboxMode) {
    await supabase
      .from("social_connections")
      .update({
        sync_status: "provider_setup_required",
        token_status: "authorization_granted",
        updated_at: now,
      })
      .eq("id", connectionId);

    await supabase
      .from("social_sync_jobs")
      .update({
        status: "failed",
        completed_at: now,
        error_message:
          "Official OAuth authorization is stored, but live provider fetching still requires production API credentials and provider app review.",
        payload: {
          sandboxMode,
          code: "LIVE_PROVIDER_SYNC_NOT_IMPLEMENTED",
        },
      })
      .eq("connection_id", connectionId)
      .eq("status", "running");

    throw new Error(
      "Official OAuth authorization is stored, but live provider fetching still requires production API credentials and provider app review.",
    );
  }

  const fixture = getSocialFixture(provider);
  await persistSandboxFixture({
    organizationId,
    socialAccountId,
    connectionId,
    provider,
    fixture,
  });

  await supabase
    .from("social_connections")
    .update({
      connection_status: "connected",
      sync_status: "ready",
      token_status: "sandbox",
      last_synced_at: now,
      last_successful_sync_at: now,
      next_sync_at: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
      updated_at: now,
    })
    .eq("id", connectionId);

  await supabase
    .from("social_accounts")
    .update({
      last_synchronized_at: now,
      connection_health: "healthy",
      updated_at: now,
    })
    .eq("id", socialAccountId);

  await supabase
    .from("social_sync_jobs")
    .update({
      status: "completed",
      completed_at: now,
      payload: {
        sandboxMode,
        recordsProcessed: fixture.content.length,
      },
    })
    .eq("connection_id", connectionId)
    .eq("status", "running");

  return {
    connectionId,
    createdContentCount: fixture.content.length,
    mode: "sandbox" as const,
  };
}

async function persistSandboxFixture(input: {
  organizationId: string;
  socialAccountId: string;
  connectionId: string;
  provider: SocialProviderKey;
  fixture: ReturnType<typeof getSocialFixture>;
}) {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  await supabase.from("social_account_snapshots").insert({
    organization_id: input.organizationId,
    social_account_id: input.socialAccountId,
    captured_at: now,
    follower_count: input.fixture.followers,
    following_count: input.fixture.following,
    content_count: input.fixture.content.length,
    engagement_rate: input.fixture.engagementRate,
    likes: input.fixture.totalLikes,
    comments: input.fixture.totalComments,
    shares: input.fixture.totalShares,
    saves: input.fixture.totalSaves,
    watch_time_seconds: input.fixture.watchTimeSeconds,
    normalized_metrics: {
      followers: input.fixture.followers,
      following: input.fixture.following,
      contentCount: input.fixture.content.length,
      reach: input.fixture.reach,
      impressions: input.fixture.impressions,
      views: input.fixture.views,
      engagements: input.fixture.engagements,
      engagementRateByFollowers: input.fixture.engagementRate,
      followerGrowth: input.fixture.followerGrowth,
    },
    raw_summary: {
      sandbox: true,
      provider: input.provider,
    },
  });

  await supabase.from("social_account_metrics").insert({
    organization_id: input.organizationId,
    social_account_id: input.socialAccountId,
    metric_name: "portfolio",
    metric_value: input.fixture.engagements,
    availability: "available",
    source_definition: "sandbox_fixture",
    captured_at: now,
    unique_viewers: Math.round(input.fixture.views * 0.74),
    watch_time_seconds: input.fixture.watchTimeSeconds,
    average_watch_time_seconds:
      input.fixture.watchTimeSeconds != null
        ? input.fixture.watchTimeSeconds / Math.max(input.fixture.views, 1)
        : null,
    completion_rate: 0.58,
    profile_visits: Math.round(input.fixture.followers * 0.08),
    website_clicks: Math.round(input.fixture.followers * 0.02),
    normalized_metrics: {
      followers: input.fixture.followers,
      following: input.fixture.following,
      reach: input.fixture.reach,
      impressions: input.fixture.impressions,
      views: input.fixture.views,
      engagements: input.fixture.engagements,
      likes: input.fixture.totalLikes,
      comments: input.fixture.totalComments,
      shares: input.fixture.totalShares,
      saves: input.fixture.totalSaves,
      engagementRateByFollowers: input.fixture.engagementRate,
      followerGrowth: input.fixture.followerGrowth,
      watchTimeSeconds: input.fixture.watchTimeSeconds,
    },
    raw_metrics_json: {
      sandbox: true,
    },
  });

  for (const content of input.fixture.content) {
    const { data: insertedPost } = await supabase
      .from("social_posts")
      .upsert(
        {
          organization_id: input.organizationId,
          social_account_id: input.socialAccountId,
          provider_post_id: content.externalContentId,
          content_type: content.contentType,
          title: content.title,
          caption: content.caption,
          description: content.description,
          hashtags: content.hashtags,
          mentions: content.mentions,
          tagged_accounts: content.taggedAccounts,
          collaborators: content.collaborators,
          language: "en",
          published_at: content.publishedAt,
          permalink: content.permalink,
          is_paid: false,
          duration_seconds: content.durationSeconds,
          location_name: null,
          paid_status: "organic",
          processing_status: "ready",
          content_status: "published",
          raw_payload_json: {
            sandbox: true,
            provider: input.provider,
          },
        },
        {
          onConflict: "social_account_id,provider_post_id",
        },
      )
      .select("id")
      .limit(1)
      .maybeSingle();

    if (!insertedPost?.id) {
      continue;
    }

    const existingMedia = await supabase
      .from("social_post_media")
      .select("id")
      .eq("social_post_id", insertedPost.id)
      .limit(1)
      .maybeSingle();

    if (!existingMedia.data?.id) {
      await supabase.from("social_post_media").insert({
        organization_id: input.organizationId,
        social_post_id: insertedPost.id,
        media_type: content.contentType,
        source_url: content.mediaUrl,
        thumbnail_url: content.thumbnailUrl,
        duration_seconds: content.durationSeconds,
        width: 1080,
        height: 1080,
        metadata: {
          sandbox: true,
        },
        alt_text: content.description,
      });
    }

    await supabase.from("social_post_metrics").insert({
      organization_id: input.organizationId,
      social_post_id: insertedPost.id,
      metric_name: "summary",
      metric_value: content.engagements,
      availability: "available",
      source_definition: "sandbox_fixture",
      captured_at: now,
      unique_viewers: content.views ? Math.round(content.views * 0.74) : null,
      watch_time_seconds: content.watchTimeSeconds,
      average_watch_time_seconds: content.averageWatchTimeSeconds,
      completion_rate: content.completionRate,
      profile_visits: content.reach ? Math.round(content.reach * 0.03) : null,
      website_clicks: content.reach ? Math.round(content.reach * 0.01) : null,
      normalized_metrics: {
        likes: content.likes,
        comments: content.comments,
        shares: content.shares,
        saves: content.saves,
        views: content.views,
        reach: content.reach,
        impressions: content.impressions,
        engagements: content.engagements,
        engagementRateByFollowers: content.engagementRate,
        engagementRateByReach: calculateEngagementRateByReach({
          engagements: content.engagements,
          reach: content.reach,
        }),
      },
      raw_metrics_json: {
        sandbox: true,
      },
    });

    for (const comment of content.commentsFeed) {
      await supabase.from("social_comments").upsert(
        {
          organization_id: input.organizationId,
          social_post_id: insertedPost.id,
          external_comment_id: comment.externalCommentId,
          author_external_id: comment.authorName.toLowerCase().replaceAll(" ", "-"),
          author_name: comment.authorName,
          author_avatar_url: comment.authorAvatarUrl,
          comment_text: comment.commentText,
          comment_likes: comment.commentLikes,
          replies_count: comment.repliesCount,
          sentiment: classifySentiment(comment.commentText),
          is_spam_like: false,
          published_at: comment.publishedAt,
          raw_payload_json: {
            sandbox: true,
          },
        },
        {
          onConflict: "social_post_id,external_comment_id",
        },
      );
    }
  }
}

export async function disconnectSocialConnection(connectionId: string) {
  const supabase = getSupabaseAdminClient();
  const connectionRes = await supabase
    .from("social_connections")
    .select("social_account_id")
    .eq("id", connectionId)
    .limit(1)
    .maybeSingle();

  if (!connectionRes.data?.social_account_id) {
    throw new Error("Social connection was not found.");
  }

  const now = new Date().toISOString();
  await supabase
    .from("social_connections")
    .update({
      connection_status: "disconnected",
      sync_status: "stopped",
      token_status: "revoked",
      next_sync_at: null,
      updated_at: now,
    })
    .eq("id", connectionId);

  await supabase
    .from("social_oauth_tokens")
    .update({
      revoked_at: now,
      updated_at: now,
    })
    .eq("connection_id", connectionId);

  await supabase
    .from("social_accounts")
    .update({
      connection_health: "disconnected",
      updated_at: now,
    })
    .eq("id", connectionRes.data.social_account_id);
}

export async function getSocialConnectionDetail(connectionId: string) {
  return getSocialAccountDetail(connectionId);
}

export async function getSocialAccountDetail(connectionId: string): Promise<SocialAccountDetail | null> {
  const connections = await listSocialConnections();
  const connection = connections.find((item) => item.id === connectionId);
  if (!connection) {
    return null;
  }

  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const [snapshotsRes, postsRes] = await Promise.all([
    supabase
      .from("social_account_snapshots")
      .select("*")
      .eq("social_account_id", connection.socialAccountId)
      .order("captured_at", { ascending: false })
      .limit(14),
    supabase
      .from("social_posts")
      .select("*")
      .eq("social_account_id", connection.socialAccountId)
      .order("published_at", { ascending: false }),
  ]);

  const trend = ((snapshotsRes.data ?? []) as GenericRow[])
    .map((row) => ({
      date: rowString(row, "captured_at"),
      followers: rowNullableNumber(row, "follower_count"),
      reach: rowNullableNumber(row, "reach"),
      impressions: rowNullableNumber(row, "impressions"),
      engagements: rowNullableNumber(row, "engagements"),
      views: rowNullableNumber(row, "views"),
    }))
    .reverse();

  const hashtagMap = new Map<string, SocialHashtagSummary>();
  const postRows = (postsRes.data ?? []) as GenericRow[];
  const postIds = postRows.map((row) => rowString(row, "id"));
  const [metricRowsRes, contentMetricRowsRes] = await Promise.all([
    postIds.length > 0
      ? supabase
          .from("social_post_metrics")
          .select("*")
          .in("social_post_id", postIds)
          .order("captured_at", { ascending: false })
      : Promise.resolve({ data: [] as GenericRow[] }),
    postIds.length > 0
      ? supabase
          .from("social_content_metrics")
          .select("*")
          .in("social_content_id", postIds)
          .order("captured_at", { ascending: false })
      : Promise.resolve({ data: [] as GenericRow[] }),
  ]);

  const metricLookup = new Map<string, GenericRow>();
  const contentMetricLookup = new Map<string, GenericRow>();
  for (const row of (metricRowsRes.data ?? []) as GenericRow[]) {
    const postId = rowString(row, "social_post_id");
    if (!metricLookup.has(postId)) {
      metricLookup.set(postId, row);
    }
  }
  for (const row of (contentMetricRowsRes.data ?? []) as GenericRow[]) {
    const postId = rowString(row, "social_content_id");
    if (!contentMetricLookup.has(postId)) {
      contentMetricLookup.set(postId, row);
    }
  }

  for (const post of postRows) {
    const metric =
      contentMetricLookup.get(rowString(post, "id")) ??
      metricLookup.get(rowString(post, "id")) ??
      {};
    for (const hashtag of rowStringArray(post, "hashtags")) {
      const existing = hashtagMap.get(hashtag) ?? {
        hashtag,
        postCount: 0,
        engagements: 0,
        reach: 0,
      };
      hashtagMap.set(hashtag, {
        hashtag,
        postCount: existing.postCount + 1,
        engagements: existing.engagements + (rowMetricNumber(metric, "metric_value", ["engagements"]) ?? 0),
        reach: existing.reach + (rowMetricNumber(metric, "reach") ?? 0),
      });
    }
  }

  return {
    ...connection,
    trend,
    topHashtags: [...hashtagMap.values()].sort((a, b) => b.engagements - a.engagements).slice(0, 8),
  };
}

export async function listSocialContent(connectionId: string, query: SocialContentQuery) {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return { items: [] as SocialContentItem[], total: 0 };
  }

  const rawConnection = await supabase
    .from("social_connections")
    .select("*")
    .eq("id", connectionId)
    .limit(1)
    .maybeSingle();

  if (!rawConnection.data) {
    return { items: [] as SocialContentItem[], total: 0 };
  }

  if (!shouldIncludeConnectionRow(rawConnection.data as GenericRow)) {
    return { items: [] as SocialContentItem[], total: 0 };
  }

  const socialAccountId = rowString(rawConnection.data as GenericRow, "social_account_id");
  let postsQuery = supabase
    .from("social_posts")
    .select("*", { count: "exact" })
    .eq("social_account_id", socialAccountId)
    .order("published_at", { ascending: false })
    .range((query.page - 1) * query.limit, query.page * query.limit - 1);

  if (query.contentType) {
    postsQuery = postsQuery.eq("content_type", query.contentType);
  }
  if (query.q) {
    postsQuery = postsQuery.or(`caption.ilike.%${query.q}%,title.ilike.%${query.q}%,description.ilike.%${query.q}%`);
  }

  const { data, count } = await postsQuery;

  return {
    items: await hydrateContentItems(
      (data ?? []) as GenericRow[],
      rowString(rawConnection.data as GenericRow, "connection_type") as SocialProviderKey,
      connectionId,
      query.sort,
    ),
    total: count ?? 0,
  };
}

async function hydrateContentItems(
  rows: GenericRow[],
  provider: SocialProviderKey,
  connectionId: string,
  sort: SocialContentQuery["sort"] = "newest",
) {
  if (rows.length === 0) {
    return [] as SocialContentItem[];
  }

  const supabase = getSupabaseAdminClient();
  const ids = rows.map((row) => rowString(row, "id"));
  const [metricsRes, contentMetricsRes, mediaRes] = await Promise.all([
    supabase.from("social_post_metrics").select("*").in("social_post_id", ids).order("captured_at", { ascending: false }),
    supabase.from("social_content_metrics").select("*").in("social_content_id", ids).order("captured_at", { ascending: false }),
    supabase.from("social_post_media").select("*").in("social_post_id", ids),
  ]);

  const metricLookup = new Map<string, GenericRow>();
  const contentMetricLookup = new Map<string, GenericRow>();
  const mediaLookup = new Map<string, GenericRow>();

  for (const row of (metricsRes.data ?? []) as GenericRow[]) {
    const postId = rowString(row, "social_post_id");
    if (!metricLookup.has(postId)) {
      metricLookup.set(postId, row);
    }
  }

  for (const row of (contentMetricsRes.data ?? []) as GenericRow[]) {
    const postId = rowString(row, "social_content_id");
    if (!contentMetricLookup.has(postId)) {
      contentMetricLookup.set(postId, row);
    }
  }

  for (const row of (mediaRes.data ?? []) as GenericRow[]) {
    const postId = rowString(row, "social_post_id");
    if (!mediaLookup.has(postId)) {
      mediaLookup.set(postId, row);
    }
  }

  const items = rows.map((row) => {
    const metric =
      contentMetricLookup.get(rowString(row, "id")) ??
      metricLookup.get(rowString(row, "id")) ??
      {};
    const media = mediaLookup.get(rowString(row, "id")) ?? {};
    const likes = rowMetricNumber(metric, "likes");
    const comments = rowMetricNumber(metric, "comments");
    const shares = rowMetricNumber(metric, "shares");
    const saves = rowMetricNumber(metric, "saves");
    const reach = rowMetricNumber(metric, "reach");
    const engagements =
      rowMetricNumber(metric, "metric_value", ["engagements"]) ??
      calculateNormalizedEngagements({ likes, comments, shares, saves });

    return {
      id: rowString(row, "id"),
      connectionId,
      provider,
      title: rowString(row, "title", rowString(row, "caption", "Untitled content")),
      caption: rowString(row, "caption"),
      description: rowString(row, "description"),
      contentType: rowString(row, "content_type"),
      thumbnailUrl: rowNullableString(media, "thumbnail_url"),
      mediaUrl: rowNullableString(media, "source_url"),
      permalink: rowNullableString(row, "permalink"),
      publishedAt: rowString(row, "published_at"),
      durationSeconds: rowNullableNumber(row, "duration_seconds"),
      hashtags: rowStringArray(row, "hashtags"),
      mentions: rowStringArray(row, "mentions"),
      taggedAccounts: rowStringArray(row, "tagged_accounts"),
      collaborators: rowStringArray(row, "collaborators"),
      likes,
      comments,
      shares,
      saves,
      views: rowMetricNumber(metric, "views", ["plays", "video_views"]),
      reach,
      impressions: rowMetricNumber(metric, "impressions"),
      engagements,
      engagementRateByFollowers: rowMetricNumber(metric, "engagement_rate", ["engagementRate"]),
      engagementRateByReach: calculateEngagementRateByReach({ engagements, reach }),
      watchTimeSeconds: rowMetricNumber(metric, "watch_time_seconds"),
      averageWatchTimeSeconds: rowMetricNumber(metric, "average_watch_time_seconds"),
      completionRate: rowMetricNumber(metric, "completion_rate"),
    } satisfies SocialContentItem;
  });

  const compare =
    sort === "reach"
      ? (a: SocialContentItem, b: SocialContentItem) => (b.reach ?? 0) - (a.reach ?? 0)
      : sort === "views"
        ? (a: SocialContentItem, b: SocialContentItem) => (b.views ?? 0) - (a.views ?? 0)
        : sort === "engagements"
          ? (a: SocialContentItem, b: SocialContentItem) => (b.engagements ?? 0) - (a.engagements ?? 0)
          : sort === "engagement_rate"
            ? (a: SocialContentItem, b: SocialContentItem) => (b.engagementRateByFollowers ?? 0) - (a.engagementRateByFollowers ?? 0)
            : (a: SocialContentItem, b: SocialContentItem) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

  return items.sort(compare);
}

export async function getSocialContentDetail(contentId: string): Promise<SocialContentDetail | null> {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const postRes = await supabase.from("social_posts").select("*").eq("id", contentId).limit(1).maybeSingle();
  if (!postRes.data) {
    return null;
  }

  const socialAccountId = rowString(postRes.data as GenericRow, "social_account_id");
  const connectionRes = await supabase
    .from("social_connections")
    .select("*")
    .eq("social_account_id", socialAccountId)
    .limit(1)
    .maybeSingle();

  if (!connectionRes.data) {
    return null;
  }

  if (!shouldIncludeConnectionRow(connectionRes.data as GenericRow)) {
    return null;
  }

  const provider = rowString(connectionRes.data as GenericRow, "connection_type") as SocialProviderKey;
  const [content] = await hydrateContentItems(
    [postRes.data as GenericRow],
    provider,
    rowString(connectionRes.data as GenericRow, "id"),
    "newest",
  );
  const commentsRes = await supabase
    .from("social_comments")
    .select("*")
    .eq("social_post_id", contentId)
    .order("published_at", { ascending: false });

  return {
    ...content,
    commentsFeed: ((commentsRes.data ?? []) as GenericRow[]).map((row) => ({
      id: rowString(row, "id"),
      authorName: rowNullableString(row, "author_name"),
      authorAvatarUrl: rowNullableString(row, "author_avatar_url"),
      commentText: rowString(row, "comment_text"),
      commentLikes: rowNullableNumber(row, "comment_likes"),
      repliesCount: rowNumber(row, "replies_count"),
      sentiment: rowString(row, "sentiment", "neutral"),
      publishedAt: rowString(row, "published_at"),
    })),
  };
}

export async function persistSocialWebhookEvent(provider: SocialProviderKey, input: SocialWebhookIngestInput) {
  const supabase = getSupabaseAdminClient();
  const organizationId = input.connectionId
    ? rowString(
        (
          await supabase
            .from("social_connections")
            .select("organization_id")
            .eq("id", input.connectionId)
            .limit(1)
            .maybeSingle()
        ).data as GenericRow,
        "organization_id",
      )
    : await getDefaultSocialOrganizationId();

  const { data, error } = await supabase
    .from("social_webhook_events")
    .upsert(
      {
        organization_id: organizationId,
        provider,
        external_event_id: input.externalEventId,
        connection_id: input.connectionId ?? null,
        event_type: input.eventType,
        payload_json: input.payload,
        processing_status: "received",
        received_at: new Date().toISOString(),
      },
      { onConflict: "provider,external_event_id" },
    )
    .select("id, provider, event_type, processing_status, received_at")
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Webhook event could not be stored.");
  }

  return {
    id: data.id as string,
    provider: data.provider as SocialProviderKey,
    eventType: data.event_type as string,
    processingStatus: data.processing_status as string,
    receivedAt: data.received_at as string,
  } satisfies SocialWebhookEventRecord;
}

export async function buildSocialPortfolioCsv() {
  const accounts = await listSocialConnections();
  const header = [
    "Platform",
    "Account Name",
    "Username",
    "Followers",
    "Reach",
    "Impressions",
    "Views",
    "Engagements",
    "Engagement Rate by Followers",
    "Last Synced At",
  ];

  const rows = accounts.map((item) => [
    item.platformLabel,
    item.accountName,
    item.username,
    String(item.followers ?? ""),
    String(item.reach ?? ""),
    String(item.impressions ?? ""),
    String(item.views ?? ""),
    String(item.engagements ?? ""),
    String(item.engagementRateByFollowers ?? ""),
    item.lastSyncedAt ?? "",
  ]);

  return [header, ...rows]
    .map((line) => line.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(","))
    .join("\n");
}

export async function buildSocialAccountCsv(connectionId: string) {
  const detail = await getSocialAccountDetail(connectionId);
  if (!detail) {
    throw new Error("Social account was not found.");
  }

  const header = [
    "Platform",
    "Account Name",
    "Username",
    "Followers",
    "Following",
    "Reach",
    "Impressions",
    "Views",
    "Engagements",
    "Engagement Rate by Followers",
    "Follower Growth Rate",
    "Last Synced At",
  ];

  const row = [
    detail.platformLabel,
    detail.accountName,
    detail.username,
    String(detail.followers ?? ""),
    String(detail.following ?? ""),
    String(detail.reach ?? ""),
    String(detail.impressions ?? ""),
    String(detail.views ?? ""),
    String(detail.engagements ?? ""),
    String(detail.engagementRateByFollowers ?? ""),
    String(detail.followerGrowthRate ?? ""),
    detail.lastSyncedAt ?? "",
  ];

  return [header, row]
    .map((line) => line.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(","))
    .join("\n");
}

export async function buildSocialReport(input: SocialReportInput) {
  if (input.reportType === "portfolio" || !input.connectionId) {
    return {
      fileName: `social-portfolio-${input.dateRange}.csv`,
      contentType: "text/csv; charset=utf-8",
      body: await buildSocialPortfolioCsv(),
    };
  }

  return {
    fileName: `social-account-${input.connectionId}-${input.dateRange}.csv`,
    contentType: "text/csv; charset=utf-8",
    body: await buildSocialAccountCsv(input.connectionId),
  };
}
