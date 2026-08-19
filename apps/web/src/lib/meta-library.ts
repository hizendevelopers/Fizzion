export const META_AD_LIBRARY_ACTOR_ID = "apify~facebook-ads-scraper";
export const META_AD_LIBRARY_HOSTS = new Set(["facebook.com", "www.facebook.com"]);

export const DEFAULT_MAX_ADS = 100;
export const MIN_MAX_ADS = 1;
export const MAX_MAX_ADS = 500;

export const META_LIBRARY_JOB_TTL_MS = 1000 * 60 * 30;
export const META_LIBRARY_TEMPORARY_ERROR_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

export type MetaMetricSource =
  | "META_AD_LIBRARY"
  | "META_AD_LIBRARY_DETAIL"
  | "META_PUBLIC_DETAIL_TEXT"
  | "META_ADVERTISER_TRANSPARENCY"
  | "PUBLIC_META_TRAINING_DATA"
  | "IN_HOUSE_MODEL"
  | "PATHMATICS"
  | "NONE";
export type MetaMetricStatus = "CHECKING" | "META_DISCLOSED" | "META_NOT_DISCLOSED" | "ESTIMATED" | "NOT_AVAILABLE";
export type MetaMetricDataType = "DISCLOSED" | "ESTIMATED" | "MODELED_ESTIMATE" | "PUBLIC_RANGE" | null;
export type MetaDetailStatus = "PENDING" | "META_DISCLOSED" | "META_NOT_DISCLOSED" | "META_BROWSER_FAILED";
export type PathmaticsDebugStatus =
  | "PENDING"
  | "PATHMATICS_NOT_CONFIGURED"
  | "PATHMATICS_AUTH_FAILED"
  | "PATHMATICS_RATE_LIMITED"
  | "PATHMATICS_QUERY_FAILED"
  | "PATHMATICS_NO_MATCH"
  | "PATHMATICS_LOW_CONFIDENCE"
  | "PATHMATICS_MATCH_FOUND"
  | "PATHMATICS_METRIC_NOT_AD_LEVEL";
export type InHouseModelConfidence = "HIGH" | "MEDIUM" | "LOW";
export type InHouseDistributionStatus = "IN_DISTRIBUTION" | "PARTIAL_OOD" | "OUT_OF_DISTRIBUTION";

export type MetaMetric = {
  raw: string | null;
  min: number | null;
  max: number | null;
  status: MetaMetricStatus;
  source: MetaMetricSource;
  path: string | null;
  dataType: MetaMetricDataType;
  confidence: number | null;
  retrievedAt: string | null;
  low?: number | null;
  high?: number | null;
  predictedFrequency?: number | null;
  modelVersion?: string | null;
  datasetVersion?: string | null;
  featureCoverage?: number | null;
  distributionStatus?: InHouseDistributionStatus | null;
  confidenceLabel?: InHouseModelConfidence | null;
  exactReason?: string | null;
  explanation?: string[];
  displayLabel?: string | null;
  displaySublabel?: string | null;
  modelStage?: "EXPERIMENTAL" | "PRODUCTION" | null;
  trainingRows?: number | null;
};

export type MetaSpendMetric = MetaMetric & {
  currency: string | null;
};

export type MetricCandidate = {
  path: string;
  value: unknown;
};

export type MetaAdCreative = {
  type: "image" | "video" | "mixed" | "unknown";
  url: string | null;
  imageUrls: string[];
  videoUrls: string[];
  cards: Array<{
    title: string | null;
    body: string | null;
    description: string | null;
    imageUrl: string | null;
    videoUrl: string | null;
    destinationUrl: string | null;
    cta: string | null;
  }>;
};

