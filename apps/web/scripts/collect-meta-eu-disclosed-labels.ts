import {
  buildPublicMetaGroundTruthRecord,
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

async function loadCandidates() {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const persistedAdsResponse = await supabase
    .from("meta_library_ads")
    .select("*")
    .order("created_at", { ascending: true });

  if (!persistedAdsResponse.error && persistedAdsResponse.data) {
    const records = (persistedAdsResponse.data as MetaLibraryAdRow[])
      .map((row) => normalizePersistedMetaLibraryAd(row))
      .map((ad) =>
        buildPublicMetaGroundTruthRecord(ad, {
          sourceRecordId: `${ad.adLibraryId}:${ad.startDate ?? "unknown"}`,
        }),
      );
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
    throw new Error(error?.message ?? "Unable to load persisted Meta ads.");
  }

  const records: GroundTruthLabelRecord[] = [];
  for (const row of data as MetaAdsJobRow[]) {
    for (const rawAd of Array.isArray(row.ads_json) ? row.ads_json : []) {
      if (!rawAd || typeof rawAd !== "object") {
        continue;
      }
      const ad = rawAd as Parameters<typeof buildPublicMetaGroundTruthRecord>[0];
      records.push(
        buildPublicMetaGroundTruthRecord(ad, {
          sourceRecordId: `${row.id}:${String((rawAd as Record<string, unknown>).adLibraryId ?? "unknown")}`,
          retrievedAt: row.created_at,
        }),
      );
    }
  }

  return records;
}

async function persistLabels(
  organizationId: string | null,
  records: GroundTruthLabelRecord[],
) {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase || records.length === 0) {
    return 0;
  }

  const payload = records.map((record) => ({
    organization_id: organizationId,
    record_id: record.recordId,
    source: record.source,
    label_quality: record.labelQuality,
    label_strength: record.labelStrength,
    source_record_id: record.sourceRecordId,
    source_import_run_id: null,
    ad_library_id: record.adLibraryId,
    meta_ad_id: record.metaAdId,
    advertiser_id: record.advertiserId,
    advertiser_name: record.advertiserName,
    campaign_id: record.campaignId,
    adset_id: record.adsetId,
    platforms: record.platforms,
    platform_positions: record.platformPositions,
    country: record.country,
    geo_scope: record.geoScope,
    measurement_scope: record.measurementScope,
    measurement_start: record.measurementStart,
    measurement_end: record.measurementEnd,
    start_date: record.startDate,
    end_date: record.endDate,
    active_days: record.activeDays,
    creative_type: record.creativeType,
    cta_type: record.ctaType,
    landing_domain: record.landingDomain,
    landing_url: record.landingUrl,
    ad_text: record.adText,
    headline: record.headline,
    description: record.description,
    reach_low: record.reachLow,
    reach_high: record.reachHigh,
    reach: record.reach,
    impressions_low: record.impressionsLow,
    impressions_high: record.impressionsHigh,
    impressions: record.impressions,
    frequency: record.frequency,
    weak_frequency_low: record.weakFrequencyLow,
    weak_frequency_high: record.weakFrequencyHigh,
    spend: record.spend,
    spend_low: record.spendLow,
    spend_high: record.spendHigh,
    spend_currency: record.spendCurrency,
    is_label_aligned: record.isLabelAligned,
    alignment_notes: record.alignmentNotes,
    quality_flags: record.qualityFlags,
    raw_payload: record.rawPayload,
    retrieved_at: record.retrievedAt,
  }));

  const { error } = await supabase.from(META_IMPRESSIONS_GROUND_TRUTH_TABLE).insert(payload);
  if (error) {
    throw new Error(`Failed to persist public Meta labels: ${error.message}`);
  }

  return payload.length;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const organizationId = args.get("organization-id")?.trim() || null;
  const allRecords = await loadCandidates();
  const records = allRecords.filter(
    (record) =>
      (record.reachLow != null || record.reach != null) &&
      (record.impressionsLow != null || record.impressions != null),
  );

  const deduped = [...new Map(records.map((record) => [record.recordId, record])).values()];
  const weakRangeRows = deduped.filter((record) => record.labelStrength === "WEAK_RANGE").length;
  const strongRows = deduped.filter((record) => record.labelStrength === "STRONG").length;
  const persistedRows = await persistLabels(organizationId, deduped);

  console.log(
    JSON.stringify(
        {
          organizationId,
          allPublicRows: allRecords.length,
          candidates: records.length,
          dedupedRows: deduped.length,
          weakRangeRows,
          strongRows,
        persistedRows,
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Public Meta label collection failed.");
  process.exitCode = 1;
});
