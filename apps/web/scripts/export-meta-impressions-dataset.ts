import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildPublicMetaGroundTruthRecord,
  META_IMPRESSIONS_DATASET_SNAPSHOTS_TABLE,
  META_IMPRESSIONS_GROUND_TRUTH_TABLE,
  type GroundTruthLabelRecord,
} from "@/lib/meta-impressions-ground-truth";
import { getOptionalSupabaseAdminClient } from "@/lib/supabase/server";

type MetaLibraryAdRow = {
  job_id: string;
  ad_library_id: string;
  raw_meta_data: Record<string, unknown>;
  spend_json: Record<string, unknown>;
  impressions_json: Record<string, unknown>;
  audience_size_json: Record<string, unknown>;
  meta_metrics_json: Record<string, unknown>;
  final_metrics_json: Record<string, unknown>;
  debug_json: Record<string, unknown>;
  page_id: string | null;
  page_name: string | null;
  advertiser_url: string | null;
  ad_library_url: string;
  status: "ACTIVE" | "INACTIVE";
  platforms: string[];
  start_date: string | null;
  end_date: string | null;
  landing_domain: string | null;
  creative_type: string | null;
  cta_type: string | null;
  similar_ads: number | null;
  variation_group_id: string | null;
  variation_count: number | null;
  created_at: string;
};

type MetaAdsJobRow = {
  id: string;
  ads_json: unknown[];
  created_at: string;
};

function parseArgs(argv: string[]) {
  const options = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      options.set(value.slice(2), "true");
      continue;
    }
    options.set(value.slice(2), next);
    index += 1;
  }
  return options;
}