export type MetaLibraryAd = {
  adLibraryId: string;
  primaryAdLibraryId: string;
  pageId: string | null;
  pageName: string | null;
  adLibraryUrl: string;
  advertiserUrl: string | null;
  status: "ACTIVE" | "INACTIVE";
  copy: string | null;
  title: string | null;
  description: string | null;
  cta: string | null;
  ctaType: string | null;
  creative: MetaAdCreative;
  platforms: string[];
  startDate: string | null;
  endDate: string | null;
  similarAds: number | null;
  variationGroupId: string | null;
  variationCount: number | null;
  spend: MetaSpendMetric;
  impressions: MetaMetric;
  audienceSize: MetaMetric;
  metaMetrics: {
    spend: MetaSpendMetric;
    impressions: MetaMetric;
    audienceSize: MetaMetric;
  };
  metaDetailMetrics: {
    spend: MetaSpendMetric;
    impressions: MetaMetric;
    audienceSize: MetaMetric;
  };
  pathmaticsMetrics: {
    spend: MetaSpendMetric | null;
    impressions: MetaMetric | null;
    audienceSize: MetaMetric | null;
    providerStatus: PathmaticsDebugStatus;
    providerMessage: string | null;
  };
  modelMetrics: {
    impressions: MetaMetric | null;
  };
  finalMetrics: {
    spend: MetaSpendMetric;
    impressions: MetaMetric;
    audienceSize: MetaMetric;
  };
  currency: string | null;
  landingDomain: string | null;
  rawMetaData: Record<string, unknown>;
  debug: {
    metricCandidates: MetricCandidate[];
    sourceUrl: string | null;
    actorInputUrl: string | null;
    metaDetail?: {
      checkedAt: string | null;
      status?: MetaDetailStatus;
      pageUrl: string;
      transport?: "apify-playwright" | "none";
      errorMessage?: string | null;
      actorId?: string | null;
      actorRunId?: string | null;
      actorDatasetId?: string | null;
      pageLoaded?: boolean;
      mainResponseStatus?: number | null;
      mainResponseUrl?: string | null;
      visibleTextSnippet: string | null;
      structuredCandidates: MetricCandidate[];
      responses: Array<{ url: string; status: number; bodySnippet: string | null }>;
    };
    pathmatics?: {
      configured: boolean;
      status: PathmaticsDebugStatus;
      confidence: number | null;
      matchId: string | null;
      reasons: string[];
      metricLevel?: "AD" | "CREATIVE" | "CAMPAIGN" | "ADVERTISER" | "CHANNEL" | "DATE_AGGREGATE" | "UNKNOWN";
    };
    resolution?: {
      spendReason: string | null;
      impressionsReason: string | null;
      audienceReason: string | null;
    };
    model?: {
      attempted?: boolean;
      status:
        | "MODEL_NOT_AVAILABLE"
        | "GROUND_TRUTH_DATA_REQUIRED"
        | "PREDICTION_AVAILABLE"
        | "MODEL_RUNTIME_ERROR"
        | "FEATURES_INSUFFICIENT";
      modelVersion: string | null;
      datasetVersion: string | null;
      confidence: InHouseModelConfidence | null;
      distributionStatus: InHouseDistributionStatus | null;
      featureCoverage: number | null;
      reason: string | null;
      predictedFrequency: number | null;
      low: number | null;
      estimate: number | null;
      high: number | null;
      trainingRows: number | null;
      stage: "EXPERIMENTAL" | "PRODUCTION" | null;
    };
    trainingData?: {
      exactMatch: boolean;
      source: "PUBLIC_META_DISCLOSED" | null;
      adLibraryId: string | null;
      reach: number | null;
      reachLow: number | null;
      reachHigh: number | null;
      impressions: number | null;
      impressionsLow: number | null;
      impressionsHigh: number | null;
      labelStrength: string | null;
      recordId: string | null;
    };
  };
  intelligenceMatch: {
    provider: "PATHMATICS" | null;
    confidence: number | null;
    matchId: string | null;
    status: PathmaticsDebugStatus;
    reasons: string[];
  };
};

export type NormalizeMetaLibraryAdsOptions = {
  actorRunId: string;
  datasetId: string;
  onProgress?: (processed: number, total: number) => void;
};

export type NormalizeMetaLibraryAdsResult = {
  rawCount: number;
  processedCount: number;
  ads: MetaLibraryAd[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isTemporaryError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeStatus = "statusCode" in error ? (error as { statusCode?: unknown }).statusCode : undefined;
  return typeof maybeStatus === "number" && META_LIBRARY_TEMPORARY_ERROR_STATUSES.has(maybeStatus);
}

export async function withRetry<T>(
  action: () => Promise<T>,
  options?: {
    retries?: number;
    baseDelayMs?: number;
    isRetriable?: (error: unknown) => boolean;
  },
): Promise<T> {
  const retries = options?.retries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  const isRetriable = options?.isRetriable ?? isTemporaryError;

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !isRetriable(error)) {
        throw error;
      }

      const delayMs = baseDelayMs * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt += 1;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unknown retry failure.");
}

