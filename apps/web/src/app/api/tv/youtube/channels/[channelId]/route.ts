import { NextResponse } from "next/server";

import {
  disconnectYouTubeTvChannel,
  getConnectedYouTubeTvChannel,
  refreshConnectedYouTubeTvChannel,
} from "@/lib/youtube-tv-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const { channelId } = await params;

  try {
    const item = await getConnectedYouTubeTvChannel(channelId);
    if (!item) {
      return NextResponse.json({ ok: false, message: "YouTube channel not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "Unable to load the YouTube TV channel.",
    }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const { channelId } = await params;
  const body = await request.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : "refresh";

  if (action !== "refresh") {
    return NextResponse.json({ ok: false, message: "Unsupported action." }, { status: 400 });
  }

  try {
    const item = await refreshConnectedYouTubeTvChannel(channelId);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "Unable to refresh the YouTube TV channel.",
    }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const { channelId } = await params;

  try {
    await disconnectYouTubeTvChannel(channelId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "Unable to disconnect the YouTube TV channel.",
    }, { status: 500 });
  }
}
