import { NextResponse } from "next/server";

import { getAuthorizationGateSummary, getTvChannelOverview } from "@/lib/tv-data";
import { tvApiError } from "@/lib/tv-api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ channelSlug: string }> },
) {
  const { channelSlug } = await params;
  const overview = await getTvChannelOverview(channelSlug);

  if (!overview) {
    return tvApiError("CHANNEL_NOT_FOUND", `TV channel '${channelSlug}' was not found.`, 404);
  }

  const gate = getAuthorizationGateSummary(overview.source, overview.authorization);

  return NextResponse.json({
    channelId: overview.id,
    previewAvailable: gate.previewAllowed,
    recordingEligible: gate.canRecord,
    previewMessage: gate.previewAllowed
      ? "Authorized internal preview can be enabled once the live adapter is active."
      : "Live monitoring preview is unavailable under the current source authorization.",
    officialReferenceUrl: "https://live.arynews.tv/",
    sourceLatencyMs: overview.source?.lastHeartbeatAt ? overview.source?.lastHeartbeatAt : null,
    sourceType: overview.source?.sourceType ?? null,
    sandboxMode: gate.sandboxMode,
  });
}
