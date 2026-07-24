import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getOverviewAnalytics, parseOverviewFiltersFromSearchParams } from "@/lib/overview-analytics";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function GET(request: Request) {
  const requestId = makeRequestId();
  const { searchParams } = new URL(request.url);

  try {
    const filters = parseOverviewFiltersFromSearchParams(searchParams);
    const payload = await getOverviewAnalytics(filters);

    return NextResponse.json({
      ok: true,
      requestId,
      data: payload,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return tvApiError(
        "EXECUTIVE_OVERVIEW_VALIDATION_FAILED",
        error.issues[0]?.message ?? "Overview filters are invalid.",
        400,
        requestId,
      );
    }

    return tvApiError(
      "EXECUTIVE_OVERVIEW_FAILED",
      error instanceof Error ? error.message : "Overview could not be loaded.",
      500,
      requestId,
    );
  }
}
