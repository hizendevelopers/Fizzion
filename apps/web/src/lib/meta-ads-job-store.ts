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

export function getMetaAdsJob(jobId: string) {
  cleanupExpiredJobs();
  return getStore().jobs.get(jobId) ?? null;
}

export async function getMetaAdsJobById(jobId: string) {
  const inMemory = getMetaAdsJob(jobId);
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
    progressMessage: "Queued",
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

  getStore().jobs.set(job.id, job);
  await persistMetaAdsJob(job);
  void runMetaAdsJob(job.id);
  return job;
}

async function persistTouchedJob(job: MetaAdsJob) {
  await persistMetaAdsJob(job);
}

async function runMetaAdsJob(jobId: string) {
  const job = getMetaAdsJob(jobId);
  if (!job) {
    return;
  }

  const client = getApifyClient();

  try {
    touch(job, {
      status: "RUNNING",
      progressMessage: "Starting Apify actor run...",
    });
    await persistTouchedJob(job);

    const actorInput = buildMetaAdsActorInput(job.url, job.maxAds);

    const run = await withRetry(
      () => client.actor(META_AD_LIBRARY_ACTOR_ID).call(actorInput),
      { retries: 3, baseDelayMs: 1250 },
    );

    if (!run.id || !run.defaultDatasetId) {
      throw new Error("The Apify actor run completed without a dataset.");
    }

    touch(job, {
      actorRunId: run.id,
      datasetId: run.defaultDatasetId,
      progressMessage: "Downloading all dataset items...",
    });
    await persistTouchedJob(job);

    const datasetResponse = await withRetry(
      () =>
        client.dataset(run.defaultDatasetId as string).listItems({
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
    await persistTouchedJob(job);

    const normalized = normalizeMetaLibraryAds(rawItems, {
      actorRunId: run.id,
      datasetId: run.defaultDatasetId,
      onProgress(processed, total) {
        touch(job, {
          processed,
          progressMessage: `Enriching ad ${processed} / ${total}`,
        });
        void persistTouchedJob(job);
      },
    });

    touch(job, {
      ads: normalized.ads,
      found: normalized.rawCount,
      processed: normalized.processedCount,
      status: "SUCCEEDED",
      progressMessage:
        normalized.ads.length > 0
          ? `Complete. ${normalized.ads.length} ads ready.`
          : "Complete. No ads were returned for this Meta Ad Library URL.",
    });
    await persistTouchedJob(job);
  } catch (error) {
    touch(job, {
      status: "FAILED",
      error: error instanceof Error ? error.message : "The Meta Ad Library scrape failed.",
      progressMessage: "The Meta Ad Library scrape failed.",
    });
    await persistTouchedJob(job);
  }
}
