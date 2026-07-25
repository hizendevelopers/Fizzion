import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getTvDetectedAds, parseTvFiltersFromSearchParams } from "@/lib/tv-analytics";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function GET(request: Request) {
  const requestId = makeRequestId();
  const { searchParams } = new URL(request.url);

  try {
    const filters = parseTvFiltersFromSearchParams(searchParams);
    const payload = await getTvDetectedAds({
      ...filters,
      search: searchParams.get("search") ?? undefined,
    });

    return NextResponse.json({
      ok: true,
      requestId,
      data: payload,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return tvApiError(
        "TV_DETECTED_ADS_VALIDATION_FAILED",
        error.issues[0]?.message ?? "Detected ads filters are invalid.",
        400,
        requestId,
      );
    }

    return tvApiError(
      "TV_DETECTED_ADS_FAILED",
      error instanceof Error ? error.message : "Detected ads could not be loaded.",
      500,
      requestId,
    );
  }
}
