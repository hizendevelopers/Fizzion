import {
  getMetaAdsApiVersion,
  getMetaAdsInsightsAccessToken,
  getOptionalMetaAdsAccountIds,
} from "@/lib/env";
import {
  META_ADS_INSIGHTS_IMPORT_RUNS_TABLE,
  META_IMPRESSIONS_GROUND_TRUTH_TABLE,
  type GroundTruthLabelRecord,
} from "@/lib/meta-impressions-ground-truth";
import { getOptionalSupabaseAdminClient } from "@/lib/supabase/server";

type MetaAdsInsightsRow = {
  ad_id?: string;
  ad_name?: string;
  campaign_id?: string;
  adset_id?: string;
  date_start?: string;
  date_stop?: string;
  impressions?: string;
  reach?: string;
  frequency?: string;
  spend?: string;
  publisher_platform?: string;
  platform_position?: string;
};

type MetaAdsInsightsResponse = {
  data?: MetaAdsInsightsRow[];
  paging?: {
    next?: string;
    cursors?: {
      after?: string;
    };
  };
};

export type MetaAdsInsightsImportOptions = {
  organizationId: string;
  accountIds?: string[];
  since: string;
  until: string;
  limit?: number;
};

export type MetaAdsInsightsImportSummary = {
  importRunId: string | null;
  rowsImported: number;
  rowsRejected: number;
  accountsProcessed: number;
  records: GroundTruthLabelRecord[];
};

function normalizeAccountId(accountId: string) {
  const trimmed = accountId.trim();
  return trimmed.startsWith("act_") ? trimmed : `act_${trimmed}`;
}

