/**
 * Meta Library — shared helpers for the Apify Meta/Facebook Ad Library scraper.
 *
 * This module owns the server-side normalization layer. Raw Apify dataset rows
 * are inspected, advertisement rows are extracted/flattened, and every real ad
 * is normalized into a stable `MetaLibraryAd` contract before reaching the
 * client. The client must only ever read `response.ads`.
 *
 * No values are guessed, generated, estimated, or hardcoded. Missing Meta
 * fields remain `null`. Every displayed value originates from the real dataset.
 */

export const META_AD_LIBRARY_ACTOR_ID = "JHGi3kAzHO1t3Fxrb";
export const META_AD_LIBRARY_ACTOR_NAME = "whoareyouanas/meta-ad-scraper";

export const DEFAULT_MAX_RESULTS = 50;
export const MIN_MAX_RESULTS = 10;
export const MAX_MAX_RESULTS = 500;

/**
 * Max seconds the route will wait for a running Actor before giving up.
 */
export const META_LIBRARY_POLL_TIMEOUT_SECS = 180;

/** Normalized advertisement contract exposed to the client (response.ads). */
export type MetaLibraryAd = {
  id: string;
  advertiser: {
    id: string | null;
    name: string | null;
    profileImageUrl: string | null;
  };
  creative: {
    body: string | null;
    title: string | null;
    description: string | null;
    imageUrls: string[];
    videoUrls: string[];
    cards: Array<{
      body: string | null;
      title: string | null;
      description: string | null;
      imageUrl: string | null;
      videoUrl: string | null;
      destinationUrl: string | null;
    }>;
  };
  status: "ACTIVE" | "INACTIVE" | null;
  platforms: string[];
  totalPlatforms: number | null;
  format: string | null;
  similarAdCount: number | null;
  multipleVersions: boolean | null;
  startDate: string | null;
  endDate: string | null;
  adType: string | null;
  callToAction: {
    text: string | null;
    url: string | null;
  } | null;
  spend: {
    lowerBound: number | null;
    upperBound: number | null;
    currency: string | null;
  } | null;
  impressions: {
    lowerBound: number | null;
    upperBound: number | null;
  } | null;
  audienceSize: {
    lowerBound: number | null;
    upperBound: number | null;
  } | null;
  adLibraryUrl: string | null;
  sourceUrl: string | null;
  scrapedAt: string | null;
  source: {
    provider: "Meta Ad Library via Apify";
    actorRunId: string;
    datasetId: string;
  };
  /** Sanitized raw dataset row used to build this ad (dev inspection only). */
  raw: Record<string, unknown>;
};

export type MetaLibrarySource = {
  actorRunId: string;
  datasetId: string;
};

/* -------------------------------------------------------------------------- */
/* Basic helpers.                                                              */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Return the first defined, non-empty value. */
export function firstDefined(...values: unknown[]): unknown {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

/** Safely read a nested property from a record path like "snapshot.body.text". */
function getPath(value: unknown, path: string): unknown {
  let current = value;
  for (const segment of path.split(".")) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

/* -------------------------------------------------------------------------- */
/* Public sanitizers.                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Normalize a user-supplied maximum-results value into a safe, positive integer.
 * Always returns a positive integer between MIN and MAX, so it can never be
 * passed to Apify as 0 / NaN / null / empty / negative.
 */
export function sanitizeMaxResults(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_RESULTS;
  }

  return Math.min(MAX_MAX_RESULTS, Math.max(MIN_MAX_RESULTS, Math.floor(parsed)));
}

/**
 * Build the Apify run options for starting the Meta Ad Library Actor.
 * Only valid Apify run options are included (maxItems). Waiting is handled
 * separately via `client.run(runId).waitForFinish(...)`.
 */
export function buildMetaLibraryRunOptions(maxResults: unknown): {
  maxItems: number;
} {
  return {
    maxItems: sanitizeMaxResults(maxResults),
  };
}

/**
 * Build the Actor input. Includes only the Actor's supported scraper fields.
 */
export function buildMetaLibraryActorInput(
  input: {
    country?: string;
    searchQuery?: string;
    pageId?: string;
    activeStatus?: string;
    adType?: string;
    mediaType?: string;
    isTargetedCountry?: boolean;
    sortMode?: string;
    sortDirection?: string;
    maxConcurrency?: number;
    requestHandlerTimeoutSecs?: number;
  },
  maxResults: unknown,
): Record<string, unknown> {
  const safeMax = sanitizeMaxResults(maxResults);

  return {
    country: input.country || "US",
    searchQuery: input.searchQuery || "",
    pageId: input.pageId || "",
    activeStatus: input.activeStatus || "active",
    adType: input.adType || "all",
    mediaType: input.mediaType || "all",
    isTargetedCountry: typeof input.isTargetedCountry === "boolean" ? input.isTargetedCountry : false,
    sortMode: input.sortMode || "total_impressions",
    sortDirection: input.sortDirection || "desc",
    maxConcurrency: typeof input.maxConcurrency === "number" ? input.maxConcurrency : 1,
    requestHandlerTimeoutSecs:
      typeof input.requestHandlerTimeoutSecs === "number" ? input.requestHandlerTimeoutSecs : 900,
    maxResults: safeMax,
  };
}

/* -------------------------------------------------------------------------- */
/* Safe field-reading helpers.                                                 */
/* -------------------------------------------------------------------------- */

/** Recursively read the first real text string from a value. */
export function readText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = readText(item);
      if (text) {
        return text;
      }
    }
    return null;
  }

  if (isRecord(value)) {
    return readText(
      firstDefined(value.text, value.body, value.title, value.description, value.caption, value.name, value.value),
    );
  }

  return null;
}

