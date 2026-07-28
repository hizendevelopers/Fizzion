import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getTvFilterOptions, parseTvFiltersFromSearchParams } from "@/lib/tv-analytics";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function GET(request: Request) {
  const requestId = makeRequestId();
  const { searchParams } = new URL(request.url);

  try {
    const filters = parseTvFiltersFromSearchParams(searchParams);
    const payload = await getTvFilterOptions(filters);

    return NextResponse.json({
      ok: true,
      requestId,
      data: payload,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return tvApiError(
        "TV_FILTER_OPTIONS_VALIDATION_FAILED",
        error.issues[0]?.message ?? "TV filter options could not be resolved.",
        400,
        requestId,
      );
    }

    return tvApiError(
      "TV_FILTER_OPTIONS_FAILED",
      error instanceof Error ? error.message : "TV filter options could not be loaded.",
      500,
      requestId,
    );
  }
}
