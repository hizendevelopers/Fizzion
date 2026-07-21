import { NextResponse } from "next/server";

import { listWebAdvertisingAds } from "@/lib/web-ad-data";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function GET() {
  const requestId = makeRequestId();

  try {
    const ads = await listWebAdvertisingAds();
    return NextResponse.json({
      ok: true,
      requestId,
      items: ads,
      total: ads.length,
    });
  } catch (error) {
    return tvApiError(
      "WEB_ADVERTISING_ADS_FAILED",
      error instanceof Error ? error.message : "Web advertising ads could not be loaded.",
      500,
      requestId,
    );
  }
}