/** Read a valid http(s) URL from a value. */
export function readUrl(value: unknown): string | null {
  if (typeof value === "string") {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
    } catch {
      return null;
    }
  }

  if (isRecord(value)) {
    return readUrl(
      firstDefined(
        value.url,
        value.uri,
        value.src,
        value.imageUrl,
        value.videoUrl,
        value.originalImageUrl,
        value.snapshotUrl,
        value.link,
        value.value,
      ),
    );
  }

  return null;
}

/** Read the first real number from a compact value (number or numeric string). */
export function readNumber(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = readNumber(item);
      if (parsed != null) {
        return parsed;
      }
    }
    return null;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
    if (!cleaned) {
      return null;
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Read a string array (accepts a single string, array, or comma-separated). */
export function readStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    const result: string[] = [];
    for (const item of value) {
      if (Array.isArray(item) || isRecord(item)) {
        result.push(...readStringArray(item));
      } else if (typeof item === "string" && item.trim()) {
        result.push(item.trim());
      }
    }
    return [...new Set(result)];
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return [];
}

/** Normalize a start/end date supporting ISO strings and Unix seconds/ms. */
export function readDate(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  let raw: unknown = value;

  if (isRecord(value)) {
    const nested = firstDefined(value.iso, value.timestamp, value.epoch, value.value, value.date);
    const found = Array.from(Object.values(value)).find(
      (v): v is string | number => typeof v === "string" || typeof v === "number",
    );
    raw = nested ?? found;
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }

    // Unix timestamp in seconds (10 digits) or milliseconds (13 digits).
    if (/^\d{10}(\.\d+)?$/.test(trimmed) || /^\d{13}$/.test(trimmed)) {
      const numeric = Number(trimmed);
      const ms = trimmed.length <= 10 ? numeric * 1000 : numeric;
      const date = new Date(ms);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }

    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof raw === "number") {
    const numeric = raw;
    const ms = Math.abs(numeric) < 1e12 ? numeric * 1000 : numeric;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

/** Read a range (lower/upper bound) from objects with bound or value fields. */
export function readRange(value: unknown): { lowerBound: number | null; upperBound: number | null } | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "number" || typeof value === "string") {
    const parsed = readNumber(value);
    if (parsed == null) {
      return null;
    }
    return { lowerBound: parsed, upperBound: parsed };
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const range = readRange(item);
      if (range) {
        return range;
      }
    }
    return null;
  }

  if (isRecord(value)) {
    const lower = readNumber(
      firstDefined(value.lowerBound, value.lower_bound, value.lower, value.min, value.minBound, value.minimum),
    );
    const upper = readNumber(
      firstDefined(value.upperBound, value.upper_bound, value.upper, value.max, value.maxBound, value.maximum),
    );

    if (lower != null || upper != null) {
      return { lowerBound: lower, upperBound: upper };
    }

    // A nested currency object like { USD: { lowerBound, upperBound } }
    for (const key of ["USD", "usd", "currency", "amount"]) {
      const nested = value[key];
      if (isRecord(nested) || Array.isArray(nested)) {
        const range = readRange(nested);
        if (range) {
          return range;
        }
      }
    }

    // Single-value object like { value: 1200 } or { amount: 500 }
    const single = readNumber(firstDefined(value.value, value.amount, value.total, value.count, value.estimate));
    if (single != null) {
      return { lowerBound: single, upperBound: single };
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Advertisement-row extraction & detection.                                   */
/* -------------------------------------------------------------------------- */

/**
 * Extract advertisement rows from raw dataset items. A dataset row may itself be
 * an ad, or the real ads may be nested under data/ad/result/node/results/edges.
 */
export function extractAdvertisementRows(rawItems: unknown[]): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];

  function pushIfAd(value: unknown) {
    if (isRecord(value) && isAdvertisementRow(value)) {
      rows.push(value);
    }
  }

  for (const item0 of rawItems) {
    if (!isRecord(item0)) {
      continue;
    }
    const item: Record<string, unknown> = item0;

    const hasDirectAdId = [
      item.adArchiveId,
      item.ad_archive_id,
      item.adArchiveID,
      item.libraryId,
      item.libraryID,
      item.adId,
      item.ad_id,
      item.adCreativeBody,
      item.ad_creative_body,
      item.body,
      item.brand,
      item.linkTitle,
      item.images,
      item.videos,
      item.adActiveStatus,
      item.ad_active_status,
      item.adLibraryUrl,
      item.ad_library_url,
    ].some((value) => value !== undefined && value !== null && value !== "");

    const hasRichAdParts =
      isRecord(item.advertiser) ||
      isRecord(item.creative) ||
      isRecord(item.snapshot) ||
      isRecord(item.adCreative) ||
      isRecord(item.ad_creative);

    // When the top-level item carries a genuine direct ad identifier OR a rich set
    // of ad sub-objects (advertiser/creative/snapshot), treat it as ONE complete
    // advertisement row and do NOT descend into its nested advertiser/creative/
    // snapshot/ad sub-objects (which would otherwise be mis-detected as separate
    // ads).
    if (hasDirectAdId || hasRichAdParts) {
      rows.push(item);
      continue;
    }

    for (const candidate of [item.data, item.ad, item.result, item.node, item.page, item.publisher]) {
      if (Array.isArray(candidate)) {
        for (const nested of candidate) {
          pushIfAd(getRecord((nested as Record<string, unknown>)?.node) ?? nested);
        }
      } else if (isRecord(candidate)) {
        pushIfAd(candidate);
      }
    }

    const data = getRecord(item.data);
    if (data) {
      for (const key of ["ads", "ad", "results", "result", "nodes", "edges"]) {
        const nested = data[key];
        if (Array.isArray(nested)) {
          for (const entry of nested) {
            if (isRecord(entry)) {
              pushIfAd(getRecord(entry.node) ?? entry);
            }
          }
        } else if (isRecord(nested)) {
          pushIfAd(nested);
        }
      }
    }

    for (const key of ["results", "nodes", "edges", "ads", "ad"]) {
      const nested = item[key];
      if (Array.isArray(nested)) {
        for (const entry of nested) {
          if (isRecord(entry)) {
            pushIfAd(getRecord(entry.node) ?? entry);
          }
        }
      } else if (key === "ad" && isRecord(nested)) {
        pushIfAd(nested);
      }
    }
  }

  return rows;
}