export function sanitizeMaxAds(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_ADS;
  }

  return Math.min(MAX_MAX_ADS, Math.max(MIN_MAX_ADS, Math.floor(parsed)));
}

export function validateMetaLibraryUrl(rawValue: unknown):
  | { ok: true; url: string; normalizedUrl: URL }
  | { ok: false; error: string } {
  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return { ok: false, error: "Paste a Meta Ad Library URL to continue." };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawValue.trim());
  } catch {
    return { ok: false, error: "The Meta Ad Library URL is invalid." };
  }

  if (!META_AD_LIBRARY_HOSTS.has(parsed.hostname.toLowerCase())) {
    return { ok: false, error: "The URL must use facebook.com or www.facebook.com." };
  }

  if (!parsed.pathname.toLowerCase().includes("/ads/library")) {
    return { ok: false, error: "The URL must point to Meta Ad Library (/ads/library)." };
  }

  return { ok: true, url: parsed.toString(), normalizedUrl: parsed };
}

export function buildMetaAdsActorInput(url: string, maxAds: unknown) {
  return {
    startUrls: [{ url }],
    resultsLimit: sanitizeMaxAds(maxAds),
    isDetailsPerAd: true,
    includeAboutPage: true,
    sorting: "",
  };
}

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

function pickFirst(...values: unknown[]): unknown {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

function toText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = toText(item);
      if (text) {
        return text;
      }
    }
  }

  if (isRecord(value)) {
    return toText(pickFirst(value.text, value.title, value.body, value.description, value.name, value.value));
  }

  return null;
}

function toStringArray(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(value)) {
    return [];
  }

  const items = value
    .map((item) => toText(item))
    .filter((item): item is string => Boolean(item))
    .map((item) => item.trim());

  return [...new Set(items)];
}

function toUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    if (!cleaned) {
      return null;
    }

    const numeric = Number(cleaned);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

function toIsoDate(value: unknown): string | null {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value === "string") {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber) && value.trim() !== "") {
      return toIsoDate(asNumber);
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

function parseMagnitude(rawValue: string): number | null {
  const cleaned = rawValue.replace(/,/g, "").replace(/\s+/g, "").toUpperCase();
  const match = cleaned.match(/(-?\d+(?:\.\d+)?)([KMB])?/);
  if (!match) {
    return null;
  }

  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  const multiplier =
    match[2] === "K" ? 1_000 : match[2] === "M" ? 1_000_000 : match[2] === "B" ? 1_000_000_000 : 1;

  return numeric * multiplier;
}

export function parseMetaRange(rawValue: unknown): { raw: string | null; min: number | null; max: number | null } {
  if (rawValue == null || rawValue === "") {
    return { raw: null, min: null, max: null };
  }

  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    return { raw: String(rawValue), min: rawValue, max: rawValue };
  }

  const raw = typeof rawValue === "string" ? rawValue.trim() : toText(rawValue);
  if (!raw) {
    return { raw: null, min: null, max: null };
  }

  const normalized = raw.replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  const comparatorMatch = normalized.match(/^([<>])\s*(.+)$/);
  if (comparatorMatch) {
    const boundary = parseMagnitude(comparatorMatch[2]);
    if (boundary == null) {
      return { raw, min: null, max: null };
    }

    if (comparatorMatch[1] === ">") {
      return { raw, min: boundary, max: null };
    }

    return { raw, min: null, max: boundary };
  }

  const parts = normalized.split(/\s*-\s*/);
  if (parts.length === 2) {
    const min = parseMagnitude(parts[0]);
    const max = parseMagnitude(parts[1]);
    return { raw, min, max };
  }

  const exact = parseMagnitude(normalized);
  return { raw, min: exact, max: exact };
}

