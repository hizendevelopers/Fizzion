import { NextResponse } from "next/server";

import { refreshMetaAdsJob } from "@/lib/meta-ads-job-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const job = await refreshMetaAdsJob(jobId);

  if (!job) {
    return NextResponse.json(
      {
        success: false,
        error: "Meta ads job not found or expired.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
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
    ads: job.ads,
    rawItems: job.rawItems,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}
