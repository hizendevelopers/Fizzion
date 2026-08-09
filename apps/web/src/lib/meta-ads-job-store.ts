import { getApifyClient } from "@/lib/apify/client";
import { getPathmaticsProvider } from "@/lib/ad-intelligence-provider";
import { loadMetaAdCache, saveMetaAdCache } from "@/lib/meta-ad-cache";
import { enrichMetaAdFromPublicDetail } from "@/lib/meta-ad-detail";
import { loadMetaAdsJob, persistMetaAdsJob } from "@/lib/meta-ads-persistence";
import {
  buildMetaAdsActorInput,
  createMetaNotDisclosedMetric,
  createMetaNotDisclosedSpendMetric,
  createUnavailableMetric,
  createUnavailableSpendMetric,
  META_AD_LIBRARY_ACTOR_ID,
  META_LIBRARY_JOB_TTL_MS,
  normalizeMetaLibraryAds,
  sanitizeMaxAds,
  validateMetaLibraryUrl,
  withRetry,
  type MetaLibraryAd,
  type MetaMetric,
  type MetaSpendMetric,
} from "@/lib/meta-library";

export type MetaAdsJobStatus =
  | "QUEUED"
  | "FETCHING_META"
  | "META_COMPLETE"
  | "ENRICHING_META_DETAILS"
  | "MATCHING_PATHMATICS"
  | "COMPLETE"
  | "FAILED";

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

const META_DETAIL_BATCH_SIZE = 3;
const PATHMATICS_BATCH_SIZE = 10;

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

function cloneMetric<T extends MetaMetric | MetaSpendMetric>(metric: T): T {
  return JSON.parse(JSON.stringify(metric)) as T;
}

function applyFinalMetrics(ad: MetaLibraryAd, finalizeUnavailable: boolean) {
  const spend = ad.metaMetrics.spend.status === "META_DISCLOSED"
    ? cloneMetric(ad.metaMetrics.spend)
    : ad.metaDetailMetrics.spend.status === "META_DISCLOSED"
      ? cloneMetric(ad.metaDetailMetrics.spend)
      : ad.pathmaticsMetrics.spend
        ? cloneMetric(ad.pathmaticsMetrics.spend)
        : finalizeUnavailable
          ? createUnavailableSpendMetric()
          : cloneMetric(ad.spend);

  const impressions = ad.metaMetrics.impressions.status === "META_DISCLOSED"
    ? cloneMetric(ad.metaMetrics.impressions)
    : ad.metaDetailMetrics.impressions.status === "META_DISCLOSED"
      ? cloneMetric(ad.metaDetailMetrics.impressions)
      : ad.pathmaticsMetrics.impressions
        ? cloneMetric(ad.pathmaticsMetrics.impressions)
        : finalizeUnavailable
          ? createUnavailableMetric()
          : cloneMetric(ad.impressions);

  const audienceSize = ad.metaMetrics.audienceSize.status === "META_DISCLOSED"
    ? cloneMetric(ad.metaMetrics.audienceSize)
    : ad.metaDetailMetrics.audienceSize.status === "META_DISCLOSED"
      ? cloneMetric(ad.metaDetailMetrics.audienceSize)
      : ad.pathmaticsMetrics.audienceSize
        ? cloneMetric(ad.pathmaticsMetrics.audienceSize)
        : finalizeUnavailable
          ? createUnavailableMetric()
          : cloneMetric(ad.audienceSize);

  ad.finalMetrics = { spend, impressions, audienceSize };
  ad.spend = spend;
  ad.impressions = impressions;
  ad.audienceSize = audienceSize;
}

function needsMetaDetail(ad: MetaLibraryAd) {
  return (
    ad.metaMetrics.spend.status !== "META_DISCLOSED" ||
    ad.metaMetrics.impressions.status !== "META_DISCLOSED" ||
    ad.metaMetrics.audienceSize.status !== "META_DISCLOSED"
  ) && ad.debug.metaDetail?.checkedAt == null;
}

function needsPathmatics(ad: MetaLibraryAd) {
  return (
    ad.finalMetrics.spend.status !== "META_DISCLOSED" ||
    ad.finalMetrics.impressions.status !== "META_DISCLOSED"
  ) && ad.pathmaticsMetrics.providerStatus === "PENDING";
}

function applyCachedEnrichment(ad: MetaLibraryAd, cached: Awaited<ReturnType<typeof loadMetaAdCache>>) {
  if (!cached) {
    return false;
  }

  ad.debug.metaDetail = cached.metaDetail ?? undefined;
  ad.metaDetailMetrics = cached.metaDetailMetrics;
  ad.pathmaticsMetrics = cached.pathmaticsMetrics;
  ad.intelligenceMatch = cached.intelligenceMatch;
  ad.finalMetrics = cached.finalMetrics;
  ad.spend = cached.finalMetrics.spend;
  ad.impressions = cached.finalMetrics.impressions;
  ad.audienceSize = cached.finalMetrics.audienceSize;
  return true;
}

