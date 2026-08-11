import { getApifyClient } from "@/lib/apify/client";
import { getPathmaticsProvider } from "@/lib/ad-intelligence-provider";
import { loadMetaAdCache, saveMetaAdCache } from "@/lib/meta-ad-cache";
import { enrichMetaAdFromPublicDetail } from "@/lib/meta-ad-detail";
import { persistMetaLibraryAds } from "@/lib/meta-library-ad-persistence";
import { loadMetaAdsJob, persistMetaAdsJob } from "@/lib/meta-ads-persistence";
import {
  buildModeledImpressionsMetric,
  estimateImpressionsWithInHouseModel,
  buildPublicTrainingRangeMetric,
  findExactPublicTrainingRange,
} from "@/lib/meta-impressions-model";
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
  type MetaDetailStatus,
  type MetaMetric,
  type MetaSpendMetric,
  type PathmaticsDebugStatus,
} from "@/lib/meta-library";

export type MetaAdsJobStatus =
  | "QUEUED"
  | "FETCHING_META"
  | "META_COMPLETE"
  | "ENRICHING_META_DETAILS"
  | "MODELING_IMPRESSIONS"
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
const MODEL_BATCH_SIZE = 10;
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
  await persistMetaLibraryAds(job);
}

function cloneMetric<T extends MetaMetric | MetaSpendMetric>(metric: T): T {
  return JSON.parse(JSON.stringify(metric)) as T;
}

function hasDisclosedMetaDetail(ad: MetaLibraryAd) {
  return (
    ad.metaDetailMetrics.spend.status === "META_DISCLOSED" ||
    ad.metaDetailMetrics.impressions.status === "META_DISCLOSED" ||
    ad.metaDetailMetrics.audienceSize.status === "META_DISCLOSED"
  );
}

function resolveMetaDetailStatus(ad: MetaLibraryAd): MetaDetailStatus {
  if (hasDisclosedMetaDetail(ad)) {
    return "META_DISCLOSED";
  }

  if (ad.debug.metaDetail?.errorMessage) {
    return "META_BROWSER_FAILED";
  }

  return "META_NOT_DISCLOSED";
}

function resolveMetricReason(
  metric: MetaMetric | MetaSpendMetric,
  metricName: "spend" | "impressions" | "audience",
  ad: MetaLibraryAd,
) {
  if (metric.source === "PUBLIC_META_TRAINING_DATA") {
    return "PUBLIC_META_RANGE";
  }

  if (metric.source === "PATHMATICS") {
    return "PATHMATICS_MATCH_FOUND";
  }

  if (metric.source === "IN_HOUSE_MODEL") {
    return ad.debug.model?.status ?? "MODEL_NOT_AVAILABLE";
  }

  if (metric.status === "META_DISCLOSED") {
    return "META_DISCLOSED";
  }

  const pathmaticsStatus = ad.debug.pathmatics?.status;
  const metaDetailStatus = ad.debug.metaDetail?.status;

  if (metricName === "audience") {
    if (metaDetailStatus === "META_BROWSER_FAILED") {
      return "META_BROWSER_FAILED";
    }
    return "META_NOT_DISCLOSED";
  }

  if (pathmaticsStatus && pathmaticsStatus !== "PENDING") {
    if (metaDetailStatus === "META_BROWSER_FAILED") {
      return `${metaDetailStatus};${pathmaticsStatus}`;
    }
    if (
      metaDetailStatus === "META_NOT_DISCLOSED" ||
      metaDetailStatus === "META_DISCLOSED"
    ) {
      return pathmaticsStatus;
    }
    return pathmaticsStatus;
  }

  if (metaDetailStatus === "META_BROWSER_FAILED") {
    return "META_BROWSER_FAILED";
  }

  return "META_NOT_DISCLOSED";
}

function refreshResolutionDebug(ad: MetaLibraryAd) {
  ad.debug.resolution = {
    spendReason: resolveMetricReason(ad.finalMetrics.spend, "spend", ad),
    impressionsReason: resolveMetricReason(ad.finalMetrics.impressions, "impressions", ad),
    audienceReason: resolveMetricReason(ad.finalMetrics.audienceSize, "audience", ad),
  };
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
      : ad.debug.trainingData?.exactMatch && ad.finalMetrics.impressions.source === "PUBLIC_META_TRAINING_DATA"
        ? cloneMetric(ad.finalMetrics.impressions)
      : ad.modelMetrics.impressions
        ? cloneMetric(ad.modelMetrics.impressions)
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
  refreshResolutionDebug(ad);
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
  ad.modelMetrics = cached.modelMetrics;
  ad.intelligenceMatch = cached.intelligenceMatch;
  ad.debug.model = cached.modelDebug;
  ad.finalMetrics = cached.finalMetrics;
  ad.spend = cached.finalMetrics.spend;
  ad.impressions = cached.finalMetrics.impressions;
  ad.audienceSize = cached.finalMetrics.audienceSize;
  return true;
}