/**
 * Strict advertisement-row detection. A row is only an advertisement when it
 * contains at least one genuine ad identifier or content property.
 */
export function isAdvertisementRow(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const idCandidates: unknown[] = [
    value.adArchiveId,
    value.ad_archive_id,
    value.adArchiveID,
    value.libraryId,
    value.libraryID,
    value.id,
    value.pageId,
    value.page_id,
    value.pageName,
    value.page_name,
    value.brand,
    value.advertiserName,
    value.advertiser_name,
    value.advertiserId,
    value.advertiser_id,
    value.body,
    value.linkTitle,
    value.linkDescription,
    value.images,
    value.videos,
    value.snapshot,
    value.creative,
    value.adCreative,
    value.startDate,
    value.start_date,
    value.adDeliveryStartTime,
    value.adLibraryUrl,
    value.ad_creative_body,
    value.adCreativeBody,
  ];

  const snapshot = getRecord(value.snapshot);
  const creative = getRecord(value.creative);
  const ad = getRecord(value.ad);

  const nestedCandidates: unknown[] = [];
  if (snapshot) {
    nestedCandidates.push(
      snapshot.pageName,
      snapshot.page_name,
      snapshot.id,
      snapshot.body,
      snapshot.startDate,
      snapshot.adDeliveryStartTime,
    );
  }
  if (creative) {
    nestedCandidates.push(creative.id, creative.body, creative.title, creative.description);
  }
  if (ad) {
    nestedCandidates.push(ad.id);
  }

  const hasIdentifier = [...idCandidates, ...nestedCandidates].some(
    (candidate) => candidate !== undefined && candidate !== null && candidate !== "",
  );

  if (hasIdentifier) {
    return true;
  }

  // Reject rows that only carry metadata / status / error / pagination.
  const keys = Object.keys(value);
  const onlyMetadataKeys = keys.every((key) =>
    [
      "status",
      "message",
      "input",
      "request",
      "pagination",
      "progress",
      "run",
      "error",
      "success",
      "ok",
      "count",
      "total",
      "page",
      "limit",
      "offset",
      "actor",
      "datasetId",
      "finishedAt",
      "startedAt",
      "version",
      "updatedAt",
      "createdAt",
    ].includes(String(key).toLowerCase()),
  );

  return !onlyMetadataKeys;
}

