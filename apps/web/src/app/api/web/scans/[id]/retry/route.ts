import { NextResponse } from "next/server";

import { retryWebAdvertisingScan } from "@/lib/web-ad-data";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = makeRequestId();
  const { id } = await params;

  try {
    const scan = await retryWebAdvertisingScan(id);
    if (!scan) {
      return tvApiError("WEB_SCAN_NOT_FOUND", "Scan job was not found.", 404, requestId);
    }

    return NextResponse.json({
      ok: true,
      requestId,
      data: scan,
      message: scan.deduplicated
        ? "This website already has an active scan."
        : "Retry scan queued successfully.",
    });
  } catch (error) {
    return tvApiError(
      "WEB_SCAN_RETRY_FAILED",
      error instanceof Error ? error.message : "Scan retry could not be queued.",
      500,
      requestId,
    );
  }
}
