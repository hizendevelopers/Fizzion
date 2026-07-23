import { getOptionalSupabaseAdminClient, getSupabaseAdminClient } from "@/lib/supabase/server";
import { getYouTubeApiKey } from "@/lib/env";

type GenericRow = Record<string, unknown>;

export type YouTubeChannelSearchResult = {
  channelId: string;
  title: string;
  handle: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  customUrl: string | null;
  subscriberCount: number | null;
  videoCount: number | null;
  viewCount: number | null;
};

export type YouTubeVideoSummary = {
  id: string;
  videoId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  liveStatus: "live" | "upcoming" | "recorded";
  durationLabel: string | null;
  viewCount: number | null;
  url: string;
  embedUrl: string;
};

export type ConnectedYouTubeTvChannel = YouTubeChannelSearchResult & {
  id: string;
  connectedAt: string;
  lastSyncedAt: string | null;
  feed: YouTubeVideoSummary[];
};

function mapConnectedRow(row: GenericRow, feed: YouTubeVideoSummary[]): ConnectedYouTubeTvChannel {
  return {
    id: rowString(row, "id"),
    channelId: rowString(row, "channel_id"),
    title: rowString(row, "title"),
    handle: rowNullableString(row, "handle"),
    description: rowNullableString(row, "description"),
    thumbnailUrl: rowNullableString(row, "thumbnail_url"),
    customUrl: rowNullableString(row, "custom_url"),
    subscriberCount: rowNullableNumber(row, "subscriber_count"),
    videoCount: rowNullableNumber(row, "video_count"),
    viewCount: rowNullableNumber(row, "view_count"),
    connectedAt: rowString(row, "connected_at"),
    lastSyncedAt: rowNullableString(row, "last_synced_at"),
    feed,
  };
}

