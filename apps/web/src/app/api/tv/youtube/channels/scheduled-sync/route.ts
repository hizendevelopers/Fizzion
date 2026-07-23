import { NextResponse } from "next/server";

import { getOptionalCronSecret } from "@/lib/env";
import { refreshAllConnectedYouTubeTvChannels } from "@/lib/youtube-tv-data";

function isAuthorized(request: Request) {
  const cronSecret = getOptionalCronSecret();
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";

  if (cronSecret && bearerToken === cronSecret) {
    return true;
  }

  if (!cronSecret && isVercelCron) {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unauthorized scheduled sync request.",
      },
      { status: 401 },
    );
  }

  try {
    const items = await refreshAllConnectedYouTubeTvChannels();
    return NextResponse.json({
      ok: true,
      refreshedCount: items.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to complete scheduled YouTube channel refresh.",
      },
      { status: 500 },
    );
  }
}
