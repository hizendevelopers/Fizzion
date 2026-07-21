import { NextResponse } from "next/server";

import { listWebAdvertisingWebsites } from "@/lib/web-ad-data";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function GET() {
  const requestId = makeRequestId();

  try {
    const websites = await listWebAdvertisingWebsites();
    return NextResponse.json({
      ok: true,
      requestId,
      items: websites,
      total: websites.length,
    });
  } catch (error) {
    return tvApiError(
      "WEB_ADVERTISING_WEBSITES_FAILED",
      error instanceof Error ? error.message : "Web advertising websites could not be loaded.",
      500,
      requestId,
    );
  }
}