function normalizeCurrency(rawValue: unknown): string | null {
  const text = toText(rawValue);
  if (!text) {
    return null;
  }

  const upper = text.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) {
    return upper;
  }

  if (text.includes("A$")) {
    return "AUD";
  }
  if (text.includes("$")) {
    return "USD";
  }
  if (text.includes("£")) {
    return "GBP";
  }
  if (text.includes("€")) {
    return "EUR";
  }

  return null;
}

function metricTimestamp() {
  return new Date().toISOString();
}

export function createCheckingMetric(source: MetaMetricSource): MetaMetric {
  return {
    raw: null,
    min: null,
    max: null,
    status: "CHECKING",
    source,
    path: null,
    dataType: null,
    confidence: null,
    retrievedAt: null,
    low: null,
    high: null,
    predictedFrequency: null,
    modelVersion: null,
    datasetVersion: null,
    featureCoverage: null,
    distributionStatus: null,
    confidenceLabel: null,
    exactReason: null,
    explanation: [],
  };
}

export function createCheckingSpendMetric(): MetaSpendMetric {
  return {
    ...createCheckingMetric("META_AD_LIBRARY"),
    currency: null,
  };
}

export function createMetaNotDisclosedMetric(source: MetaMetricSource): MetaMetric {
  return {
    ...createCheckingMetric(source),
    status: "META_NOT_DISCLOSED",
    retrievedAt: metricTimestamp(),
  };
}

export function createMetaNotDisclosedSpendMetric(source: MetaMetricSource): MetaSpendMetric {
  return {
    ...createMetaNotDisclosedMetric(source),
    currency: null,
  };
}

export function createUnavailableMetric(): MetaMetric {
  return {
    ...createCheckingMetric("NONE"),
    status: "NOT_AVAILABLE",
    retrievedAt: metricTimestamp(),
  };
}

export function createUnavailableSpendMetric(): MetaSpendMetric {
  return {
    ...createUnavailableMetric(),
    currency: null,
  };
}

function asMetric(rawValue: unknown, source: MetaMetricSource, path: string | null): MetaMetric | null {
  const parsed = parseMetaRange(rawValue);
  if (parsed.raw == null && parsed.min == null && parsed.max == null) {
    return null;
  }

  return {
    raw: parsed.raw,
    min: parsed.min,
    max: parsed.max,
    status: "META_DISCLOSED",
    source,
    path,
    dataType: "DISCLOSED",
    confidence: null,
    retrievedAt: metricTimestamp(),
    low: parsed.min,
    high: parsed.max,
    predictedFrequency: null,
    modelVersion: null,
    datasetVersion: null,
    featureCoverage: null,
    distributionStatus: null,
    confidenceLabel: null,
    exactReason: null,
    explanation: [],
  };
}

function asSpendMetric(rawValue: unknown, currencyValue: unknown, source: MetaMetricSource, path: string | null): MetaSpendMetric | null {
  const parsed = parseMetaRange(rawValue);
  const currency = normalizeCurrency(currencyValue ?? rawValue);
  if (parsed.raw == null && parsed.min == null && parsed.max == null && !currency) {
    return null;
  }

  return {
    raw: parsed.raw,
    min: parsed.min,
    max: parsed.max,
    status: "META_DISCLOSED",
    source,
    path,
    currency,
    dataType: "DISCLOSED",
    confidence: null,
    retrievedAt: metricTimestamp(),
  };
}

function readImageUrls(rawAd: Record<string, unknown>): string[] {
  const urls: string[] = [];
  const sources = [
    getPath(rawAd, "snapshot.images"),
    getPath(rawAd, "images"),
    getPath(rawAd, "snapshot.cards"),
  ];

  for (const source of sources) {
    if (!Array.isArray(source)) {
      continue;
    }

    for (const item of source) {
      if (isRecord(item)) {
        const url = toUrl(
          pickFirst(item.originalImageUrl, item.resizedImageUrl, item.imageUrl, item.url, item.src),
        );
        if (url) {
          urls.push(url);
        }
      }
    }
  }

  return [...new Set(urls)];
}

