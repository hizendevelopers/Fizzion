import { NextResponse, after } from "next/server";

import { advanceMetaAdsJobInBackground, refreshMetaAdsJob } from "@/lib/meta-ads-job-store";
import type { MetaLibraryAd } from "@/lib/meta-library";

export const dynamic = "force-dynamic";

function serializeAdForApi(ad: MetaLibraryAd) {
  return {
    ...ad,
    rawMetaData: {},
    debug: {
      ...ad.debug,
      metricCandidates: ad.debug.metricCandidates.map((candidate) => ({
        path: candidate.path,
        value: null,
      })),
      metaDetail: ad.debug.metaDetail
        ? {
            ...ad.debug.metaDetail,
            visibleTextSnippet: ad.debug.metaDetail.visibleTextSnippet,
            structuredCandidates: ad.debug.metaDetail.structuredCandidates.map((candidate) => ({
              path: candidate.path,
              value: null,
            })),
            responses: ad.debug.metaDetail.responses.map((response) => ({
              url: response.url,
              status: response.status,
              bodySnippet: null,
            })),
          }
        : undefined,
    },
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await context.params;

    // Advances the job by exactly one bounded stage-batch (Apify status
    // check, or one enrichment/model/Pathmatics batch) and returns the
    // fresh state. This is the only thing that drives the job forward —
    // there is no separate background worker — so progress is tied
    // directly to the client's poll cadence, which is safe under
    // serverless scaling (no long-lived in-process loop to lose).
    const job = await refreshMetaAdsJob(jobId);

    if (!job) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "META_JOB_NOT_FOUND",
            message: "Meta ads job not found or expired.",
            stage: null,
          },
        },
        { status: 404 },
      );
    }

    // Best-effort: get one more stage done in the background after the
    // response is sent, so the next poll (in ~2s) finds the job further
    // along. Never required for correctness — see refreshMetaAdsJob call
    // above, which every poll performs synchronously regardless.
    if (job.status !== "COMPLETE" && job.status !== "FAILED") {
      after(() => advanceMetaAdsJobInBackground(jobId));
    }

    return NextResponse.json(
      {
        success: job.status !== "FAILED",
        jobId: job.id,
        status: job.status,
        progressMessage: job.progressMessage,
        found: job.found,
        processed: job.processed,
        actorRunId: job.actorRunId,
        datasetId: job.datasetId,
        url: job.url,
        maxAds: job.maxAds,
        ads: job.ads.map(serializeAdForApi),
        rawItems: [],
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
      { status: job.status === "FAILED" ? 500 : 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "META_JOB_POLL_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "The Meta ads job failed during polling.",
          stage: null,
        },
      },
      { status: 500 },
    );
  }
}