/* -------------------------------------------------------------------------- */
/* Normalization.                                                              */
/* -------------------------------------------------------------------------- */

function pickObject(raw: Record<string, unknown>, ...keys: string[]): Record<string, unknown> | null {
  for (const key of keys) {
    const value = raw[key];
    if (isRecord(value)) {
      return value;
    }
  }
  return null;
}

function readAdvertiser(raw: Record<string, unknown>): {
  id: string | null;
  name: string | null;
  profileImageUrl: string | null;
} {
  const page = pickObject(raw, "page", "advertiser", "publisher");
  const snapshot = pickObject(raw, "snapshot");
  const ad = pickObject(raw, "ad");

  const name = readText(
    firstDefined(
      raw.advertiserName,
      raw.advertiser_name,
      raw.brand,
      raw.pageName,
      raw.page_name,
      page?.name,
      page?.pageName,
      page?.page_name,
      page?.displayName,
      page?.username,
      snapshot?.pageName,
      snapshot?.page_name,
      snapshot?.advertiserName,
      snapshot?.advertiser_name,
      ad?.advertiserName,
      ad?.pageName,
    ),
  );

  const id = readText(
    firstDefined(
      raw.advertiserId,
      raw.advertiser_id,
      raw.pageId,
      raw.page_id,
      page?.id,
      page?.pageId,
      page?.page_id,
      snapshot?.pageId,
      snapshot?.page_id,
      snapshot?.advertiserId,
      snapshot?.advertiser_id,
      ad?.advertiserId,
      ad?.pageId,
    ),
  );

  const profileImageUrl = readUrl(
    firstDefined(
      raw.pageProfilePicture,
      raw.page_profile_picture,
      raw.profileImageUrl,
      raw.profile_image_url,
      raw.brandLogo,
      page?.profileImageUrl,
      page?.profile_picture,
      page?.profilePicture,
      page?.picture,
      snapshot?.pageProfilePicture,
      snapshot?.page_profile_picture,
    ),
  );

  return { id, name, profileImageUrl };
}

