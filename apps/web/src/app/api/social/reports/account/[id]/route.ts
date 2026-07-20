import { NextResponse } from "next/server";

import { makeSocialRequestId, socialApiError } from "@/lib/social-api";
import { getSocialAccountDetail } from "@/lib/social-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = makeSocialRequestId();
  const { id } = await params;
  const detail = await getSocialAccountDetail(id);

  if (!detail) {
    return socialApiError("SOCIAL_ACCOUNT_NOT_FOUND", "Social account was not found.", 404, requestId);
  }

  return NextResponse.json({ requestId, summary: detail });
}