function readVideoUrls(rawAd: Record<string, unknown>): string[] {
  const urls: string[] = [];
  const sources = [getPath(rawAd, "snapshot.videos"), getPath(rawAd, "videos")];

  for (const source of sources) {
    if (!Array.isArray(source)) {
      continue;
    }

    for (const item of source) {
      if (isRecord(item)) {
        const url = toUrl(pickFirst(item.videoHdUrl, item.videoSdUrl, item.videoUrl, item.url, item.src));
        if (url) {
          urls.push(url);
        }
      }
    }
  }

  return [...new Set(urls)];
}

function readCards(rawAd: Record<string, unknown>): MetaAdCreative["cards"] {
  const cards = getPath(rawAd, "snapshot.cards");
  if (!Array.isArray(cards)) {
    return [];
  }

  return cards
    .map((card) => {
      if (!isRecord(card)) {
        return null;
      }

      return {
        title: toText(card.title),
        body: toText(card.body),
        description: toText(card.linkDescription),
        imageUrl: toUrl(pickFirst(card.originalImageUrl, card.resizedImageUrl, card.imageUrl, card.url)),
        videoUrl: toUrl(pickFirst(card.videoHdUrl, card.videoSdUrl, card.videoUrl, card.url)),
        destinationUrl: toUrl(pickFirst(card.linkUrl, card.url)),
        cta: toText(pickFirst(card.ctaText, card.ctaType)),
      };
    })
    .filter((card): card is MetaAdCreative["cards"][number] => Boolean(card));
}

function findExactMetricPath(rawAd: Record<string, unknown>, paths: string[]): { path: string; value: unknown } | null {
  for (const path of paths) {
    const value = getPath(rawAd, path);
    if (value !== undefined && value !== null && value !== "") {
      return { path, value };
    }
  }

  return null;
}

function extractSpend(rawAd: Record<string, unknown>): MetaSpendMetric {
  const direct = findExactMetricPath(rawAd, ["spend", "snapshot.spend", "ad_details.spend"]);
  const currencyValue = pickFirst(getPath(rawAd, "currency"), getPath(rawAd, "snapshot.currency"));
  const parsed = direct ? asSpendMetric(direct.value, currencyValue, direct.path === "spend" ? "META_AD_LIBRARY" : "META_AD_LIBRARY_DETAIL", direct.path) : null;
  return parsed ?? createCheckingSpendMetric();
}

function extractImpressions(rawAd: Record<string, unknown>): MetaMetric {
  const direct = findExactMetricPath(rawAd, [
    "impressionsWithIndex.impressionsText",
    "impressions",
    "snapshot.impressions",
    "ad_details.impressions",
  ]);

  if (!direct) {
    return createCheckingMetric("META_AD_LIBRARY");
  }

  const metric = asMetric(
    direct.value,
    direct.path === "impressionsWithIndex.impressionsText" || direct.path === "impressions" ? "META_AD_LIBRARY" : "META_AD_LIBRARY_DETAIL",
    direct.path,
  );

  return metric ?? createCheckingMetric("META_AD_LIBRARY");
}

function extractAudience(rawAd: Record<string, unknown>): MetaMetric {
  const direct = findExactMetricPath(rawAd, [
    "reachEstimate",
    "ad_details.aaa_info.eu_total_reach",
    "ad_details.reachEstimate",
    "snapshot.reachEstimate",
  ]);

  if (!direct) {
    return createCheckingMetric("META_AD_LIBRARY");
  }

  const source: MetaMetricSource =
    direct.path === "reachEstimate"
      ? "META_AD_LIBRARY"
      : direct.path.startsWith("ad_details.aaa_info")
        ? "META_AD_LIBRARY_DETAIL"
        : direct.path.startsWith("ad_details")
          ? "META_AD_LIBRARY_DETAIL"
          : "META_AD_LIBRARY_DETAIL";

  const metric = asMetric(direct.value, source, direct.path);
  return metric ?? createCheckingMetric("META_AD_LIBRARY");
}

function readStatus(rawAd: Record<string, unknown>): "ACTIVE" | "INACTIVE" {
  const value = pickFirst(rawAd.isActive, getPath(rawAd, "snapshot.isActive"), getPath(rawAd, "active"));
  return value === true ? "ACTIVE" : "INACTIVE";
}

