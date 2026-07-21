import { NextRequest, NextResponse } from "next/server";

import { getOohAnalytics } from "@/lib/ooh/ooh-data";
import { makeOohRequestId, oohApiError } from "@/lib/ooh/ooh-api";
import { oohAssetListQuerySchema } from "@/lib/ooh/ooh-schemas";

export async function GET(request: NextRequest) {
  const requestId = makeOohRequestId();
  const parsed = oohAssetListQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    return oohApiError("INVALID_OOH_ANALYTICS_QUERY", parsed.error.issues[0]?.message ?? "Invalid analytics query.", 400, requestId);
  }

  try {
    const analytics = await getOohAnalytics(parsed.data);
    return NextResponse.json({ ok: true, requestId, analytics });
  } catch (error) {
    return oohApiError(
      "OOH_ANALYTICS_FAILED",
      error instanceof Error ? error.message : "Unable to load OOH analytics.",
      500,
      requestId,
    );
  }
}