function countBy<T>(items: T[], selector: (item: T) => string | null | undefined) {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = selector(item);
    if (!key) {
      continue;
    }
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function collectPlatforms(records: GroundTruthLabelRecord[]) {
  const counts: Record<string, number> = {};
  for (const record of records) {
    for (const platform of record.platforms) {
      counts[platform] = (counts[platform] ?? 0) + 1;
    }
  }
  return counts;
}

function normalizePersistedMetaLibraryAd(row: MetaLibraryAdRow) {
  return {
    adLibraryId: row.ad_library_id,
    primaryAdLibraryId: row.ad_library_id,
    pageId: row.page_id,
    pageName: row.page_name,
    adLibraryUrl: row.ad_library_url,
    advertiserUrl: row.advertiser_url,
    status: row.status,
    copy: null,
    title: null,
    description: null,
    cta: null,
    ctaType: row.cta_type,
    creative: {
      type:
        row.creative_type === "image" ||
        row.creative_type === "video" ||
        row.creative_type === "mixed"
          ? row.creative_type
          : "unknown",
      url: null,
      imageUrls: [],
      videoUrls: [],
      cards: [],
    },
    platforms: Array.isArray(row.platforms) ? row.platforms : [],
    startDate: row.start_date,
    endDate: row.end_date,
    similarAds: row.similar_ads,
    variationGroupId: row.variation_group_id,
    variationCount: row.variation_count,
    spend: row.spend_json,
    impressions: row.impressions_json,
    audienceSize: row.audience_size_json,
    metaMetrics: row.meta_metrics_json,
    metaDetailMetrics: {
      spend: null,
      impressions: null,
      audienceSize: null,
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
    finalMetrics: row.final_metrics_json,
    currency: null,
    landingDomain: row.landing_domain,
    rawMetaData: row.raw_meta_data,
    debug: row.debug_json,
    intelligenceMatch: {
      provider: null,
      confidence: null,
      matchId: null,
      status: "PENDING",
      reasons: [],
    },
  } as unknown as Parameters<typeof buildPublicMetaGroundTruthRecord>[0];
}

async function loadAuthorizedLabels(organizationId: string) {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return [] as GroundTruthLabelRecord[];
  }

  const { data, error } = await supabase
    .from(META_IMPRESSIONS_GROUND_TRUTH_TABLE)
    .select("*")
    .eq("organization_id", organizationId)
    .order("measurement_start", { ascending: true });

  if (error || !data) {
    console.warn("[meta-impressions] unable to load authorized labels", error?.message ?? "unknown error");
    return [] as GroundTruthLabelRecord[];
  }

  return (data as Record<string, unknown>[]).map((row) => ({
    recordId: String(row.record_id ?? ""),
    source: row.source as GroundTruthLabelRecord["source"],
    labelQuality: row.label_quality as GroundTruthLabelRecord["labelQuality"],
    labelStrength: (row.label_strength as GroundTruthLabelRecord["labelStrength"]) ?? "STRONG",
    sourceRecordId: String(row.source_record_id ?? ""),
    adLibraryId: typeof row.ad_library_id === "string" ? row.ad_library_id : null,
    metaAdId: typeof row.meta_ad_id === "string" ? row.meta_ad_id : null,
    advertiserId: typeof row.advertiser_id === "string" ? row.advertiser_id : null,
    advertiserName: typeof row.advertiser_name === "string" ? row.advertiser_name : null,
    campaignId: typeof row.campaign_id === "string" ? row.campaign_id : null,
    adsetId: typeof row.adset_id === "string" ? row.adset_id : null,
    platforms: Array.isArray(row.platforms) ? row.platforms.filter((item): item is string => typeof item === "string") : [],
    platformPositions: Array.isArray(row.platform_positions)
      ? row.platform_positions.filter((item): item is string => typeof item === "string")
      : [],
    country: typeof row.country === "string" ? row.country : null,
    geoScope: typeof row.geo_scope === "string" ? row.geo_scope : null,
    measurementScope: typeof row.measurement_scope === "string" ? row.measurement_scope : null,
    measurementStart: String(row.measurement_start ?? ""),
    measurementEnd: String(row.measurement_end ?? ""),
    startDate: typeof row.start_date === "string" ? row.start_date : null,
    endDate: typeof row.end_date === "string" ? row.end_date : null,
    activeDays: typeof row.active_days === "number" ? row.active_days : null,
    creativeType: typeof row.creative_type === "string" ? row.creative_type : null,
    ctaType: typeof row.cta_type === "string" ? row.cta_type : null,
    landingDomain: typeof row.landing_domain === "string" ? row.landing_domain : null,
    landingUrl: typeof row.landing_url === "string" ? row.landing_url : null,
    adText: typeof row.ad_text === "string" ? row.ad_text : null,
    headline: typeof row.headline === "string" ? row.headline : null,
    description: typeof row.description === "string" ? row.description : null,
    reachLow: typeof row.reach_low === "number" ? row.reach_low : null,
    reachHigh: typeof row.reach_high === "number" ? row.reach_high : null,
    reach: typeof row.reach === "number" ? row.reach : null,
    impressionsLow: typeof row.impressions_low === "number" ? row.impressions_low : null,
    impressionsHigh: typeof row.impressions_high === "number" ? row.impressions_high : null,
    impressions: typeof row.impressions === "number" ? row.impressions : null,
    frequency: typeof row.frequency === "number" ? row.frequency : null,
    weakFrequencyLow:
      typeof row.weak_frequency_low === "number" ? row.weak_frequency_low : null,
    weakFrequencyHigh:
      typeof row.weak_frequency_high === "number" ? row.weak_frequency_high : null,
    spend: typeof row.spend === "number" ? row.spend : null,
    spendLow: typeof row.spend_low === "number" ? row.spend_low : null,
    spendHigh: typeof row.spend_high === "number" ? row.spend_high : null,
    spendCurrency: typeof row.spend_currency === "string" ? row.spend_currency : null,
    isLabelAligned: Boolean(row.is_label_aligned),
    alignmentNotes: Array.isArray(row.alignment_notes)
      ? row.alignment_notes.filter((item): item is string => typeof item === "string")
      : [],
    qualityFlags: (row.quality_flags as Record<string, unknown>) ?? {},
    rawPayload: (row.raw_payload as Record<string, unknown>) ?? {},
    retrievedAt: String(row.retrieved_at ?? new Date().toISOString()),
  }));
}

async function loadPublicMetaCandidates() {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return [] as GroundTruthLabelRecord[];
  }

  const persistedAdsResponse = await supabase
    .from("meta_library_ads")
    .select("*")
    .order("created_at", { ascending: true });

  if (!persistedAdsResponse.error && persistedAdsResponse.data) {
    const rows = persistedAdsResponse.data as MetaLibraryAdRow[];
    const records: GroundTruthLabelRecord[] = [];

    for (const row of rows) {
      const ad = normalizePersistedMetaLibraryAd(row);
      if (!ad) {
        continue;
      }
      records.push(
        buildPublicMetaGroundTruthRecord(ad, {
          sourceRecordId: `${row.job_id}:${row.ad_library_id}`,
          retrievedAt: row.created_at,
        }),
      );
    }

    return records;
  }

  console.warn(
    "[meta-impressions] falling back to meta_ads_jobs because meta_library_ads is unavailable",
    persistedAdsResponse.error?.message ?? "unknown error",
  );

  const { data, error } = await supabase
    .from("meta_ads_jobs")
    .select("id, ads_json, created_at")
    .eq("status", "COMPLETE")
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.warn("[meta-impressions] unable to load meta_ads_jobs fallback", error?.message ?? "unknown error");
    return [] as GroundTruthLabelRecord[];
  }

  const rows = data as MetaAdsJobRow[];
  const records: GroundTruthLabelRecord[] = [];

  for (const row of rows) {
    for (const rawAd of Array.isArray(row.ads_json) ? row.ads_json : []) {
      if (!rawAd || typeof rawAd !== "object") {
        continue;
      }
      records.push(
        buildPublicMetaGroundTruthRecord(rawAd as Parameters<typeof buildPublicMetaGroundTruthRecord>[0], {
          sourceRecordId: `${row.id}:${String((rawAd as Record<string, unknown>).adLibraryId ?? "unknown")}`,
          retrievedAt: row.created_at,
        }),
      );
    }
  }

  return records;
}

