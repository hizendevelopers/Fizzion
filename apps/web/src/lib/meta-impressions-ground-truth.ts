import type { MetaLibraryAd } from "@/lib/meta-library";

export const META_IMPRESSIONS_GROUND_TRUTH_TABLE = "meta_impressions_ground_truth_labels";
export const META_ADS_INSIGHTS_IMPORT_RUNS_TABLE = "meta_ads_insights_import_runs";
export const META_IMPRESSIONS_DATASET_SNAPSHOTS_TABLE = "meta_impressions_dataset_snapshots";
export const META_IMPRESSIONS_MODEL_REGISTRY_TABLE = "meta_impressions_model_registry";
export const META_IMPRESSION_PREDICTIONS_TABLE = "meta_impression_predictions";

export type GroundTruthLabelQuality =
  | "EXACT_AUTHORIZED_META"
  | "PUBLIC_META_DISCLOSED"
  | "THIRD_PARTY_ESTIMATE";

export type GroundTruthLabelStrength = "STRONG" | "WEAK_RANGE";

export type GroundTruthSource =
  | "META_ADS_INSIGHTS"
  | "PUBLIC_META_AD_LIBRARY"
  | "THIRD_PARTY_ESTIMATE";

export type GroundTruthAlignmentResult = {
  isLabelAligned: boolean;
  measurementScope: string | null;
  geoScope: string | null;
  reasons: string[];
};

export type GroundTruthLabelRecord = {
  recordId: string;
  source: GroundTruthSource;
  labelQuality: GroundTruthLabelQuality;
  labelStrength: GroundTruthLabelStrength;
  sourceRecordId: string;
  adLibraryId: string | null;
  metaAdId: string | null;
  advertiserId: string | null;
  advertiserName: string | null;
  campaignId: string | null;
  adsetId: string | null;
  platforms: string[];
  platformPositions: string[];
  country: string | null;
  geoScope: string | null;
  measurementScope: string | null;
  measurementStart: string;
  measurementEnd: string;
  startDate: string | null;
  endDate: string | null;
  activeDays: number | null;
  creativeType: string | null;
  ctaType: string | null;
  landingDomain: string | null;
  landingUrl: string | null;
  adText: string | null;
  headline: string | null;
  description: string | null;
  reachLow: number | null;
  reachHigh: number | null;
  reach: number | null;
  impressionsLow: number | null;
  impressionsHigh: number | null;
  impressions: number | null;
  frequency: number | null;
  weakFrequencyLow: number | null;
  weakFrequencyHigh: number | null;
  spend: number | null;
  spendLow: number | null;
  spendHigh: number | null;
  spendCurrency: string | null;
  isLabelAligned: boolean;
  alignmentNotes: string[];
  qualityFlags: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
  retrievedAt: string;
};

function normalizeDateOnly(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

export function deriveActiveDays(startDate: string | null | undefined, endDate: string | null | undefined) {
  const start = normalizeDateOnly(startDate);
  const end = normalizeDateOnly(endDate ?? startDate);
  if (!start || !end) {
    return null;
  }

  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return null;
  }

  return Math.floor((endMs - startMs) / 86_400_000) + 1;
}

export function inferPublicMetaMeasurementScope(ad: MetaLibraryAd) {
  if (ad.audienceSize.path === "ad_details.aaa_info.eu_total_reach") {
    return {
      geoScope: "EU_TRANSPARENCY",
      measurementScope: "EU_TRANSPARENCY",
      reasons: ["Audience came from ad_details.aaa_info.eu_total_reach, which has a special transparency scope."],
    };
  }

  if (ad.audienceSize.path === "reachEstimate") {
    return {
      geoScope: "UNKNOWN_PUBLIC_META",
      measurementScope: "UNKNOWN_PUBLIC_META",
      reasons: ["Audience came from generic public reachEstimate with unresolved reporting scope."],
    };
  }

  return {
    geoScope: "UNKNOWN_PUBLIC_META",
    measurementScope: "UNKNOWN_PUBLIC_META",
    reasons: ["Public Meta metric scope is not yet fully resolved."],
  };
}