function rowString(row: GenericRow, key: string, fallback = "") {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function rowNullableString(row: GenericRow, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function rowNullableNumber(row: GenericRow, key: string) {
  const value = row[key];
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function rowRecord(row: GenericRow, key: string) {
  const value = row[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as GenericRow) : {};
}

function getSearchChannelId(item: GenericRow) {
  const id = rowRecord(item, "id");
  return rowString(id, "channelId", rowString(item, "id"));
}

function getSearchVideoId(item: GenericRow) {
  const id = rowRecord(item, "id");
  return rowString(id, "videoId", rowString(item, "id"));
}

async function ensureOrganizationId() {
  const supabase = getSupabaseAdminClient();
  const existing = await supabase.from("organizations").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (existing.data?.id) {
    return existing.data.id as string;
  }

  const created = await supabase.from("organizations").insert({
    name: "Coca-Cola Iraq",
    slug: "coca-cola-iraq",
  }).select("id").single();

  if (created.error || !created.data?.id) {
    throw new Error(created.error?.message ?? "Unable to initialize organization for YouTube TV monitoring.");
  }

  return created.data.id as string;
}

async function youtubeFetch(path: string, query: Record<string, string | number | undefined>) {
  const apiKey = getYouTubeApiKey();
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}`.length > 0) {
      params.set(key, String(value));
    }
  });
  params.set("key", apiKey);

  const response = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${params.toString()}`, {
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : `YouTube API request failed for ${path}.`,
    );
  }

  return payload as Record<string, unknown>;
}

function formatIsoDuration(value: string | null | undefined) {
  if (!value) return null;
  const hours = /(\d+)H/.exec(value)?.[1];
  const minutes = /(\d+)M/.exec(value)?.[1];
  const seconds = /(\d+)S/.exec(value)?.[1];
  const parts = [hours, minutes, seconds].filter((part) => part !== undefined).map((part) => Number(part));
  if (parts.length === 0) return null;
  if (Number(hours ?? 0) > 0) {
    return `${Number(hours)}h ${Number(minutes ?? 0)}m`;
  }
  if (Number(minutes ?? 0) > 0) {
    return `${Number(minutes)}m ${Number(seconds ?? 0)}s`;
  }
  return `${Number(seconds ?? 0)}s`;
}

function normalizeChannel(item: GenericRow, details?: GenericRow): YouTubeChannelSearchResult {
  const snippet = { ...rowRecord(details ?? {}, "snippet"), ...rowRecord(item, "snippet") };
  const statistics = rowRecord(details ?? {}, "statistics");
  const thumbnails = rowRecord(snippet, "thumbnails");
  const highThumb = (thumbnails.high ?? thumbnails.medium ?? thumbnails.default ?? {}) as GenericRow;
  const customUrl = rowNullableString(snippet, "customUrl");
  return {
    channelId: getSearchChannelId(item),
    title: rowString(snippet, "title", "Untitled channel"),
    handle: customUrl ? `@${customUrl.replace(/^@/, "")}` : null,
    description: rowNullableString(snippet, "description"),
    thumbnailUrl: rowNullableString(highThumb, "url"),
    customUrl: customUrl ? `https://www.youtube.com/@${customUrl.replace(/^@/, "")}` : null,
    subscriberCount: rowNullableNumber(statistics, "subscriberCount"),
    videoCount: rowNullableNumber(statistics, "videoCount"),
    viewCount: rowNullableNumber(statistics, "viewCount"),
  };
}

export async function searchYouTubeChannels(query: string) {
  const search = await youtubeFetch("search", {
    part: "snippet",
    q: query,
    type: "channel",
    maxResults: 6,
  });
  const items = ((search.items ?? []) as GenericRow[]);
  const channelIds = items
    .map((item) => getSearchChannelId(item))
    .filter(Boolean);

  let detailLookup = new Map<string, GenericRow>();
  if (channelIds.length > 0) {
    const details = await youtubeFetch("channels", {
      part: "snippet,statistics",
      id: channelIds.join(","),
      maxResults: channelIds.length,
    });
    detailLookup = new Map(
      (((details.items ?? []) as GenericRow[]).map((item) => [rowString(item, "id"), item])),
    );
  }

  return items
    .map((item) => normalizeChannel(item, detailLookup.get(getSearchChannelId(item))))
    .filter((item) => item.channelId.length > 0);
}

async function getChannelFeed(channelId: string) {
  const search = await youtubeFetch("search", {
    part: "snippet",
    channelId,
    type: "video",
    order: "date",
    maxResults: 8,
  });
  const items = ((search.items ?? []) as GenericRow[]);
  const videoIds = items.map((item) => getSearchVideoId(item)).filter(Boolean);
  if (videoIds.length === 0) {
    return [] as YouTubeVideoSummary[];
  }

  const details = await youtubeFetch("videos", {
    part: "snippet,contentDetails,statistics,liveStreamingDetails",
    id: videoIds.join(","),
    maxResults: videoIds.length,
  });
  const detailLookup = new Map(
    (((details.items ?? []) as GenericRow[]).map((item) => [rowString(item, "id"), item])),
  );

  return items.map((item) => {
    const videoId = getSearchVideoId(item);
    const snippet = rowRecord(item, "snippet");
    const detailsRow = detailLookup.get(videoId) ?? {};
    const detailSnippet = rowRecord(detailsRow as GenericRow, "snippet");
    const liveDetails = rowRecord(detailsRow as GenericRow, "liveStreamingDetails");
    const stats = rowRecord(detailsRow as GenericRow, "statistics");
    const contentDetails = rowRecord(detailsRow as GenericRow, "contentDetails");
    const thumbnails = (detailSnippet.thumbnails ?? snippet.thumbnails ?? {}) as GenericRow;
    const highThumb = (thumbnails.high ?? thumbnails.medium ?? thumbnails.default ?? {}) as GenericRow;
    const rawLive = rowString(snippet, "liveBroadcastContent", "none");
    const liveStatus =
      rawLive === "live" || rowNullableString(liveDetails, "actualStartTime")
        ? "live"
        : rawLive === "upcoming"
          ? "upcoming"
          : "recorded";

    return {
      id: videoId,
      videoId,
      title: rowString(detailSnippet, "title", rowString(snippet, "title", "Untitled video")),
      description: rowNullableString(detailSnippet, "description"),
      thumbnailUrl: rowNullableString(highThumb, "url"),
      publishedAt: rowNullableString(detailSnippet, "publishedAt") ?? rowNullableString(snippet, "publishedAt"),
      liveStatus,
      durationLabel: formatIsoDuration(rowNullableString(contentDetails, "duration")),
      viewCount: rowNullableNumber(stats, "viewCount"),
      url: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`,
    } satisfies YouTubeVideoSummary;
  });
}

async function fetchYouTubeChannelById(channelId: string) {
  const details = await youtubeFetch("channels", {
    part: "snippet,statistics",
    id: channelId,
    maxResults: 1,
  });

  const item = ((details.items ?? []) as GenericRow[])[0];
  if (!item) {
    throw new Error("The requested YouTube channel could not be found.");
  }

  return normalizeChannel(item, item);
}

export async function listConnectedYouTubeTvChannels() {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return [] as ConnectedYouTubeTvChannel[];
  }

  const result = await supabase
    .from("tv_youtube_channels")
    .select("*")
    .eq("is_active", true)
    .order("connected_at", { ascending: false });

  const rows = (result.data ?? []) as GenericRow[];
  const channels = await Promise.all(rows.map(async (row) => {
    const feed = await getChannelFeed(rowString(row, "channel_id"));
    return mapConnectedRow(row, feed);
  }));

  return channels;
}

export async function getConnectedYouTubeTvChannel(channelIdOrRowId: string) {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("tv_youtube_channels")
    .select("*")
    .or(`id.eq.${channelIdOrRowId},channel_id.eq.${channelIdOrRowId}`)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const row = data as GenericRow;
  const feed = await getChannelFeed(rowString(row, "channel_id"));
  return mapConnectedRow(row, feed);
}

export async function connectYouTubeTvChannel(input: YouTubeChannelSearchResult) {
  const supabase = getSupabaseAdminClient();
  const organizationId = await ensureOrganizationId();

  const result = await supabase
    .from("tv_youtube_channels")
    .upsert({
      organization_id: organizationId,
      channel_id: input.channelId,
      title: input.title,
      handle: input.handle,
      custom_url: input.customUrl,
      description: input.description,
      thumbnail_url: input.thumbnailUrl,
      subscriber_count: input.subscriberCount,
      video_count: input.videoCount,
      view_count: input.viewCount,
      is_active: true,
      connected_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    }, { onConflict: "organization_id,channel_id" })
    .select("id")
    .single();

  if (result.error || !result.data?.id) {
    throw new Error(result.error?.message ?? "Unable to connect the YouTube channel.");
  }

  return result.data.id as string;
}

export async function refreshConnectedYouTubeTvChannel(channelIdOrRowId: string) {
  const supabase = getSupabaseAdminClient();
  const existing = await supabase
    .from("tv_youtube_channels")
    .select("*")
    .or(`id.eq.${channelIdOrRowId},channel_id.eq.${channelIdOrRowId}`)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!existing.data) {
    throw new Error("The connected YouTube channel could not be found.");
  }

  const row = existing.data as GenericRow;
  const latest = await fetchYouTubeChannelById(rowString(row, "channel_id"));
  const syncedAt = new Date().toISOString();

  const updated = await supabase
    .from("tv_youtube_channels")
    .update({
      title: latest.title,
      handle: latest.handle,
      custom_url: latest.customUrl,
      description: latest.description,
      thumbnail_url: latest.thumbnailUrl,
      subscriber_count: latest.subscriberCount,
      video_count: latest.videoCount,
      view_count: latest.viewCount,
      last_synced_at: syncedAt,
    })
    .eq("id", rowString(row, "id"))
    .select("*")
    .single();

  if (updated.error || !updated.data) {
    throw new Error(updated.error?.message ?? "Unable to refresh the connected YouTube channel.");
  }

  const feed = await getChannelFeed(rowString(row, "channel_id"));
  return mapConnectedRow(updated.data as GenericRow, feed);
}

export async function refreshAllConnectedYouTubeTvChannels() {
  const channels = await listConnectedYouTubeTvChannels();
  return Promise.all(channels.map((channel) => refreshConnectedYouTubeTvChannel(channel.id)));
}

export async function disconnectYouTubeTvChannel(channelIdOrRowId: string) {
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from("tv_youtube_channels")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .or(`id.eq.${channelIdOrRowId},channel_id.eq.${channelIdOrRowId}`)
    .eq("is_active", true);

  if (result.error) {
    throw new Error(result.error.message);
  }
}
