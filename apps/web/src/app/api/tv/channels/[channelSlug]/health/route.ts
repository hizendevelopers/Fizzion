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

  return NextResponse.json({
    channelId: overview.id,
    slug: overview.slug,
    recordingStatus: overview.recordingStatus,
    sourceHealth: overview.currentSourceHealth,
    lastHeartbeatAt: overview.lastHeartbeatAt,
    lastProcessedAt: overview.lastProcessedAt,
    lastSuccessfulSegment: overview.metrics.lastSuccessfulSegment,
    timelineSegmentCount: overview.recentSegments.length,
    gapCount: overview.metrics.recordingGapCount,
    authorizationGate: getAuthorizationGateSummary(overview.source, overview.authorization),
  });
}