function readCreative(raw: Record<string, unknown>): MetaLibraryAd["creative"] {
  const creative = pickObject(raw, "creative", "adCreative", "ad_creative");
  const snapshot = pickObject(raw, "snapshot");
  const ad = pickObject(raw, "ad");

  const body = readText(
    firstDefined(
      raw.adCreativeBody,
      raw.ad_creative_body,
      raw.primaryText,
      raw.primary_text,
      raw.adText,
      raw.ad_text,
      raw.body,
      raw.text,
      raw.ctaText,
      creative?.body,
      creative?.text,
      creative?.primaryText,
      creative?.primary_text,
      creative?.adText,
      creative?.ad_text,
      snapshot?.body,
      getPath(snapshot, "body.text"),
      snapshot?.primaryText,
      snapshot?.primary_text,
      snapshot?.adText,
      snapshot?.ad_text,
      ad?.body,
      ad?.text,
    ),
  );

  const title = readText(
    firstDefined(
      raw.adCreativeLinkTitle,
      raw.ad_creative_link_title,
      raw.title,
      raw.linkTitle,
      creative?.title,
      creative?.headline,
      creative?.headLine,
      snapshot?.title,
      snapshot?.headline,
      ad?.title,
    ),
  );

  const description = readText(
    firstDefined(
      raw.adCreativeLinkDescription,
      raw.ad_creative_link_description,
      raw.description,
      raw.linkDescription,
      creative?.description,
      creative?.caption,
      snapshot?.description,
      snapshot?.caption,
      ad?.description,
    ),
  );

  const imageUrls = collectCreativeUrls(raw, "image");
  const videoUrls = collectCreativeUrls(raw, "video");
  const cards = extractCreativeCards(raw, creative, snapshot);

  return { body, title, description, imageUrls, videoUrls, cards };
}

function collectCreativeUrls(raw: Record<string, unknown>, kind: "image" | "video"): string[] {
  const urls: string[] = [];

  function visit(value: unknown) {
    if (typeof value === "string" && value.trim()) {
      const url = readUrl(value);
      if (url) {
        urls.push(url);
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isRecord(item)) {
          const directListUrl = readUrl(
            kind === "image"
              ? firstDefined(item.imageUrl, item.image_url, item.thumbnailUrl, item.thumbnail, item.url, item.src)
              : firstDefined(item.videoUrl, item.video_url, item.url, item.src),
          );
          if (directListUrl) {
            urls.push(directListUrl);
          }
        }
        visit(item);
      }
      return;
    }
    if (isRecord(value)) {
      for (const key of Object.keys(value)) {
        const lower = key.toLowerCase();
        if (
          kind === "image" &&
          (lower.includes("image") || lower.includes("img") || lower.includes("photo") || lower.includes("thumbnail"))
        ) {
          visit(value[key]);
        } else if (kind === "video" && (lower.includes("video") || lower.includes("mp4") || lower.includes("vod"))) {
          visit(value[key]);
        }
      }
    }
  }

  const roots: unknown[] =
    kind === "image"
      ? [
          raw.adImageUrl,
          raw.ad_image_url,
          raw.images,
          raw.imageUrl,
          raw.image_url,
          raw.imageUrls,
          raw.mediaUrls,
          raw.brandLogo,
          raw.adSnapshotUrl,
          raw.ad_snapshot_url,
          raw.snapshot,
          raw.creative,
          raw.ad,
        ]
      : [
          raw.adVideoUrl,
          raw.ad_video_url,
          raw.videos,
          raw.videoUrl,
          raw.video_url,
          raw.videoUrls,
          raw.snapshot,
          raw.creative,
          raw.ad,
        ];

  for (const root of roots) {
    visit(root);
  }

  return [...new Set(urls)];
}

function extractCreativeCards(
  raw: Record<string, unknown>,
  creative: Record<string, unknown> | null,
  snapshot: Record<string, unknown> | null,
): MetaLibraryAd["creative"]["cards"] {
  const cards: MetaLibraryAd["creative"]["cards"] = [];

  const candidates = [
    raw.cards,
    raw.carouselCards,
    raw.carousel,
    creative?.cards,
    creative?.carouselCards,
    creative?.carousel,
    snapshot?.cards,
    snapshot?.carouselCards,
    snapshot?.carousel,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      for (const card of candidate) {
        if (!isRecord(card)) {
          continue;
        }
        cards.push({
          body: readText(firstDefined(card.body, card.text, card.primaryText, card.description)),
          title: readText(firstDefined(card.title, card.headline, card.headLine)),
          description: readText(firstDefined(card.description, card.caption)),
          imageUrl: readUrl(firstDefined(card.imageUrl, card.image_url, card.image, card.thumbnailUrl, card.thumbnail)),
          videoUrl: readUrl(firstDefined(card.videoUrl, card.video, card.video_url)),
          destinationUrl: readUrl(
            firstDefined(card.destinationUrl, card.link, card.ctaLink, card.url, card.destination_url),
          ),
        });
      }
    }
  }

  return cards;
}

