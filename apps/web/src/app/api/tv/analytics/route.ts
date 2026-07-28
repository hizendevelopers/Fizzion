import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getTvAnalytics, parseTvFiltersFromSearchParams } from "@/lib/tv-analytics";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function GET(request: Request) {
  const requestId = makeRequestId();
  const { searchParams } = new URL(request.url);

  try {
    const filters = parseTvFiltersFromSearchParams(searchParams);
    const payload = await getTvAnalytics(filters);

    return NextResponse.json({
      ok: true,
      requestId,
      data: payload,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return tvApiError(
        "TV_ANALYTICS_VALIDATION_FAILED",
        error.issues[0]?.message ?? "TV analytics filters are invalid.",
        400,
        requestId,
      );
    }

    return tvApiError(
      "TV_ANALYTICS_FAILED",
      error instanceof Error ? error.message : "TV analytics could not be loaded.",
      500,
      requestId,
    );
  }
}
