import { getOptionalSupabaseSecretKey } from "@/lib/env";
import { getOptionalSupabaseAdminClient } from "@/lib/supabase/server";
import type { MetaAdsJob } from "@/lib/meta-ads-job-store";

const META_ADS_JOBS_TABLE = "meta_ads_jobs";

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
    ads: Array.isArray(row.ads_json) ? (row.ads_json as MetaAdsJob["ads"]) : [],
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
