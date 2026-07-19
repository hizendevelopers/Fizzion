import { NextResponse } from "next/server";

import { getTvOccurrenceDetail } from "@/lib/tv-data";
import { tvApiError } from "@/lib/tv-api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ occurrenceId: string }> },
) {
  const { occurrenceId } = await params;
  const occurrence = await getTvOccurrenceDetail(occurrenceId);

  if (!occurrence) {
    return tvApiError("OCCURRENCE_NOT_FOUND", "TV advertisement occurrence not found.", 404);
  }

  return NextResponse.json({ occurrence });
}
