import { getOptionalSupabaseSecretKey } from "@/lib/env";
import { getOptionalSupabaseAdminClient } from "@/lib/supabase/server";
import type { MetaAdsJob } from "@/lib/meta-ads-job-store";
import {
  createCheckingMetric,
  createCheckingSpendMetric,
  type MetaLibraryAd,
  type MetaMetric,
  type MetaSpendMetric,
} from "@/lib/meta-library";

const META_ADS_JOBS_TABLE = "meta_ads_jobs";

function ensureMetric(metric: unknown, source: "META_AD_LIBRARY" | "META_AD_LIBRARY_DETAIL" = "META_AD_LIBRARY") {
  return (metric as MetaMetric | null) ?? createCheckingMetric(source);
}

function ensureSpendMetric(metric: unknown) {
  return (metric as MetaSpendMetric | null) ?? createCheckingSpendMetric();
}

function hydratePersistedAd(ad: MetaLibraryAd): MetaLibraryAd {
  const spend = ensureSpendMetric(ad.spend);
  const impressions = ensureMetric(ad.impressions);
  const audienceSize = ensureMetric(ad.audienceSize);
  const metaMetrics = ad.metaMetrics ?? {
    spend: ensureSpendMetric(ad.spend),
    impressions: ensureMetric(ad.impressions),
    audienceSize: ensureMetric(ad.audienceSize),
  };
  const metaDetailMetrics = ad.metaDetailMetrics ?? {
    spend: createCheckingSpendMetric(),
    impressions: createCheckingMetric("META_AD_LIBRARY_DETAIL"),
    audienceSize: createCheckingMetric("META_AD_LIBRARY_DETAIL"),
  };
  const pathmaticsMetrics = ad.pathmaticsMetrics ?? {
    spend: null,
    impressions: null,
    audienceSize: null,
    providerStatus: "PENDING" as const,
    providerMessage: null,
  };
  const modelMetrics = ad.modelMetrics ?? {
    impressions: null,
  };
  const finalMetrics = ad.finalMetrics ?? {
    spend,
    impressions,
    audienceSize,
  };
  const debug = ad.debug ?? {
    metricCandidates: [],
    sourceUrl: null,
    actorInputUrl: null,
  };
  const intelligenceMatch = ad.intelligenceMatch ?? {
    provider: null,
    confidence: null,
    matchId: null,
    status: "PENDING" as const,
    reasons: [],
  };

  return {
    ...ad,
    spend,
    impressions,
    audienceSize,
    metaMetrics,
    metaDetailMetrics,
    pathmaticsMetrics,
    modelMetrics,
    finalMetrics,
    debug,
    intelligenceMatch,
  };
}

type MetaAdsJobRow = {
  id: string;
  query_url: string;
  max_ads: number;
  status: MetaAdsJob["status"];
  progress_message: string;
  found_count: number;
  processed_count: number;
  actor_run_id: string | null;
  dataset_id: string | null;
  ads_json: MetaAdsJob["ads"];
  raw_items_json: MetaAdsJob["rawItems"];
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

function toRow(job: MetaAdsJob): MetaAdsJobRow {
  return {
    id: job.id,
    query_url: job.url,
    max_ads: job.maxAds,
    status: job.status,
    progress_message: job.progressMessage,
    found_count: job.found,
    processed_count: job.processed,
    actor_run_id: job.actorRunId,
    dataset_id: job.datasetId,
    ads_json: job.ads,
    raw_items_json: job.rawItems,
    error_message: job.error,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  };
}

function fromRow(row: Record<string, unknown>): MetaAdsJob {
  return {
    id: String(row.id ?? ""),
    url: String(row.query_url ?? ""),
    maxAds: Number(row.max_ads ?? 0),
    status: (row.status as MetaAdsJob["status"]) ?? "FAILED",
    progressMessage: String(row.progress_message ?? ""),
    found: Number(row.found_count ?? 0),
    processed: Number(row.processed_count ?? 0),
    actorRunId: typeof row.actor_run_id === "string" ? row.actor_run_id : null,
    datasetId: typeof row.dataset_id === "string" ? row.dataset_id : null,
    ads: Array.isArray(row.ads_json) ? (row.ads_json as MetaAdsJob["ads"]).map(hydratePersistedAd) : [],
    rawItems: Array.isArray(row.raw_items_json) ? (row.raw_items_json as MetaAdsJob["rawItems"]) : [],
    error: typeof row.error_message === "string" ? row.error_message : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

export async function persistMetaAdsJob(job: MetaAdsJob) {
  if (!getOptionalSupabaseSecretKey()) {
    return;
  }

  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  const row = toRow(job);
  const { error } = await supabase.from(META_ADS_JOBS_TABLE).upsert(row, {
    onConflict: "id",
  });

  if (error) {
    console.warn("[meta-ads] failed to persist job", {
      jobId: job.id,
      message: error.message,
    });
  }
}

export async function loadMetaAdsJob(jobId: string): Promise<MetaAdsJob | null> {
  if (!getOptionalSupabaseSecretKey()) {
    return null;
  }

  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(META_ADS_JOBS_TABLE)
    .select("*")
    .eq("id", jobId)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return fromRow(data as Record<string, unknown>);
}
