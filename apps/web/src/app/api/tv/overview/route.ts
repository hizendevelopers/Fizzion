import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getTvOverview, parseTvFiltersFromSearchParams } from "@/lib/tv-analytics";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function GET(request: Request) {
  const requestId = makeRequestId();
  const { searchParams } = new URL(request.url);

  try {
    const filters = parseTvFiltersFromSearchParams(searchParams);
    const payload = await getTvOverview(filters);

    return NextResponse.json({
      ok: true,
      requestId,
      data: payload,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return tvApiError(
        "TV_OVERVIEW_VALIDATION_FAILED",
        error.issues[0]?.message ?? "TV overview filters are invalid.",
        400,
        requestId,
      );
    }

    return tvApiError(
      "TV_OVERVIEW_FAILED",
      error instanceof Error ? error.message : "TV overview could not be loaded.",
      500,
      requestId,
    );
  }
}
