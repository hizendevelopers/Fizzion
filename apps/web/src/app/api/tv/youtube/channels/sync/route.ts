import { NextResponse } from "next/server";

import { refreshAllConnectedYouTubeTvChannels } from "@/lib/youtube-tv-data";

export async function POST() {
  try {
    const items = await refreshAllConnectedYouTubeTvChannels();
    return NextResponse.json({ ok: true, items, refreshedCount: items.length });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "Unable to refresh connected YouTube channels.",
      items: [],
    }, { status: 500 });
  }
}
