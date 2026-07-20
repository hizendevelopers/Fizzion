import { NextResponse } from "next/server";

import { listSocialConnections } from "@/lib/social-data";
import { socialConnectionQuerySchema } from "@/lib/social-schemas";
import { makeSocialRequestId, socialApiError } from "@/lib/social-api";

export async function GET(request: Request) {
  const requestId = makeSocialRequestId();
  const { searchParams } = new URL(request.url);
  const parsed = socialConnectionQuerySchema.safeParse({
    provider: searchParams.get("provider") ?? undefined,
    dateRange: searchParams.get("dateRange") ?? undefined,
  });

  if (!parsed.success) {
    return socialApiError(
      "INVALID_CONNECTION_FILTERS",
      parsed.error.issues[0]?.message ?? "Invalid social connection filters.",
      400,
      requestId,
    );
  }

  const connections = await listSocialConnections(parsed.data.provider);
  return NextResponse.json({ requestId, items: connections });
}