function toNullableNumber(value: string | undefined) {
  if (!value) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function deriveFrequency(row: MetaAdsInsightsRow) {
  const explicit = toNullableNumber(row.frequency);
  if (explicit != null) {
    return explicit;
  }

  const impressions = toNullableNumber(row.impressions);
  const reach = toNullableNumber(row.reach);
  if (impressions == null || reach == null || reach <= 0) {
    return null;
  }

  return impressions / reach;
}

function buildGroundTruthRecord(
  accountId: string,
  row: MetaAdsInsightsRow,
): GroundTruthLabelRecord {
  const measurementStart = row.date_start ?? "";
  const measurementEnd = row.date_stop ?? measurementStart;
  const impressions = toNullableNumber(row.impressions);
  const reach = toNullableNumber(row.reach);
  const frequency = deriveFrequency(row);
  const platforms = row.publisher_platform ? [row.publisher_platform] : [];
  const platformPositions = row.platform_position ? [row.platform_position] : [];
  const advertiserName = row.ad_name ?? row.ad_id ?? accountId;

  return {
    recordId: `meta-insights-${accountId}-${row.ad_id ?? "unknown"}-${measurementStart}-${measurementEnd}`,
    source: "META_ADS_INSIGHTS",
    labelQuality: "EXACT_AUTHORIZED_META",
    labelStrength: "STRONG",
    sourceRecordId: `${accountId}:${row.ad_id ?? "unknown"}:${measurementStart}:${measurementEnd}:${row.publisher_platform ?? "all"}`,
    adLibraryId: null,
    metaAdId: row.ad_id ?? null,
    advertiserId: accountId,
    advertiserName,
    campaignId: row.campaign_id ?? null,
    adsetId: row.adset_id ?? null,
    platforms,
    platformPositions,
    country: null,
    geoScope: "AUTHORIZED_META_AD_LEVEL",
    measurementScope: "AUTHORIZED_META_AD_LEVEL",
    measurementStart,
    measurementEnd,
    startDate: measurementStart,
    endDate: measurementEnd,
    activeDays: null,
    creativeType: null,
    ctaType: null,
    landingDomain: null,
    landingUrl: null,
    adText: null,
    headline: row.ad_name ?? null,
    description: null,
    reachLow: reach,
    reachHigh: reach,
    reach,
    impressionsLow: impressions,
    impressionsHigh: impressions,
    impressions,
    frequency,
    weakFrequencyLow: frequency,
    weakFrequencyHigh: frequency,
    spend: toNullableNumber(row.spend),
    spendLow: toNullableNumber(row.spend),
    spendHigh: toNullableNumber(row.spend),
    spendCurrency: null,
    isLabelAligned:
      Boolean(row.ad_id) &&
      Boolean(measurementStart) &&
      Boolean(measurementEnd) &&
      reach != null &&
      impressions != null &&
      reach > 0 &&
      impressions > 0,
    alignmentNotes:
      Boolean(row.ad_id) &&
      Boolean(measurementStart) &&
      Boolean(measurementEnd) &&
      reach != null &&
      impressions != null &&
      reach > 0 &&
      impressions > 0
        ? []
        : ["Meta Ads Insights row is missing one or more aligned ad-level metrics."],
    qualityFlags: {
      publisherPlatform: row.publisher_platform ?? null,
      platformPosition: row.platform_position ?? null,
      hasExplicitFrequency: row.frequency != null,
    },
    rawPayload: row as Record<string, unknown>,
    retrievedAt: new Date().toISOString(),
  };
}

async function fetchInsightsPage(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Meta Ads Insights request failed with ${response.status}: ${text.slice(0, 300)}`);
  }

  return (await response.json()) as MetaAdsInsightsResponse;
}

async function persistImportRunStart(options: MetaAdsInsightsImportOptions) {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from(META_ADS_INSIGHTS_IMPORT_RUNS_TABLE)
    .insert({
      organization_id: options.organizationId,
      account_id: options.accountIds?.join(",") ?? "",
      status: "running",
      requested_since: options.since,
      requested_until: options.until,
      started_at: new Date().toISOString(),
      metadata: {
        accountIds: options.accountIds ?? [],
      },
    })
    .select("id")
    .limit(1)
    .maybeSingle();

  return typeof data?.id === "string" ? data.id : null;
}

async function finalizeImportRun(importRunId: string | null, summary: MetaAdsInsightsImportSummary, errorMessage?: string) {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase || !importRunId) {
    return;
  }

  await supabase
    .from(META_ADS_INSIGHTS_IMPORT_RUNS_TABLE)
    .update({
      status: errorMessage ? "failed" : "completed",
      rows_imported: summary.rowsImported,
      rows_rejected: summary.rowsRejected,
      error_message: errorMessage ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", importRunId);
}

async function persistGroundTruthRecords(organizationId: string, importRunId: string | null, records: GroundTruthLabelRecord[]) {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase || records.length === 0) {
    return;
  }

  const payload = records.map((record) => ({
    organization_id: organizationId,
    record_id: record.recordId,
    source: record.source,
    label_quality: record.labelQuality,
    label_strength: record.labelStrength,
    source_record_id: record.sourceRecordId,
    source_import_run_id: importRunId,
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

  const { error } = await supabase.from(META_IMPRESSIONS_GROUND_TRUTH_TABLE).upsert(payload, {
    onConflict: "organization_id,record_id",
  });

  if (error) {
    throw new Error(`Failed to persist Meta Ads Insights rows: ${error.message}`);
  }
}

export async function importAuthorizedMetaAdsInsights(
  options: MetaAdsInsightsImportOptions,
): Promise<MetaAdsInsightsImportSummary> {
  const accessToken = getMetaAdsInsightsAccessToken();
  const apiVersion = getMetaAdsApiVersion();
  const accountIds = options.accountIds?.length
    ? options.accountIds
    : getOptionalMetaAdsAccountIds();

  if (accountIds.length === 0) {
    throw new Error("No authorized Meta ad accounts were supplied. Set META_ADS_ACCOUNT_IDS or pass --account-ids.");
  }

  const importRunId = await persistImportRunStart({
    ...options,
    accountIds,
  });

  const records: GroundTruthLabelRecord[] = [];
  let rowsRejected = 0;

  try {
    for (const rawAccountId of accountIds) {
      const accountId = normalizeAccountId(rawAccountId);
      let nextUrl =
        `https://graph.facebook.com/${apiVersion}/${accountId}/insights` +
        `?level=ad&limit=${options.limit ?? 100}` +
        `&fields=ad_id,ad_name,campaign_id,adset_id,date_start,date_stop,impressions,reach,frequency,spend,publisher_platform,platform_position` +
        `&time_range=${encodeURIComponent(JSON.stringify({ since: options.since, until: options.until }))}`;

      while (nextUrl) {
        const page = await fetchInsightsPage(nextUrl, accessToken);
        for (const row of page.data ?? []) {
          const record = buildGroundTruthRecord(accountId, row);
          records.push(record);
          if (!record.isLabelAligned) {
            rowsRejected += 1;
          }
        }
        nextUrl = page.paging?.next ?? "";
      }
    }

    await persistGroundTruthRecords(options.organizationId, importRunId, records);

    const summary: MetaAdsInsightsImportSummary = {
      importRunId,
      rowsImported: records.length,
      rowsRejected,
      accountsProcessed: accountIds.length,
      records,
    };

    await finalizeImportRun(importRunId, summary);
    return summary;
  } catch (error) {
    const summary: MetaAdsInsightsImportSummary = {
      importRunId,
      rowsImported: records.length,
      rowsRejected,
      accountsProcessed: accountIds.length,
      records,
    };
    await finalizeImportRun(importRunId, summary, error instanceof Error ? error.message : "Meta Ads Insights import failed.");
    throw error;
  }
}