function readPageName(rawAd: Record<string, unknown>): string | null {
  return toText(pickFirst(rawAd.pageName, getPath(rawAd, "snapshot.pageName"), rawAd.brand));
}

function readLandingDomain(rawAd: Record<string, unknown>): string | null {
  const url = toUrl(pickFirst(getPath(rawAd, "snapshot.linkUrl"), rawAd.linkUrl, rawAd.advertiserUrl));
  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function buildAdLibraryUrl(rawAd: Record<string, unknown>, adLibraryId: string): string {
  const exact = toUrl(pickFirst(rawAd.adLibraryUrl, rawAd.url, rawAd.sourceUrl));
  if (exact && exact.includes("/ads/library/")) {
    return exact;
  }

  const maybeInputUrl = toUrl(rawAd.inputUrl);
  if (maybeInputUrl && maybeInputUrl.includes("/ads/library")) {
    return `https://www.facebook.com/ads/library/?id=${encodeURIComponent(adLibraryId)}`;
  }

  return `https://www.facebook.com/ads/library/?id=${encodeURIComponent(adLibraryId)}`;
}

export function findMetricCandidates(obj: unknown, path = "", results: MetricCandidate[] = []): MetricCandidate[] {
  if (!obj || typeof obj !== "object") {
    return results;
  }

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;

    if (/spend|impression|reach|audience|currency/i.test(key)) {
      results.push({ path: currentPath, value });
    }

    if (value && typeof value === "object") {
      findMetricCandidates(value, currentPath, results);
    }
  }

  return results;
}

export function sanitizeRawRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    return {};
  }

  const output: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (/token|authorization|cookie|secret/i.test(key)) {
      output[key] = "[REDACTED]";
      continue;
    }

    if (Array.isArray(nestedValue)) {
      output[key] = nestedValue.map((item) => (isRecord(item) ? sanitizeRawRecord(item) : item));
      continue;
    }

    if (isRecord(nestedValue)) {
      output[key] = sanitizeRawRecord(nestedValue);
      continue;
    }

    output[key] = nestedValue;
  }

  return output;
}

function mergeDuplicateAds(existing: MetaLibraryAd, incoming: MetaLibraryAd): MetaLibraryAd {
  const mergedCards = [...existing.creative.cards];
  for (const card of incoming.creative.cards) {
    const signature = JSON.stringify(card);
    if (!mergedCards.some((existingCard) => JSON.stringify(existingCard) === signature)) {
      mergedCards.push(card);
    }
  }

  return {
    ...existing,
    pageName: existing.pageName ?? incoming.pageName,
    advertiserUrl: existing.advertiserUrl ?? incoming.advertiserUrl,
    copy: existing.copy ?? incoming.copy,
    title: existing.title ?? incoming.title,
    description: existing.description ?? incoming.description,
    cta: existing.cta ?? incoming.cta,
    ctaType: existing.ctaType ?? incoming.ctaType,
    creative: {
      ...existing.creative,
      imageUrls: [...new Set([...existing.creative.imageUrls, ...incoming.creative.imageUrls])],
      videoUrls: [...new Set([...existing.creative.videoUrls, ...incoming.creative.videoUrls])],
      cards: mergedCards,
      url: existing.creative.url ?? incoming.creative.url,
      type:
        existing.creative.type !== "unknown"
          ? existing.creative.type
          : incoming.creative.type,
    },
    platforms: [...new Set([...existing.platforms, ...incoming.platforms])],
    similarAds: existing.similarAds ?? incoming.similarAds,
    variationGroupId: existing.variationGroupId ?? incoming.variationGroupId,
    variationCount: Math.max(existing.variationCount ?? 1, incoming.variationCount ?? 1),
    spend: existing.spend.status === "META_DISCLOSED" ? existing.spend : incoming.spend,
    impressions: existing.impressions.status === "META_DISCLOSED" ? existing.impressions : incoming.impressions,
    audienceSize: existing.audienceSize.status === "META_DISCLOSED" ? existing.audienceSize : incoming.audienceSize,
    metaMetrics: existing.metaMetrics,
    metaDetailMetrics: existing.metaDetailMetrics,
    pathmaticsMetrics: existing.pathmaticsMetrics,
    modelMetrics: existing.modelMetrics,
    finalMetrics: existing.finalMetrics,
    landingDomain: existing.landingDomain ?? incoming.landingDomain,
    rawMetaData: existing.rawMetaData,
    debug: {
      ...existing.debug,
      metricCandidates: [...existing.debug.metricCandidates, ...incoming.debug.metricCandidates],
      model: existing.debug.model ?? incoming.debug.model,
    },
    intelligenceMatch: existing.intelligenceMatch,
  };
}

