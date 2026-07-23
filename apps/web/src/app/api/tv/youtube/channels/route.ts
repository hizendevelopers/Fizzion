import { NextResponse } from "next/server";

import { connectYouTubeTvChannel, listConnectedYouTubeTvChannels } from "@/lib/youtube-tv-data";

export async function GET() {
  try {
    const items = await listConnectedYouTubeTvChannels();
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "Unable to load connected YouTube TV channels.",
      items: [],
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.channelId !== "string" || typeof body.title !== "string") {
    return NextResponse.json({
      ok: false,
      message: "Invalid YouTube channel payload.",
    }, { status: 400 });
  }

  try {
    const channelId = await connectYouTubeTvChannel({
      channelId: body.channelId,
      title: body.title,
      handle: typeof body.handle === "string" ? body.handle : null,
      description: typeof body.description === "string" ? body.description : null,
      thumbnailUrl: typeof body.thumbnailUrl === "string" ? body.thumbnailUrl : null,
      customUrl: typeof body.customUrl === "string" ? body.customUrl : null,
      subscriberCount: typeof body.subscriberCount === "number" ? body.subscriberCount : null,
      videoCount: typeof body.videoCount === "number" ? body.videoCount : null,
      viewCount: typeof body.viewCount === "number" ? body.viewCount : null,
    });

    return NextResponse.json({ ok: true, channelId });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "Unable to connect YouTube channel.",
    }, { status: 500 });
  }
}
