import { NextResponse, after } from "next/server";

import { queueWebAdvertisingScan } from "@/lib/web-ad-data";
import { executeQueuedWebAdvertisingScan } from "@/lib/web-ad-scan-runner";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = makeRequestId();
  const { id } = await params;

  try {
    const queuedScan = await queueWebAdvertisingScan(id);
    if (!queuedScan) {
      return tvApiError("WEBSITE_NOT_FOUND", "Web advertising website was not found.", 404, requestId);
    }

    // The actual Playwright scan (page load, screenshots, uploads) can
    // take well past a typical serverless response budget, so it runs
    // after this response is sent rather than blocking the request.
    // queueWebAdvertisingScan already wrote a "queued"/"running" row the
    // client can poll (GET /api/web-advertising/websites/[id]).
    if (!queuedScan.deduplicated) {
      after(() => executeQueuedWebAdvertisingScan(queuedScan.runId));
    }

    return NextResponse.json({
      ok: true,
      requestId,
      message: queuedScan.deduplicated
        ? "A scan is already queued or running for this website."
        : "Website scan queued. This can take a minute — refresh to see it complete.",
      scan: queuedScan,
    });
  } catch (error) {
    return tvApiError(
      "WEB_ADVERTISING_SCAN_FAILED",
      error instanceof Error ? error.message : "Website scan could not be queued.",
      500,
      requestId,
    );
  }
}
