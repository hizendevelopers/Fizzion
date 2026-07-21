import { NextResponse } from "next/server";

import { getWebAdvertisingAdDetail } from "@/lib/web-ad-data";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = makeRequestId();
  const { id } = await params;

  try {
    const ad = await getWebAdvertisingAdDetail(id);
    if (!ad) {
      return tvApiError("WEB_AD_NOT_FOUND", "Web advertisement was not found.", 404, requestId);
    }

    return NextResponse.json({
      ok: true,
      requestId,
      ad,
    });
  } catch (error) {
    return tvApiError(
      "WEB_ADVERTISING_AD_FAILED",
      error instanceof Error ? error.message : "Web advertising advertisement detail could not be loaded.",
      500,
      requestId,
    );
  }
}
