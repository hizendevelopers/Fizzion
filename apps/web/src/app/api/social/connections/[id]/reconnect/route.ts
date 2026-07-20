import { NextResponse } from "next/server";

import { makeSocialRequestId, socialApiError } from "@/lib/social-api";
import { createSocialAuthorizationLink, getSocialConnectionDetail } from "@/lib/social-data";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = makeSocialRequestId();
  const { id } = await params;
  const connection = await getSocialConnectionDetail(id);

  if (!connection) {
    return socialApiError("SOCIAL_CONNECTION_NOT_FOUND", "Social connection was not found.", 404, requestId);
  }

  const result = await createSocialAuthorizationLink({
    provider: connection.provider,
    accountInput: connection.publicProfileUrl ?? connection.username,
  });

  return NextResponse.json({
    requestId,
    authorizationUrl: result.authorizationUrl,
    mode: result.mode,
  });
}