async function processMetaDetailBatch(job: MetaAdsJob) {
  const pendingAds = job.ads.filter(needsMetaDetail).slice(0, META_DETAIL_BATCH_SIZE);
  if (pendingAds.length === 0) {
    return false;
  }

  touch(job, {
    status: "ENRICHING_META_DETAILS",
    progressMessage: `Checking Meta details... ${job.processed} / ${job.found || job.ads.length}`,
  });
  await saveJob(job);

  await Promise.all(
    pendingAds.map(async (ad) => {
      const cached = await loadMetaAdCache(ad.adLibraryId);
      if (applyCachedEnrichment(ad, cached)) {
        return;
      }

      const detail = await enrichMetaAdFromPublicDetail(ad);
      ad.debug.metaDetail = {
        checkedAt: detail.checkedAt,
        pageUrl: detail.pageUrl,
        visibleTextSnippet: detail.visibleTextSnippet,
        structuredCandidates: detail.structuredCandidates,
        responses: detail.responses,
      };
      ad.metaDetailMetrics = detail.metrics;

      if (ad.metaMetrics.spend.status !== "META_DISCLOSED" && ad.metaDetailMetrics.spend.status !== "META_DISCLOSED") {
        ad.metaMetrics.spend = createMetaNotDisclosedSpendMetric("META_AD_LIBRARY_DETAIL");
      }
      if (ad.metaMetrics.impressions.status !== "META_DISCLOSED" && ad.metaDetailMetrics.impressions.status !== "META_DISCLOSED") {
        ad.metaMetrics.impressions = createMetaNotDisclosedMetric("META_AD_LIBRARY_DETAIL");
      }
      if (ad.metaMetrics.audienceSize.status !== "META_DISCLOSED" && ad.metaDetailMetrics.audienceSize.status !== "META_DISCLOSED") {
        ad.metaMetrics.audienceSize = createMetaNotDisclosedMetric("META_AD_LIBRARY_DETAIL");
      }

      applyFinalMetrics(ad, false);
      await saveMetaAdCache(ad);
    }),
  );

  touch(job, {
    processed: job.ads.filter((ad) => ad.debug.metaDetail?.checkedAt != null).length,
    progressMessage: `Checking Meta details... ${job.ads.filter((ad) => ad.debug.metaDetail?.checkedAt != null).length} / ${job.ads.length}`,
  });
  await saveJob(job);
  return true;
}

async function processPathmaticsBatch(job: MetaAdsJob) {
  const provider = getPathmaticsProvider();
  const pendingAds = job.ads.filter(needsPathmatics).slice(0, PATHMATICS_BATCH_SIZE);
  if (pendingAds.length === 0) {
    return false;
  }

  touch(job, {
    status: "MATCHING_PATHMATICS",
    progressMessage: `Checking advertising intelligence... ${job.processed} / ${job.ads.length}`,
  });
  await saveJob(job);

  await Promise.all(
    pendingAds.map(async (ad) => {
      const match = await provider.findAdMatch(ad);
      ad.intelligenceMatch = {
        provider: match.status === "MATCH_FOUND" ? "PATHMATICS" : null,
        confidence: match.confidence,
        matchId: match.matchId,
        status: match.status,
        reasons: match.reasons,
      };
      ad.debug.pathmatics = {
        configured: provider.isConfigured(),
        status: match.status,
        confidence: match.confidence,
        matchId: match.matchId,
        reasons: match.reasons,
      };
      ad.pathmaticsMetrics.providerStatus = match.status;
      ad.pathmaticsMetrics.providerMessage = match.message;

      if (match.status === "MATCH_FOUND" && match.confidence != null && match.confidence * 100 >= provider.getMinimumConfidence()) {
        ad.pathmaticsMetrics.spend = await provider.getSpend(match, ad);
        ad.pathmaticsMetrics.impressions = await provider.getImpressions(match, ad);
        ad.pathmaticsMetrics.audienceSize = await provider.getAudience(match, ad);
      }

      applyFinalMetrics(ad, true);
      await saveMetaAdCache(ad);
    }),
  );

  const processed = job.ads.filter((ad) => ad.pathmaticsMetrics.providerStatus !== "PENDING").length;
  touch(job, {
    processed,
    progressMessage: `Checking advertising intelligence... ${processed} / ${job.ads.length}`,
  });
  await saveJob(job);
  return true;
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
      status: "FETCHING_META",
      actorRunId: run.id,
      datasetId: run.defaultDatasetId ?? null,
      progressMessage: "Fetching Meta ads...",
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

  if (job.status === "FAILED" || job.status === "COMPLETE") {
    return job;
  }

  if (job.actorRunId && job.rawItems.length === 0) {
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
          status: "FETCHING_META",
          datasetId,
          progressMessage: "Downloading all Meta ads...",
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
        const normalized = normalizeMetaLibraryAds(rawItems, {
          actorRunId: job.actorRunId,
          datasetId,
        });

        for (const ad of normalized.ads) {
          applyFinalMetrics(ad, false);
        }

        touch(job, {
          rawItems,
          ads: normalized.ads,
          datasetId,
          found: normalized.ads.length,
          processed: 0,
          status: "META_COMPLETE",
          progressMessage: `Meta collection complete. ${normalized.ads.length} ads found.`,
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
        status: "FETCHING_META",
        datasetId,
        progressMessage: "Fetching Meta ads...",
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

  if (job.rawItems.length > 0 && job.ads.some(needsMetaDetail)) {
    await processMetaDetailBatch(job);
    return job;
  }

  if (job.rawItems.length > 0 && job.ads.some(needsPathmatics)) {
    await processPathmaticsBatch(job);
    return job;
  }

  job.ads.forEach((ad) => applyFinalMetrics(ad, true));
  touch(job, {
    status: "COMPLETE",
    processed: job.ads.length,
    progressMessage: `Complete. ${job.ads.length} ads ready.`,
  });
  await saveJob(job);
  return job;
}

