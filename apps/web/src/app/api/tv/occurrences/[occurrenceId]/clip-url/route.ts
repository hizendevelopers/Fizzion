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

  if (!occurrence.clip?.storageKey) {
    return tvApiError(
      "CLIP_NOT_AVAILABLE",
      "The occurrence clip is not yet available for signed playback.",
      409,
    );
  }

  return NextResponse.json({
    clipUrl: null,
    storageKey: occurrence.clip.storageKey,
    message:
      "Clip metadata exists, but signed media delivery requires storage credentials and bucket activation in the current environment.",
  });
}