export function validatePublicMetaAlignment(ad: MetaLibraryAd): GroundTruthAlignmentResult {
  const reasons: string[] = [];

  if (ad.audienceSize.status !== "META_DISCLOSED") {
    reasons.push("Audience/reach is missing.");
  }

  if (ad.impressions.status !== "META_DISCLOSED") {
    reasons.push("Impressions are missing.");
  }

  const scope = inferPublicMetaMeasurementScope(ad);
  reasons.push(...scope.reasons);

  if (!ad.startDate || !ad.endDate) {
    reasons.push("Public Meta ad dates are incomplete.");
  }

  if (scope.measurementScope !== "PUBLIC_META_DISCLOSED_COMPATIBLE") {
    reasons.push("Public Meta reach and impressions are not proven to share the same measurement scope.");
  }

  return {
    isLabelAligned: reasons.length === 0,
    measurementScope: scope.measurementScope,
    geoScope: scope.geoScope,
    reasons,
  };
}

export function buildPublicMetaGroundTruthRecord(
  ad: MetaLibraryAd,
  options?: {
    sourceRecordId?: string;
    retrievedAt?: string;
  },
): GroundTruthLabelRecord {
  const alignment = validatePublicMetaAlignment(ad);
  const measurementStart = normalizeDateOnly(ad.startDate) ?? new Date().toISOString().slice(0, 10);
  const measurementEnd = normalizeDateOnly(ad.endDate ?? ad.startDate) ?? measurementStart;
  const reachLow = ad.audienceSize.min;
  const reachHigh = ad.audienceSize.max;
  const impressionsLow = ad.impressions.min;
  const impressionsHigh = ad.impressions.max;
  const spendLow = ad.spend.min;
  const spendHigh = ad.spend.max;
  const weakFrequencyLow =
    reachHigh != null && reachHigh > 0 && impressionsLow != null
      ? impressionsLow / reachHigh
      : null;
  const weakFrequencyHigh =
    reachLow != null && reachLow > 0 && impressionsHigh != null
      ? impressionsHigh / reachLow
      : null;
  const hasExactReach = reachLow != null && reachHigh != null && reachLow === reachHigh;
  const hasExactImpressions =
    impressionsLow != null && impressionsHigh != null && impressionsLow === impressionsHigh;
  const frequency = hasExactReach && hasExactImpressions && reachLow > 0 ? impressionsLow / reachLow : null;

  return {
    recordId: `public-meta-${ad.adLibraryId}-${measurementStart}-${measurementEnd}`,
    source: "PUBLIC_META_AD_LIBRARY",
    labelQuality: "PUBLIC_META_DISCLOSED",
    labelStrength: hasExactReach && hasExactImpressions ? "STRONG" : "WEAK_RANGE",
    sourceRecordId: options?.sourceRecordId ?? ad.adLibraryId,
    adLibraryId: ad.adLibraryId,
    metaAdId: null,
    advertiserId: ad.pageId,
    advertiserName: ad.pageName,
    campaignId: null,
    adsetId: null,
    platforms: ad.platforms,
    platformPositions: [],
    country: null,
    geoScope: alignment.geoScope,
    measurementScope: alignment.measurementScope,
    measurementStart,
    measurementEnd,
    startDate: normalizeDateOnly(ad.startDate),
    endDate: normalizeDateOnly(ad.endDate),
    activeDays: deriveActiveDays(ad.startDate, ad.endDate),
    creativeType: ad.creative.type.toUpperCase(),
    ctaType: ad.ctaType,
    landingDomain: ad.landingDomain,
    landingUrl: ad.advertiserUrl,
    adText: ad.copy,
    headline: ad.title,
    description: ad.description,
    reachLow,
    reachHigh,
    reach: hasExactReach ? reachLow : null,
    impressionsLow,
    impressionsHigh,
    impressions: hasExactImpressions ? impressionsLow : null,
    frequency,
    weakFrequencyLow,
    weakFrequencyHigh,
    spend: spendLow != null && spendHigh != null && spendLow == spendHigh ? spendLow : null,
    spendLow,
    spendHigh,
    spendCurrency: ad.spend.currency,
    isLabelAligned: alignment.isLabelAligned,
    alignmentNotes: alignment.reasons,
    qualityFlags: {
      audienceStatus: ad.audienceSize.status,
      impressionsStatus: ad.impressions.status,
      audiencePath: ad.audienceSize.path,
      impressionsPath: ad.impressions.path,
    },
    rawPayload: ad.rawMetaData,
    retrievedAt: options?.retrievedAt ?? new Date().toISOString(),
  };
}
