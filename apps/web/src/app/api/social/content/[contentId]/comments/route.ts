import { NextResponse } from "next/server";

import { makeSocialRequestId, socialApiError } from "@/lib/social-api";
import { getSocialContentDetail } from "@/lib/social-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ contentId: string }> },
) {
  const requestId = makeSocialRequestId();
  const { contentId } = await params;
  const detail = await getSocialContentDetail(contentId);

  if (!detail) {
    return socialApiError("SOCIAL_CONTENT_NOT_FOUND", "Social content was not found.", 404, requestId);
  }

  return NextResponse.json({
    requestId,
    items: detail.commentsFeed,
  });
}