function readStatus(raw: Record<string, unknown>): "ACTIVE" | "INACTIVE" | null {
  const snapshot = pickObject(raw, "snapshot");
  const ad = pickObject(raw, "ad");
  const active = firstDefined(raw.active, snapshot?.active, ad?.active);

  if (typeof active === "boolean") {
    return active ? "ACTIVE" : "INACTIVE";
  }

  const value = readText(
    firstDefined(
      raw.adActiveStatus,
      raw.ad_active_status,
      raw.activeStatus,
      raw.active_status,
      raw.isActive,
      raw.is_active,
      raw.status,
      snapshot?.adActiveStatus,
      snapshot?.ad_active_status,
      snapshot?.activeStatus,
      snapshot?.active_status,
      ad?.adActiveStatus,
      ad?.activeStatus,
    ),
  );

  if (!value) {
    return null;
  }

  const lower = value.toLowerCase();
  if (lower.includes("inactive") || lower.includes("in active") || lower.includes("not active")) {
    return "INACTIVE";
  }
  if (lower.includes("active")) {
    return "ACTIVE";
  }
  return null;
}

function readPlatforms(raw: Record<string, unknown>): string[] {
  const platforms = readStringArray(
    firstDefined(
      raw.publisherPlatforms,
      raw.publisher_platforms,
      raw.platforms,
      raw.adDeliveryPlatform,
      raw.platform,
    ),
  );

  if (platforms.length > 0) {
    return platforms;
  }

  const snapshot = pickObject(raw, "snapshot");
  if (snapshot) {
    return readStringArray(firstDefined(snapshot.publisherPlatforms, snapshot.platforms, snapshot.platform));
  }

  return [];
}

function readTransparency(
  raw: Record<string, unknown>,
  kind: "spend" | "impressions" | "audienceSize",
): { lowerBound: number | null; upperBound: number | null; currency?: string | null } | null {
  const snapshot = pickObject(raw, "snapshot");
  const ad = pickObject(raw, "ad");

  const direct = raw[kind];

  // Top-level audience-size aliases sometimes appear as flat fields.
  let audienceBounding: Record<string, unknown> | null = null;
  if (kind === "audienceSize") {
    const lower = readNumber(
      firstDefined(raw.estimatedAudienceSizeLowerBound, raw.estimated_audience_size_lower_bound, raw.audienceLowerBound),
    );
    const upper = readNumber(
      firstDefined(raw.estimatedAudienceSizeUpperBound, raw.estimated_audience_size_upper_bound, raw.audienceUpperBound),
    );
    if (lower != null || upper != null) {
      audienceBounding = { lowerBound: lower, upperBound: upper };
    }
  }

  const nested =
    audienceBounding ??
    (snapshot ? getRecord(snapshot[kind]) : null) ??
    (ad ? getRecord(ad[kind]) : null) ??
    (snapshot ? snapTransparency(snapshot, kind) : null) ??
    (ad ? snapTransparency(ad, kind) : null);

  const range = readRange(firstDefined(direct, nested));

  if (!range) {
    return null;
  }

  let currency: string | null = null;
  const directRecord = getRecord(direct);
  const nestedRecord = getRecord(nested);
  if (directRecord) {
    currency = readText(firstDefined(directRecord.currency, directRecord.USD ? "USD" : undefined));
  }
  if (!currency && nestedRecord) {
    currency = readText(firstDefined(nestedRecord.currency, nestedRecord.USD ? "USD" : undefined));
  }

  return { ...range, ...(kind === "spend" ? { currency } : {}) };
}

function snapTransparency(source: Record<string, unknown>, kind: string): unknown {
  for (const key of Object.keys(source)) {
    const lower = key.toLowerCase();
    if (lower.includes(kind)) {
      const value = source[key];
      if (isRecord(value) || Array.isArray(value) || typeof value === "number" || typeof value === "string") {
        return value;
      }
    }
  }
  return undefined;
}

