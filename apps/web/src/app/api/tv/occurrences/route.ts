import { NextResponse } from "next/server";

import { listTvOccurrences } from "@/lib/tv-data";
import { tvOccurrenceFilterSchema } from "@/lib/tv-schemas";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = tvOccurrenceFilterSchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    channel: searchParams.get("channel") ?? undefined,
    reviewStatus: searchParams.get("reviewStatus") ?? undefined,
    classification: searchParams.get("classification") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    page: searchParams.get("page") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_FILTERS",
          message: parsed.error.issues[0]?.message ?? "Invalid TV occurrence filters.",
          requestId: crypto.randomUUID(),
        },
      },
      { status: 400 },
    );
  }

  const result = await listTvOccurrences(parsed.data);
  return NextResponse.json(result);
}
