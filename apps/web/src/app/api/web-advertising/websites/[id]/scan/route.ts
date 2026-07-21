import { NextResponse } from "next/server";

import { queueWebAdvertisingScan } from "@/lib/web-ad-data";
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

    return NextResponse.json({
      ok: true,
      requestId,
      message: queuedScan.deduplicated
        ? "A scan is already queued or running for this website."
        : "Website scan queued successfully.",
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