function needsModelEstimate(ad: MetaLibraryAd) {
  return (
    ad.finalMetrics.impressions.status !== "META_DISCLOSED" &&
    ad.finalMetrics.impressions.source !== "PUBLIC_META_TRAINING_DATA" &&
    ad.modelMetrics.impressions == null
  );
}

async function applyExperimentalImpressionFallback(ad: MetaLibraryAd) {
  const exactTrainingMatch = await findExactPublicTrainingRange(ad.adLibraryId);
  ad.debug.trainingData = exactTrainingMatch
    ? {
        exactMatch: true,
        source: "PUBLIC_META_DISCLOSED",
        adLibraryId: exactTrainingMatch.adLibraryId,
        reach: exactTrainingMatch.reach,
        reachLow: exactTrainingMatch.reachLow,
        reachHigh: exactTrainingMatch.reachHigh,
        impressions: exactTrainingMatch.impressions,
        impressionsLow: exactTrainingMatch.impressionsLow,
        impressionsHigh: exactTrainingMatch.impressionsHigh,
        labelStrength: exactTrainingMatch.labelStrength,
        recordId: exactTrainingMatch.recordId,
      }
    : {
        exactMatch: false,
        source: null,
        adLibraryId: ad.adLibraryId,
        reach: null,
        reachLow: null,
        reachHigh: null,
        impressions: null,
        impressionsLow: null,
        impressionsHigh: null,
        labelStrength: null,
        recordId: null,
      };

  if (
    ad.metaMetrics.impressions.status !== "META_DISCLOSED" &&
    ad.metaDetailMetrics.impressions.status !== "META_DISCLOSED" &&
    exactTrainingMatch
  ) {
    ad.finalMetrics.impressions = buildPublicTrainingRangeMetric(exactTrainingMatch);
    ad.impressions = ad.finalMetrics.impressions;
    ad.modelMetrics.impressions = null;
    ad.debug.model = {
      status: "MODEL_NOT_AVAILABLE",
      modelVersion: null,
      datasetVersion: null,
      confidence: null,
      distributionStatus: null,
      featureCoverage: null,
      reason: "Exact public Meta weak-range row matched this ad, so the experimental model was skipped.",
      predictedFrequency: null,
      low: null,
      estimate: null,
      high: null,
      trainingRows: null,
      stage: null,
    };
    refreshResolutionDebug(ad);
    return;
  }

  const result = await estimateImpressionsWithInHouseModel(ad);
  ad.debug.model = {
    status: result.status,
    modelVersion: result.prediction?.modelVersion ?? null,
    datasetVersion: result.prediction?.datasetVersion ?? null,
    confidence: result.prediction?.confidence ?? null,
    distributionStatus: result.prediction?.distributionStatus ?? null,
    featureCoverage: result.prediction?.featureCoverage ?? null,
    reason: result.reason,
    predictedFrequency: result.prediction?.predictedFrequency ?? null,
    low: result.prediction?.low ?? null,
    estimate: result.prediction?.estimate ?? null,
    high: result.prediction?.high ?? null,
    trainingRows: result.prediction?.trainingRows ?? null,
    stage: result.prediction?.modelStage ?? null,
  };

  ad.modelMetrics.impressions = result.prediction
    ? buildModeledImpressionsMetric(result.prediction)
    : null;
}