function readAdLibraryUrl(raw: Record<string, unknown>): string | null {
  const direct = readUrl(
    firstDefined(
      raw.adLibraryUrl,
      raw.ad_library_url,
      raw.adArchiveUrl,
      raw.ad_archive_url,
      raw.adSnapshotUrl,
      raw.ad_snapshot_url,
      raw.permalink,
      raw.url,
      raw.adUrl,
    ),
  );

  if (direct) {
    return direct;
  }

  const libraryId = readText(firstDefined(raw.libraryID, raw.libraryId, raw.adArchiveId, raw.ad_archive_id));
  return libraryId ? `https://www.facebook.com/ads/library/?id=${encodeURIComponent(libraryId)}` : null;
}

function readAdId(raw: Record<string, unknown>): string {
  return (
    readText(
      firstDefined(
        raw.adArchiveId,
        raw.ad_archive_id,
        raw.adArchiveID,
        raw.libraryId,
        raw.libraryID,
        raw.id,
        raw.adId,
        raw.ad_id,
        getPath(raw, "ad.id"),
        getPath(raw, "snapshot.id"),
      ),
    ) ?? ""
  );
}

function readAdType(raw: Record<string, unknown>): string | null {
  return readText(
    firstDefined(
      raw.adType,
      raw.ad_type,
      raw.format,
      raw.type,
      raw.adTypeLabel,
      raw.ad_type_label,
      raw.adcategory,
      raw.adCategory,
    ),
  );
}

function readCallToAction(raw: Record<string, unknown>) {
  const text = readText(firstDefined(raw.ctaText, raw.cta_text, raw.callToActionText, raw.call_to_action_text));
  const url = readUrl(firstDefined(raw.ctaUrl, raw.cta_url, raw.linkUrl, raw.link_url));

  if (!text && !url) {
    return null;
  }

  return { text, url };
}

/**
 * Normalize a single raw advertisement row into the stable contract.
 */
export function normalizeMetaLibraryAd(rawRecord: Record<string, unknown>, source: MetaLibrarySource): MetaLibraryAd {
  const advertiser = readAdvertiser(rawRecord);
  const creative = readCreative(rawRecord);
  const id = readAdId(rawRecord);
  const startDate = readDate(
    firstDefined(
      rawRecord.startDate,
      rawRecord.start_date,
      rawRecord.adDeliveryStartTime,
      rawRecord.ad_delivery_start_time,
      rawRecord.adCreationTime,
      rawRecord.ad_creation_time,
      rawRecord.startDateFormatted,
      getPath(rawRecord, "snapshot.startDate"),
      getPath(rawRecord, "snapshot.adDeliveryStartTime"),
      getPath(rawRecord, "ad.startDate"),
    ),
  );
  const endDate = readDate(
    firstDefined(
      rawRecord.endDate,
      rawRecord.end_date,
      rawRecord.adDeliveryStopTime,
      rawRecord.ad_delivery_stop_time,
      rawRecord.endDateFormatted,
      getPath(rawRecord, "snapshot.endDate"),
      getPath(rawRecord, "snapshot.adDeliveryStopTime"),
      getPath(rawRecord, "ad.endDate"),
    ),
  );
  const spend = readTransparency(rawRecord, "spend");
  const impressions = readTransparency(rawRecord, "impressions");
  const audienceSize = readTransparency(rawRecord, "audienceSize");
  const status = readStatus(rawRecord);
  const platforms = readPlatforms(rawRecord);
  const totalPlatforms = readNumber(rawRecord.totalPlatforms);
  const format = readText(firstDefined(rawRecord.format, rawRecord.mediaType, rawRecord.media_type));
  const similarAdCount = readNumber(rawRecord.similarAdCount);
  const multipleVersions =
    typeof rawRecord.multipleVersions === "boolean"
      ? rawRecord.multipleVersions
      : typeof rawRecord.multiple_versions === "boolean"
        ? rawRecord.multiple_versions
        : null;
  const adType = readAdType(rawRecord);
  const callToAction = readCallToAction(rawRecord);
  const adLibraryUrl = readAdLibraryUrl(rawRecord);
  const sourceUrl = readUrl(rawRecord.sourceUrl);
  const scrapedAt = readDate(rawRecord.scrapeDate);

  return {
    id,
    advertiser,
    creative,
    status,
    platforms,
    totalPlatforms,
    format,
    similarAdCount,
    multipleVersions,
    startDate,
    endDate,
    adType,
    callToAction,
    spend: spend
      ? { lowerBound: spend.lowerBound, upperBound: spend.upperBound, currency: spend.currency ?? null }
      : null,
    impressions: impressions
      ? { lowerBound: impressions.lowerBound, upperBound: impressions.upperBound }
      : null,
    audienceSize: audienceSize
      ? { lowerBound: audienceSize.lowerBound, upperBound: audienceSize.upperBound }
      : null,
    adLibraryUrl,
    sourceUrl,
    scrapedAt,
    source: {
      provider: "Meta Ad Library via Apify",
      actorRunId: source.actorRunId,
      datasetId: source.datasetId,
    },
    raw: sanitizeRawRecord(rawRecord),
  };
}

