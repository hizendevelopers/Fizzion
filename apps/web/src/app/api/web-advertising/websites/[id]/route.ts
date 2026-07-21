import { NextResponse } from "next/server";

import { getWebAdvertisingWebsiteDetail } from "@/lib/web-ad-data";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = makeRequestId();
  const { id } = await params;

  try {
    const website = await getWebAdvertisingWebsiteDetail(id);
    if (!website) {
      return tvApiError("WEBSITE_NOT_FOUND", "Web advertising website was not found.", 404, requestId);
    }

    return NextResponse.json({
      ok: true,
      requestId,
      website,
    });
  } catch (error) {
    return tvApiError(
      "WEB_ADVERTISING_WEBSITE_FAILED",
      error instanceof Error ? error.message : "Web advertising website detail could not be loaded.",
      500,
      requestId,
    );
  }
}