async function applyExperimentalImpressionFallbacks(job: MetaAdsJob) {
  await Promise.all(
    job.ads.map(async (ad) => {
      await applyExperimentalImpressionFallback(ad);
      applyFinalMetrics(ad, false);
    }),
  );
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
      try {
        const cached = await loadMetaAdCache(ad.adLibraryId);
        if (applyCachedEnrichment(ad, cached)) {
          return;
        }

        const detail = await enrichMetaAdFromPublicDetail(ad);
        ad.debug.metaDetail = {
          checkedAt: detail.checkedAt,
          status: "PENDING",
          pageUrl: detail.pageUrl,
          transport: detail.transport,
          errorMessage: detail.errorMessage,
          actorId: detail.actorId,
          actorRunId: detail.actorRunId,
          actorDatasetId: detail.actorDatasetId,
          pageLoaded: detail.pageLoaded,
          mainResponseStatus: detail.mainResponseStatus,
          mainResponseUrl: detail.mainResponseUrl,
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
        ad.debug.metaDetail.status = resolveMetaDetailStatus(ad);
        refreshResolutionDebug(ad);
        await saveMetaAdCache(ad);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Meta detail enrichment failed.";
        ad.debug.metaDetail = {
          checkedAt: new Date().toISOString(),
          status: "META_BROWSER_FAILED",
          pageUrl: ad.adLibraryUrl,
          transport: "none",
          errorMessage: message,
          actorId: null,
          actorRunId: null,
          actorDatasetId: null,
          pageLoaded: false,
          mainResponseStatus: null,
          mainResponseUrl: null,
          visibleTextSnippet: null,
          structuredCandidates: [],
          responses: [],
        };
        ad.metaDetailMetrics = {
          spend: createMetaNotDisclosedSpendMetric("META_AD_LIBRARY_DETAIL"),
          impressions: createMetaNotDisclosedMetric("META_AD_LIBRARY_DETAIL"),
          audienceSize: createMetaNotDisclosedMetric("META_AD_LIBRARY_DETAIL"),
        };
        if (ad.metaMetrics.spend.status !== "META_DISCLOSED") {
          ad.metaMetrics.spend = createMetaNotDisclosedSpendMetric("META_AD_LIBRARY_DETAIL");
        }
        if (ad.metaMetrics.impressions.status !== "META_DISCLOSED") {
          ad.metaMetrics.impressions = createMetaNotDisclosedMetric("META_AD_LIBRARY_DETAIL");
        }
        if (ad.metaMetrics.audienceSize.status !== "META_DISCLOSED") {
          ad.metaMetrics.audienceSize = createMetaNotDisclosedMetric("META_AD_LIBRARY_DETAIL");
        }
        applyFinalMetrics(ad, false);
        refreshResolutionDebug(ad);
      }
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
      try {
        const match = await provider.findAdMatch(ad);
        const accepted =
          match.status === "PATHMATICS_MATCH_FOUND" &&
          match.confidence != null &&
          match.confidence * 100 >= provider.getMinimumConfidence();

        const effectiveStatus: PathmaticsDebugStatus =
          match.status === "PATHMATICS_MATCH_FOUND" && !accepted
            ? "PATHMATICS_LOW_CONFIDENCE"
            : match.status;

        ad.intelligenceMatch = {
          provider: effectiveStatus === "PATHMATICS_MATCH_FOUND" ? "PATHMATICS" : null,
          confidence: match.confidence,
          matchId: match.matchId,
          status: effectiveStatus,
          reasons: match.reasons,
        };
        ad.debug.pathmatics = {
          configured: provider.isConfigured(),
          status: effectiveStatus,
          confidence: match.confidence,
          matchId: match.matchId,
          reasons: match.reasons,
          metricLevel: "UNKNOWN",
        };
        ad.pathmaticsMetrics.providerStatus = effectiveStatus;
        ad.pathmaticsMetrics.providerMessage =
          !accepted && match.status === "PATHMATICS_MATCH_FOUND"
            ? `Candidate found but rejected below confidence threshold ${provider.getMinimumConfidence()}.`
            : match.message;

        if (accepted) {
          ad.pathmaticsMetrics.spend = await provider.getSpend(match, ad);
          ad.pathmaticsMetrics.impressions = await provider.getImpressions(match, ad);
          ad.pathmaticsMetrics.audienceSize = await provider.getAudience(match, ad);

          if (
            !ad.pathmaticsMetrics.spend &&
            !ad.pathmaticsMetrics.impressions &&
            !ad.pathmaticsMetrics.audienceSize
          ) {
            ad.pathmaticsMetrics.providerStatus = "PATHMATICS_METRIC_NOT_AD_LEVEL";
            ad.debug.pathmatics.status = "PATHMATICS_METRIC_NOT_AD_LEVEL";
            ad.pathmaticsMetrics.providerMessage =
              "A Pathmatics match exists, but no ad-level metrics were available.";
            ad.intelligenceMatch.status = "PATHMATICS_METRIC_NOT_AD_LEVEL";
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "The Pathmatics query failed.";
        ad.intelligenceMatch = {
          provider: null,
          confidence: null,
          matchId: null,
          status: "PATHMATICS_QUERY_FAILED",
          reasons: [message],
        };
        ad.debug.pathmatics = {
          configured: provider.isConfigured(),
          status: "PATHMATICS_QUERY_FAILED",
          confidence: null,
          matchId: null,
          reasons: [message],
          metricLevel: "UNKNOWN",
        };
        ad.pathmaticsMetrics.providerStatus = "PATHMATICS_QUERY_FAILED";
        ad.pathmaticsMetrics.providerMessage = message;
      }

      applyFinalMetrics(ad, true);
      refreshResolutionDebug(ad);
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

async function processModeledImpressionsBatch(job: MetaAdsJob) {
  const pendingAds = job.ads.filter(needsModelEstimate).slice(0, MODEL_BATCH_SIZE);
  if (pendingAds.length === 0) {
    return false;
  }

  touch(job, {
    status: "MODELING_IMPRESSIONS",
    progressMessage: `Estimating impressions... ${job.processed} / ${job.ads.length}`,
  });
  await saveJob(job);

  await Promise.all(
    pendingAds.map(async (ad) => {
      await applyExperimentalImpressionFallback(ad);
      applyFinalMetrics(ad, false);
      await saveMetaAdCache(ad);
    }),
  );

  const processed = job.ads.filter((ad) => ad.debug.model != null).length;
  touch(job, {
    processed,
    progressMessage: `Estimating impressions... ${processed} / ${job.ads.length}`,
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
    await applyExperimentalImpressionFallbacks(persisted);
    persisted.ads.forEach((ad) => applyFinalMetrics(ad, persisted.status === "COMPLETE"));
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
    await applyExperimentalImpressionFallbacks(job);
    job.ads.forEach((ad) => applyFinalMetrics(ad, true));
    await saveJob(job);
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

  if (job.rawItems.length > 0 && job.ads.some(needsModelEstimate)) {
    await processModeledImpressionsBatch(job);
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
