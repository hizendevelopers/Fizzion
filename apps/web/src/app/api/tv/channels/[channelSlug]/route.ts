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
    channel: overview,
    authorizationGate: getAuthorizationGateSummary(overview.source, overview.authorization),
  });
}
