import { NextResponse } from "next/server";

import { getApifyApiToken } from "@/lib/env";
import { createMetaAdsJob, ensureMetaAdsJobWorker } from "@/lib/meta-ads-job-store";
import { sanitizeMaxAds, validateMetaLibraryUrl } from "@/lib/meta-library";

export const dynamic = "force-dynamic";
export const maxDuration = 100;

export async function POST(request: Request) {
  try {
    getApifyApiToken();
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "APIFY_API_TOKEN is not configured.",
      },
      { status: 400 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const validatedUrl = validateMetaLibraryUrl(body.url);
  if (!validatedUrl.ok) {
    return NextResponse.json(
      {
        success: false,
        error: validatedUrl.error,
      },
      { status: 400 },
    );
  }

  const maxAds = sanitizeMaxAds(body.maxAds);

  try {
    const job = await createMetaAdsJob(validatedUrl.url, maxAds);
    ensureMetaAdsJobWorker(job.id);
    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      url: job.url,
      maxAds: job.maxAds,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "The Meta Ad Library job could not be created.",
      },
      { status: 500 },
    );
  }
}
