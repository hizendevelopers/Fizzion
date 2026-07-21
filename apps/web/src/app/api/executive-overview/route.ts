import { NextResponse } from "next/server";

import { getExecutiveOverview } from "@/lib/executive-data";
import { makeRequestId, tvApiError } from "@/lib/tv-api";

export async function GET(request: Request) {
  const requestId = makeRequestId();
  const { searchParams } = new URL(request.url);

  try {
    const payload = await getExecutiveOverview({
      range: (searchParams.get("range") as
        | "today"
        | "yesterday"
        | "last7"
        | "last30"
        | "thisMonth"
        | "lastMonth"
        | "thisQuarter"
        | "custom"
        | null) ?? "last30",
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
    });

    return NextResponse.json({
      ok: true,
      requestId,
      ...payload,
    });
  } catch (error) {
    return tvApiError(
      "EXECUTIVE_OVERVIEW_FAILED",
      error instanceof Error ? error.message : "Executive overview could not be loaded.",
      500,
      requestId,
    );
  }
}
