import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Deprecated endpoint. Use /api/meta-ads/scrape instead.",
      userMessage: "This page now uses the new /api/meta-ads/scrape endpoint.",
    },
    { status: 410 },
  );
}

