import { refreshMetaAdsJob } from "@/lib/meta-ads-job-store";
import { getOptionalSupabaseAdminClient } from "@/lib/supabase/server";

const META_ADS_JOBS_TABLE = "meta_ads_jobs";

type BackfillSummary = {
  jobsFound: number;
  jobsProcessed: number;
  jobsUpdated: number;
  jobsFailed: number;
  completeJobs: number;
  failedJobs: number;
};

async function loadPersistedJobIds() {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data, error } = await supabase
    .from(META_ADS_JOBS_TABLE)
    .select("id")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load persisted Meta jobs: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => (typeof row.id === "string" ? row.id : null))
    .filter((value): value is string => Boolean(value));
}

async function main() {
  const jobIds = await loadPersistedJobIds();
  const summary: BackfillSummary = {
    jobsFound: jobIds.length,
    jobsProcessed: 0,
    jobsUpdated: 0,
    jobsFailed: 0,
    completeJobs: 0,
    failedJobs: 0,
  };

  for (const jobId of jobIds) {
    try {
      const job = await refreshMetaAdsJob(jobId);
      summary.jobsProcessed += 1;

      if (job) {
        summary.jobsUpdated += 1;
        if (job.status === "COMPLETE") {
          summary.completeJobs += 1;
        }
        if (job.status === "FAILED") {
          summary.failedJobs += 1;
        }
      }
    } catch (error) {
      summary.jobsProcessed += 1;
      summary.jobsFailed += 1;
      console.warn("[meta-impressions-backfill] job refresh failed", {
        jobId,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

void main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Meta impression backfill failed.",
  );
  process.exitCode = 1;
});
