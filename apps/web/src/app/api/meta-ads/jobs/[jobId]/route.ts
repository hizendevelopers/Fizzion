import { NextResponse } from "next/server";

import { getMetaAdsJobById } from "@/lib/meta-ads-job-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const job = await getMetaAdsJobById(jobId);

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
    ads: job.status === "SUCCEEDED" ? job.ads : [],
    rawItems: job.status === "SUCCEEDED" ? job.rawItems : [],
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}
