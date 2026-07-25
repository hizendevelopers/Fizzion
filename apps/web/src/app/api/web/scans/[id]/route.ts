import { NextResponse } from "next/server";

import { getWebAdvertisingScanStatus } from "@/lib/web-ad-data";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = makeRequestId();
  const { id } = await params;

  try {
    const scan = await getWebAdvertisingScanStatus(id);
    if (!scan) {
      return tvApiError("WEB_SCAN_NOT_FOUND", "Scan job was not found.", 404, requestId);
    }

    return NextResponse.json({
      ok: true,
      requestId,
      data: scan,
    });
  } catch (error) {
    return tvApiError(
      "WEB_SCAN_STATUS_FAILED",
      error instanceof Error ? error.message : "Scan status could not be loaded.",
      500,
      requestId,
    );
  }
}
