import type { MetaLibraryAd, MetaMetric, MetaSpendMetric } from "@/lib/meta-library";

export type ProviderMatchStatus =
  | "PROVIDER_DISABLED"
  | "PROVIDER_AUTH_ERROR"
  | "PROVIDER_RATE_LIMITED"
  | "NO_MATCH"
  | "LOW_CONFIDENCE_MATCH"
  | "MATCH_FOUND";

export type ProviderMatch = {
  provider: "PATHMATICS";
  status: ProviderMatchStatus;
  confidence: number | null;
  matchId: string | null;
  reasons: string[];
  message: string | null;
};

export interface AdIntelligenceProvider {
  readonly name: "PATHMATICS";
  isConfigured(): boolean;
  getMinimumConfidence(): number;
  findAdMatch(ad: MetaLibraryAd): Promise<ProviderMatch>;
  getSpend(match: ProviderMatch, ad: MetaLibraryAd): Promise<MetaSpendMetric | null>;
  getImpressions(match: ProviderMatch, ad: MetaLibraryAd): Promise<MetaMetric | null>;
  getAudience(match: ProviderMatch, ad: MetaLibraryAd): Promise<MetaMetric | null>;
}

export type PathmaticsMatchCandidate = {
  providerRecordId: string;
  advertiserName?: string | null;
  landingDomain?: string | null;
  platform?: string | null;
  country?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  headline?: string | null;
  copy?: string | null;
  landingUrl?: string | null;
  creativeFingerprint?: string | null;
};

export type PathmaticsMatchScore = {
  score: number;
  confidence: number;
  level: "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
};

function pathmaticsEnabled() {
  return String(process.env.PATHMATICS_ENABLED ?? "false").toLowerCase() === "true";
}

function pathmaticsMinConfidence() {
  const value = Number(process.env.PATHMATICS_MIN_CONFIDENCE ?? "80");
  return Number.isFinite(value) ? value : 80;
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function domainFromUrl(url: string | null | undefined) {
  if (!url) {
    return "";
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function datesOverlapDays(
  startA: string | null | undefined,
  endA: string | null | undefined,
  startB: string | null | undefined,
  endB: string | null | undefined,
) {
  const aStart = startA ? Date.parse(startA) : Number.NaN;
  const aEnd = endA ? Date.parse(endA) : aStart;
  const bStart = startB ? Date.parse(startB) : Number.NaN;
  const bEnd = endB ? Date.parse(endB) : bStart;

  if (!Number.isFinite(aStart) || !Number.isFinite(bStart)) {
    return 0;
  }

  const overlapStart = Math.max(aStart, bStart);
  const overlapEnd = Math.min(Number.isFinite(aEnd) ? aEnd : aStart, Number.isFinite(bEnd) ? bEnd : bStart);
  if (overlapEnd < overlapStart) {
    return 0;
  }

  return Math.round((overlapEnd - overlapStart) / 86_400_000) + 1;
}

export function scorePathmaticsCandidate(ad: MetaLibraryAd, candidate: PathmaticsMatchCandidate): PathmaticsMatchScore {
  let score = 0;
  const reasons: string[] = [];

  const adAdvertiser = normalizeText(ad.pageName);
  const candidateAdvertiser = normalizeText(candidate.advertiserName);
  if (adAdvertiser && candidateAdvertiser && adAdvertiser === candidateAdvertiser) {
    score += 25;
    reasons.push("Advertiser exact match");
  }

  const adDomain = normalizeText(ad.landingDomain);
  const candidateDomain = normalizeText(candidate.landingDomain) || domainFromUrl(candidate.landingUrl);
  if (adDomain && candidateDomain && adDomain === candidateDomain) {
    score += 15;
    reasons.push("Landing domain exact match");
  }

  const candidatePlatform = normalizeText(candidate.platform);
  if (
    candidatePlatform &&
    ad.platforms.some((platform) => normalizeText(platform) === candidatePlatform)
  ) {
    score += 10;
    reasons.push("Platform match");
  }

  const adCountry = normalizeText(
    typeof ad.rawMetaData.targetedOrReachedCountries === "string"
      ? ad.rawMetaData.targetedOrReachedCountries
      : Array.isArray(ad.rawMetaData.targetedOrReachedCountries)
        ? ad.rawMetaData.targetedOrReachedCountries.join(",")
        : null,
  );
  if (adCountry && candidate.country && adCountry.includes(normalizeText(candidate.country))) {
    score += 5;
    reasons.push("Country match");
  }

  const overlapDays = datesOverlapDays(ad.startDate, ad.endDate, candidate.startDate, candidate.endDate);
  if (overlapDays >= 7) {
    score += 15;
    reasons.push("Strong date overlap");
  } else if (overlapDays >= 1) {
    score += 8;
    reasons.push("Partial date overlap");
  }

  if (ad.creative.url && candidate.creativeFingerprint && ad.creative.url === candidate.creativeFingerprint) {
    score += 20;
    reasons.push("Creative fingerprint match");
  }

  if (ad.title && candidate.headline && normalizeText(ad.title) === normalizeText(candidate.headline)) {
    score += 5;
    reasons.push("Headline exact match");
  }

  if (ad.copy && candidate.copy && normalizeText(ad.copy) === normalizeText(candidate.copy)) {
    score += 5;
    reasons.push("Copy exact match");
  }

  const adLandingUrl = normalizeText(
    typeof ad.rawMetaData.linkUrl === "string" ? ad.rawMetaData.linkUrl : null,
  );
  if (adLandingUrl && candidate.landingUrl && adLandingUrl === normalizeText(candidate.landingUrl)) {
    score += 5;
    reasons.push("Landing URL exact match");
  }

  const confidence = Math.max(0, Math.min(1, score / 100));
  const level = score >= 90 ? "VERY_HIGH" : score >= 80 ? "HIGH" : score >= 70 ? "MEDIUM" : "LOW";

  return {
    score,
    confidence,
    level,
    reasons,
  };
}

class DisabledPathmaticsProvider implements AdIntelligenceProvider {
  readonly name = "PATHMATICS" as const;

  isConfigured() {
    return false;
  }

  getMinimumConfidence() {
    return pathmaticsMinConfidence();
  }

  async findAdMatch(_ad: MetaLibraryAd): Promise<ProviderMatch> {
    return {
      provider: "PATHMATICS",
      status: pathmaticsEnabled() ? "PROVIDER_AUTH_ERROR" : "PROVIDER_DISABLED",
      confidence: null,
      matchId: null,
      reasons: pathmaticsEnabled()
        ? ["Pathmatics was enabled in app config, but no authorized Sensor Tower integration is installed in this repository."]
        : ["Pathmatics is not configured in this environment."],
      message: pathmaticsEnabled()
        ? "Authorized Pathmatics integration is not available in this codebase."
        : "Pathmatics provider not configured.",
    };
  }

  async getSpend() {
    return null;
  }

  async getImpressions() {
    return null;
  }

  async getAudience() {
    return null;
  }
}

let providerInstance: AdIntelligenceProvider | null = null;

export function getPathmaticsProvider(): AdIntelligenceProvider {
  if (!providerInstance) {
    providerInstance = new DisabledPathmaticsProvider();
  }

  return providerInstance;
}
