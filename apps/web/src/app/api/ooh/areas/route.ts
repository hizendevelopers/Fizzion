import { NextResponse } from "next/server";

import { listOohAreas } from "@/lib/ooh/ooh-data";
import { makeOohRequestId, oohApiError } from "@/lib/ooh/ooh-api";

export async function GET() {
  const requestId = makeOohRequestId();
  try {
    const areas = await listOohAreas();
    return NextResponse.json({ ok: true, requestId, areas });
  } catch (error) {
    return oohApiError(
      "OOH_AREAS_FAILED",
      error instanceof Error ? error.message : "Unable to load OOH areas.",
      500,
      requestId,
    );
  }
}