async function persistDatasetSnapshot(organizationId: string, metadata: Record<string, unknown>) {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  await supabase.from(META_IMPRESSIONS_DATASET_SNAPSHOTS_TABLE).upsert(
    {
      organization_id: organizationId,
      dataset_version: metadata.datasetVersion,
      dataset_created_at: metadata.datasetCreatedAt,
      record_count: metadata.recordCount,
      aligned_record_count: metadata.alignedRecordCount,
      rejected_record_count: metadata.rejectedRecordCount,
      unique_advertiser_count: metadata.uniqueAdvertiserCount,
      date_min: metadata.dateMin,
      date_max: metadata.dateMax,
      source_counts: metadata.sourceCounts,
      geo_counts: metadata.geoCounts,
      platform_counts: metadata.platformCounts,
      creative_type_counts: metadata.creativeTypeCounts,
      output_manifest: metadata.outputManifest,
      metadata,
    },
    { onConflict: "organization_id,dataset_version" },
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const organizationId = args.get("organization-id") ?? "";
  const datasetVersion = args.get("dataset-version") ?? `${new Date().toISOString().slice(0, 10)}-v1`;
  const outputDir =
    args.get("output-dir") ??
    path.resolve(process.cwd(), "..", "..", "ml", "datasets", datasetVersion);

  const authorizedLabels = organizationId ? await loadAuthorizedLabels(organizationId) : [];
  const publicLabels = await loadPublicMetaCandidates();
  const dedupedPublicLabels = new Map(publicLabels.map((record) => [record.recordId, record]));

  const deduped = new Map<string, GroundTruthLabelRecord>();
  for (const record of [...authorizedLabels, ...publicLabels]) {
    deduped.set(record.recordId, record);
  }

  const allRecords = [...deduped.values()];
  const publicRowsWithMetricPairs = [...dedupedPublicLabels.values()].filter(
    (record) =>
      (record.reachLow != null || record.reach != null) &&
      (record.impressionsLow != null || record.impressions != null),
  );
  const alignedRecords = allRecords.filter((record) => record.isLabelAligned);
  const rejectedRecords = allRecords.filter((record) => !record.isLabelAligned);
  const uniqueAdvertisers = new Set(
    alignedRecords
      .map((record) => record.advertiserName?.trim().toLowerCase())
      .filter((value): value is string => Boolean(value)),
  );

  const dates = alignedRecords.flatMap((record) => [record.measurementStart, record.measurementEnd]).filter(Boolean);
  const dateMin = dates.length ? [...dates].sort()[0] : null;
  const dateMax = dates.length ? [...dates].sort().at(-1) ?? null : null;

  mkdirSync(outputDir, { recursive: true });
  const recordsPath = path.join(outputDir, "records.jsonl");
  const rejectedRecordsPath = path.join(outputDir, "rejected-records.jsonl");
  const metadataPath = path.join(outputDir, "metadata.json");

  writeFileSync(recordsPath, `${alignedRecords.map((record) => JSON.stringify(record)).join("\n")}${alignedRecords.length ? "\n" : ""}`);
  writeFileSync(
    rejectedRecordsPath,
    `${rejectedRecords.map((record) => JSON.stringify(record)).join("\n")}${rejectedRecords.length ? "\n" : ""}`,
  );

  const metadata = {
    datasetVersion,
    datasetCreatedAt: new Date().toISOString(),
    recordCount: allRecords.length,
    alignedRecordCount: alignedRecords.length,
    rejectedRecordCount: rejectedRecords.length,
    uniqueAdvertiserCount: uniqueAdvertisers.size,
    dateMin,
    dateMax,
    sourceCounts: countBy(allRecords, (record) => record.labelQuality),
    labelStrengthCounts: countBy(allRecords, (record) => record.labelStrength),
    geoCounts: countBy(alignedRecords, (record) => record.geoScope ?? "UNKNOWN"),
    platformCounts: collectPlatforms(alignedRecords),
    creativeTypeCounts: countBy(alignedRecords, (record) => record.creativeType ?? "UNKNOWN"),
    labelQualityCounts: countBy(allRecords, (record) => record.labelQuality),
    outputManifest: {
      recordsPath,
      rejectedRecordsPath,
      metadataPath,
    },
  };

  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  if (organizationId) {
    await persistDatasetSnapshot(organizationId, metadata);
  }

  console.log(JSON.stringify({
    exactMetaGroundTruthRows: authorizedLabels.filter((record) => record.labelQuality === "EXACT_AUTHORIZED_META" && record.isLabelAligned).length,
    publicDisclosedRawCandidates: publicLabels.length,
    publicDisclosedRows: dedupedPublicLabels.size,
    publicRowsWithReachAndImpressions: publicRowsWithMetricPairs.length,
    publicDisclosedAlignedRows: [...dedupedPublicLabels.values()].filter((record) => record.labelQuality === "PUBLIC_META_DISCLOSED" && record.isLabelAligned).length,
    publicDisclosedWeakRangeRows: [...dedupedPublicLabels.values()].filter((record) => record.labelStrength === "WEAK_RANGE").length,
    totalAlignedTrainingRows: alignedRecords.length,
    uniqueAdvertisers: uniqueAdvertisers.size,
    dateRange: {
      min: dateMin,
      max: dateMax,
    },
    platforms: Object.keys(metadata.platformCounts),
    geographies: Object.keys(metadata.geoCounts),
    outputDir,
  }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Dataset export failed.");
  process.exitCode = 1;
});
