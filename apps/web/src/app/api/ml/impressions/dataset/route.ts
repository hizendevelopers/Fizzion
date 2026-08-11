import { NextResponse } from "next/server";

import { listMetaTrainingRows } from "@/lib/meta-training-dataset";

export const dynamic = "force-dynamic";

function parseBooleanParam(value: string | null) {
  if (value == null) {
    return undefined;
  }
  return value === "true";
}

function parseNumberParam(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await listMetaTrainingRows({
      page: parseNumberParam(searchParams.get("page"), 1),
      pageSize: parseNumberParam(searchParams.get("pageSize"), 25),
      search: searchParams.get("search") ?? undefined,
      country: searchParams.get("country") ?? undefined,
      platform: searchParams.get("platform") ?? undefined,
      creativeType: searchParams.get("creativeType") ?? undefined,
      advertiser: searchParams.get("advertiser") ?? undefined,
      labelStrength: searchParams.get("labelStrength") ?? undefined,
      hasReach: parseBooleanParam(searchParams.get("hasReach")),
      hasImpressions: parseBooleanParam(searchParams.get("hasImpressions")),
      alignedOnly: parseBooleanParam(searchParams.get("alignedOnly")),
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The impressions training dataset could not be loaded.",
      },
      { status: 500 },
    );
  }
}