export function normalizeMetaLibraryAd(
  rawAd: Record<string, unknown>,
  source: { actorRunId: string; datasetId: string },
): MetaLibraryAd | null {
  const adLibraryId = toText(pickFirst(rawAd.adArchiveID, rawAd.adArchiveId, rawAd.libraryID, rawAd.id));
  if (!adLibraryId) {
    return null;
  }

  const imageUrls = readImageUrls(rawAd);
  const videoUrls = readVideoUrls(rawAd);
  const creativeType: MetaAdCreative["type"] =
    imageUrls.length > 0 && videoUrls.length > 0
      ? "mixed"
      : videoUrls.length > 0
        ? "video"
        : imageUrls.length > 0
          ? "image"
          : "unknown";

  const copy = toText(pickFirst(getPath(rawAd, "snapshot.body.text"), rawAd.copy, rawAd.body));
  const title = toText(pickFirst(getPath(rawAd, "snapshot.title"), rawAd.title, rawAd.linkTitle));
  const description = toText(
    pickFirst(getPath(rawAd, "snapshot.linkDescription"), rawAd.description, rawAd.linkDescription),
  );
  const cta = toText(pickFirst(getPath(rawAd, "snapshot.ctaText"), rawAd.ctaText));
  const ctaType = toText(pickFirst(getPath(rawAd, "snapshot.ctaType"), rawAd.ctaType));
  const metricCandidates = findMetricCandidates(rawAd);

  const normalized: MetaLibraryAd = {
    adLibraryId,
    primaryAdLibraryId: adLibraryId,
    pageId: toText(pickFirst(rawAd.pageID, rawAd.pageId, getPath(rawAd, "snapshot.pageId"))),
    pageName: readPageName(rawAd),
    adLibraryUrl: buildAdLibraryUrl(rawAd, adLibraryId),
    advertiserUrl: toUrl(pickFirst(getPath(rawAd, "snapshot.linkUrl"), rawAd.linkUrl, rawAd.advertiserUrl)),
    status: readStatus(rawAd),
    copy,
    title,
    description,
    cta,
    ctaType,
    creative: {
      type: creativeType,
      url: videoUrls[0] ?? imageUrls[0] ?? null,
      imageUrls,
      videoUrls,
      cards: readCards(rawAd),
    },
    platforms: toStringArray(pickFirst(rawAd.publisherPlatform, rawAd.platforms)),
    startDate: toIsoDate(pickFirst(rawAd.startDateFormatted, rawAd.startDate)),
    endDate: toIsoDate(pickFirst(rawAd.endDateFormatted, rawAd.endDate)),
    similarAds: toNumber(pickFirst(rawAd.collationCount, rawAd.similarAds, rawAd.similarAdCount)),
    variationGroupId: toText(pickFirst(rawAd.collationId, rawAd.variationGroupId)),
    variationCount: toNumber(pickFirst(rawAd.collationCount, rawAd.variationCount, rawAd.similarAdCount)),
    spend: extractSpend(rawAd),
    impressions: extractImpressions(rawAd),
    audienceSize: extractAudience(rawAd),
    metaMetrics: {
      spend: createCheckingSpendMetric(),
      impressions: createCheckingMetric("META_AD_LIBRARY"),
      audienceSize: createCheckingMetric("META_AD_LIBRARY"),
    },
    metaDetailMetrics: {
      spend: createCheckingSpendMetric(),
      impressions: createCheckingMetric("META_AD_LIBRARY_DETAIL"),
      audienceSize: createCheckingMetric("META_AD_LIBRARY_DETAIL"),
    },
    pathmaticsMetrics: {
      spend: null,
      impressions: null,
      audienceSize: null,
      providerStatus: "PENDING",
      providerMessage: null,
    },
    modelMetrics: {
      impressions: null,
    },
    finalMetrics: {
      spend: createCheckingSpendMetric(),
      impressions: createCheckingMetric("META_AD_LIBRARY"),
      audienceSize: createCheckingMetric("META_AD_LIBRARY"),
    },
    currency: normalizeCurrency(pickFirst(rawAd.currency, rawAd.spend)),
    landingDomain: readLandingDomain(rawAd),
    rawMetaData: sanitizeRawRecord({
      ...rawAd,
      _source: source,
    }),
    debug: {
      metricCandidates,
      sourceUrl: toUrl(rawAd.sourceUrl),
      actorInputUrl: toUrl(rawAd.inputUrl),
      model: {
        attempted: false,
        status: "MODEL_NOT_AVAILABLE",
        modelVersion: null,
        datasetVersion: null,
        confidence: null,
        distributionStatus: null,
        featureCoverage: null,
        reason: "No production in-house impressions model has been loaded.",
        predictedFrequency: null,
        low: null,
        estimate: null,
        high: null,
        trainingRows: null,
        stage: null,
      },
    },
    intelligenceMatch: {
      provider: null,
      confidence: null,
      matchId: null,
      status: "PENDING",
      reasons: [],
    },
  };

  normalized.metaMetrics = {
    spend: { ...normalized.spend },
    impressions: { ...normalized.impressions },
    audienceSize: { ...normalized.audienceSize },
  };
  normalized.metaDetailMetrics = {
    spend: createCheckingSpendMetric(),
    impressions: createCheckingMetric("META_AD_LIBRARY_DETAIL"),
    audienceSize: createCheckingMetric("META_AD_LIBRARY_DETAIL"),
  };
  normalized.pathmaticsMetrics = {
    spend: null,
    impressions: null,
    audienceSize: null,
    providerStatus: "PENDING",
    providerMessage: null,
  };
  normalized.modelMetrics = {
    impressions: null,
  };
  normalized.finalMetrics = {
    spend: { ...normalized.spend },
    impressions: { ...normalized.impressions },
    audienceSize: { ...normalized.audienceSize },
  };

  if (process.env.NODE_ENV !== "production") {
    const spendCandidate = metricCandidates.find((candidate) => /spend/i.test(candidate.path));
    const impressionsCandidate = metricCandidates.find((candidate) => /impression/i.test(candidate.path));
    const reachCandidate = metricCandidates.find((candidate) => /reach|audience/i.test(candidate.path));
    console.log("[meta-ads] metric-inspector", {
      adLibraryId,
      spendPath: normalized.spend.path,
      spendCandidate: spendCandidate?.path ?? null,
      currencyPath: normalized.spend.currency ? "currency" : null,
      impressionsPath: normalized.impressions.path,
      impressionsCandidate: impressionsCandidate?.path ?? null,
      reachPath: normalized.audienceSize.path,
      reachCandidate: reachCandidate?.path ?? null,
      candidatePaths: metricCandidates.slice(0, 30).map((candidate) => candidate.path),
    });
  }

  return normalized;
}

export function normalizeMetaLibraryAds(
  rawItems: unknown,
  options: NormalizeMetaLibraryAdsOptions,
): NormalizeMetaLibraryAdsResult {
  const items = Array.isArray(rawItems)
    ? rawItems
    : isRecord(rawItems) && Array.isArray(rawItems.items)
      ? rawItems.items
      : [];

  const adsById = new Map<string, MetaLibraryAd>();
  let processedCount = 0;

  for (const item of items) {
    if (!isRecord(item)) {
      continue;
    }

    const normalized = normalizeMetaLibraryAd(item, {
      actorRunId: options.actorRunId,
      datasetId: options.datasetId,
    });

    processedCount += 1;
    options.onProgress?.(processedCount, items.length);

    if (!normalized) {
      continue;
    }

    const existing = adsById.get(normalized.primaryAdLibraryId);
    adsById.set(
      normalized.primaryAdLibraryId,
      existing ? mergeDuplicateAds(existing, normalized) : normalized,
    );
  }

  return {
    rawCount: items.length,
    processedCount,
    ads: [...adsById.values()],
  };
}