/**
 * Normalize every raw item into ads. Accepts either the raw dataset items array
 * or a wrapper object (datasetResponse) so callers can pass `.items` directly.
 */
export function normalizeMetaLibraryAds(
  rawInput: unknown,
  source: MetaLibrarySource,
): { rawCount: number; extractedCount: number; ads: MetaLibraryAd[] } {
  let rawItems: unknown[] = [];

  if (Array.isArray(rawInput)) {
    rawItems = rawInput;
  } else if (isRecord(rawInput)) {
    const items = rawInput.items;
    rawItems = Array.isArray(items) ? items : [];
  }

  const extractedRows = extractAdvertisementRows(rawItems);
  const ads = extractedRows.map((row) => normalizeMetaLibraryAd(row, source));

  const seen = new Set<string>();
  const uniqueAds = ads.filter((ad) => {
    if (!ad.id) {
      return true;
    }
    const key = `${ad.source.actorRunId}:${ad.id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return {
    rawCount: rawItems.length,
    extractedCount: extractedRows.length,
    ads: uniqueAds,
  };
}

/**
 * Sanitize a raw record for development inspection. Removes tokens, cookies,
 * authorization values, and proxy information.
 */
export function sanitizeRawRecord(record: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE_KEY = /token|cookie|authorization|auth|proxy|secret|password|api[_-]?key|credential|session/i;

  function scrub(value: unknown, key?: string): unknown {
    if (typeof value === "string") {
      if (key && SENSITIVE_KEY.test(key)) {
        return "[REDACTED]";
      }
      if (/((apify_|sha256:|Bearer )[A-Za-z0-9_.-]{8,})/i.test(value)) {
        return "[REDACTED]";
      }
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => scrub(item));
    }
    if (isRecord(value)) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        if (SENSITIVE_KEY.test(k)) {
          out[k] = "[REDACTED]";
        } else {
          out[k] = scrub(v, k);
        }
      }
      return out;
    }
    return value;
  }

  return scrub(record) as Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* Stable API response contract.                                               */
/* -------------------------------------------------------------------------- */

export type MetaLibraryRunInfo = {
  id: string;
  status: string;
  datasetId: string;
};

export type MetaLibraryDiagnostics = {
  runId: string;
  datasetId: string;
  rawItemCount: number;
  firstItemKeys: string[];
};

export type MetaLibraryAdsResponse = {
  success: boolean;
  run: MetaLibraryRunInfo;
  counts: {
    rawItems: number;
    extractedRows: number;
    advertisements: number;
  };
  ads: MetaLibraryAd[];
  diagnostics?: MetaLibraryDiagnostics;
};

/**
 * Build the stable API contract returned to the client. The client must only
 * render `response.ads`. Diagnostics are included in development only.
 */
export function buildMetaLibraryResponse(
  run: MetaLibraryRunInfo,
  rawItems: unknown[],
  ads: MetaLibraryAd[],
  extractedCount: number,
  includeDiagnostics: boolean,
): MetaLibraryAdsResponse {
  const response: MetaLibraryAdsResponse = {
    success: true,
    run: {
      id: run.id,
      status: run.status,
      datasetId: run.datasetId,
    },
    counts: {
      rawItems: rawItems.length,
      extractedRows: extractedCount,
      advertisements: ads.length,
    },
    ads,
  };

  if (includeDiagnostics) {
    const firstItem = getRecord(rawItems[0]);
    response.diagnostics = {
      runId: run.id,
      datasetId: run.datasetId,
      rawItemCount: rawItems.length,
      firstItemKeys: firstItem ? Object.keys(firstItem).slice(0, 60) : [],
    };
  }

  return response;
}

/** True when running in development mode. */
export function isMetaLibraryDev(): boolean {
  return process.env.NODE_ENV === "development";
}
