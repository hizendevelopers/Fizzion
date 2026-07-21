import { NextResponse } from "next/server";

import { getWebAdvertisingAnalytics } from "@/lib/web-ad-data";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function GET() {
  const requestId = makeRequestId();

  try {
    const analytics = await getWebAdvertisingAnalytics();
    return NextResponse.json({
      ok: true,
      requestId,
      analytics,
    });
  } catch (error) {
    return tvApiError(
      "WEB_ADVERTISING_ANALYTICS_FAILED",
      error instanceof Error ? error.message : "Web advertising analytics could not be loaded.",
      500,
      requestId,
    );
  }
}
