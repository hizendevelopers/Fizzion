import { NextRequest, NextResponse } from "next/server";

import { searchYouTubeChannels } from "@/lib/youtube-tv-data";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({
      ok: false,
      message: "Enter at least 2 characters to search YouTube channels.",
      items: [],
    }, { status: 400 });
  }

  try {
    const items = await searchYouTubeChannels(query);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "Unable to search YouTube channels.",
      items: [],
    }, { status: 500 });
  }
}
