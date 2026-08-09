import { getApifyClient } from "@/lib/apify/client";
import { loadMetaAdsJob, persistMetaAdsJob } from "@/lib/meta-ads-persistence";
import {
  buildMetaAdsActorInput,
  META_AD_LIBRARY_ACTOR_ID,
  META_LIBRARY_JOB_TTL_MS,
  normalizeMetaLibraryAds,
  sanitizeMaxAds,
  validateMetaLibraryUrl,
  withRetry,
  type MetaLibraryAd,
} from "@/lib/meta-library";

type MetaAdsJobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";

export type MetaAdsJob = {
  id: string;
  url: string;
  maxAds: number;
  status: MetaAdsJobStatus;
  progressMessage: string;
  found: number;
  processed: number;
  actorRunId: string | null;
  datasetId: string | null;
  ads: MetaLibraryAd[];
  rawItems: unknown[];
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

type MetaAdsJobStore = {
  jobs: Map<string, MetaAdsJob>;
};

declare global {
  var __metaAdsJobStore__: MetaAdsJobStore | undefined;
}

function getStore(): MetaAdsJobStore {
  if (!globalThis.__metaAdsJobStore__) {
    globalThis.__metaAdsJobStore__ = {
      jobs: new Map<string, MetaAdsJob>(),
    };
  }

  return globalThis.__metaAdsJobStore__;
}

function createJobId() {
  return `meta_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function touch(job: MetaAdsJob, patch: Partial<MetaAdsJob>) {
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
}

function cleanupExpiredJobs() {
  const store = getStore();
  const now = Date.now();

  for (const [jobId, job] of store.jobs.entries()) {
    const age = now - new Date(job.updatedAt).getTime();
    if (age > META_LIBRARY_JOB_TTL_MS) {
      store.jobs.delete(jobId);
    }
  }
}

async function saveJob(job: MetaAdsJob) {
  getStore().jobs.set(job.id, job);
  await persistMetaAdsJob(job);
}

export async function getMetaAdsJobById(jobId: string) {
  cleanupExpiredJobs();
  const inMemory = getStore().jobs.get(jobId);
  if (inMemory) {
    return inMemory;
  }

  const persisted = await loadMetaAdsJob(jobId);
  if (persisted) {
    getStore().jobs.set(jobId, persisted);
  }

  return persisted;
}

export async function createMetaAdsJob(url: string, maxAds: unknown) {
  cleanupExpiredJobs();

  const validatedUrl = validateMetaLibraryUrl(url);
  if (!validatedUrl.ok) {
    throw new Error(validatedUrl.error);
  }

  const safeMaxAds = sanitizeMaxAds(maxAds);
  const job: MetaAdsJob = {
    id: createJobId(),
    url: validatedUrl.url,
    maxAds: safeMaxAds,
    status: "QUEUED",
    progressMessage: "Starting Apify actor run...",
    found: 0,
    processed: 0,
    actorRunId: null,
    datasetId: null,
    ads: [],
    rawItems: [],
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveJob(job);

  try {
    const client = getApifyClient();
    const actorInput = buildMetaAdsActorInput(job.url, job.maxAds);

    const run = await withRetry(
      () => client.actor(META_AD_LIBRARY_ACTOR_ID).start(actorInput),
      { retries: 3, baseDelayMs: 1250 },
    );

    if (!run.id) {
      throw new Error("The Apify actor did not return a run ID.");
    }

    touch(job, {
      status: "RUNNING",
      actorRunId: run.id,
      datasetId: run.defaultDatasetId ?? null,
      progressMessage: "Actor started. Waiting for Meta results...",
    });
    await saveJob(job);
    return job;
  } catch (error) {
    touch(job, {
      status: "FAILED",
      error: error instanceof Error ? error.message : "The Meta Ad Library actor could not be started.",
      progressMessage: "The Meta Ad Library actor could not be started.",
    });
    await saveJob(job);
    return job;
  }
}

export async function refreshMetaAdsJob(jobId: string) {
  const job = await getMetaAdsJobById(jobId);
  if (!job) {
    return null;
  }

  if (!job.actorRunId || job.status === "FAILED" || job.status === "SUCCEEDED") {
    return job;
  }

  const client = getApifyClient();

  try {
    const run = await withRetry(() => client.run(job.actorRunId as string).get(), {
      retries: 2,
      baseDelayMs: 1000,
    });

    if (!run) {
      throw new Error("The Apify run status could not be retrieved.");
    }

    const runStatus = run.status ?? "RUNNING";
    const datasetId = run.defaultDatasetId ?? job.datasetId;

    if (runStatus === "SUCCEEDED") {
      if (!datasetId) {
        throw new Error("The Apify run succeeded but did not expose a dataset ID.");
      }

      touch(job, {
        status: "RUNNING",
        datasetId,
        progressMessage: "Downloading all dataset items...",
      });
      await saveJob(job);

      const datasetResponse = await withRetry(
        () =>
          client.dataset(datasetId).listItems({
            clean: true,
            limit: job.maxAds,
          }),
        { retries: 3, baseDelayMs: 1250 },
      );

      const rawItems = (datasetResponse.items ?? []) as unknown[];
      touch(job, {
        rawItems,
        found: rawItems.length,
        progressMessage: rawItems.length === 0 ? "No ads returned from Meta Ad Library." : `Found ${rawItems.length} ads. Enriching each ad...`,
      });
      await saveJob(job);

      const normalized = normalizeMetaLibraryAds(rawItems, {
        actorRunId: job.actorRunId,
        datasetId,
        onProgress(processed, total) {
          touch(job, {
            processed,
            progressMessage: `Enriching ad ${processed} / ${total}`,
          });
        },
      });

      touch(job, {
        ads: normalized.ads,
        datasetId,
        found: normalized.rawCount,
        processed: normalized.processedCount,
        status: "SUCCEEDED",
        progressMessage:
          normalized.ads.length > 0
            ? `Complete. ${normalized.ads.length} ads ready.`
            : "Complete. No ads were returned for this Meta Ad Library URL.",
      });
      await saveJob(job);
      return job;
    }

    if (runStatus === "FAILED" || runStatus === "ABORTED" || runStatus === "TIMED-OUT") {
      touch(job, {
        status: "FAILED",
        datasetId,
        error: run.statusMessage ?? `The actor run ended with status ${runStatus}.`,
        progressMessage: "The Meta Ad Library scrape failed.",
      });
      await saveJob(job);
      return job;
    }

    touch(job, {
      status: "RUNNING",
      datasetId,
      progressMessage: "Meta is still collecting ads...",
    });
    await saveJob(job);
    return job;
  } catch (error) {
    touch(job, {
      status: "FAILED",
      error: error instanceof Error ? error.message : "The Meta Ad Library scrape failed during status refresh.",
      progressMessage: "The Meta Ad Library scrape failed.",
    });
    await saveJob(job);
    return job;
  }
}
