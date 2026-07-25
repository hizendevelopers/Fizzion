import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getWebOverview, parseWebFiltersFromSearchParams } from "@/lib/web-analytics";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function GET(request: Request) {
  const requestId = makeRequestId();
  const { searchParams } = new URL(request.url);

  try {
    const filters = parseWebFiltersFromSearchParams(searchParams);
    const payload = await getWebOverview(filters);

    return NextResponse.json({
      ok: true,
      requestId,
      data: payload,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return tvApiError(
        "WEB_OVERVIEW_VALIDATION_FAILED",
        error.issues[0]?.message ?? "Web overview filters are invalid.",
        400,
        requestId,
      );
    }

    return tvApiError(
      "WEB_OVERVIEW_FAILED",
      error instanceof Error ? error.message : "Web overview could not be loaded.",
      500,
      requestId,
    );
  }
}
