import { NextResponse } from "next/server";

import { makeSocialRequestId, socialApiError } from "@/lib/social-api";
import { disconnectSocialConnection, getSocialConnectionDetail } from "@/lib/social-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = makeSocialRequestId();
  const { id } = await params;
  const detail = await getSocialConnectionDetail(id);

  if (!detail) {
    return socialApiError("SOCIAL_CONNECTION_NOT_FOUND", "Social connection was not found.", 404, requestId);
  }

  return NextResponse.json({ requestId, item: detail });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = makeSocialRequestId();
  const { id } = await params;

  try {
    await disconnectSocialConnection(id);
    return NextResponse.json({
      requestId,
      ok: true,
      message: "Social connection disconnected successfully.",
    });
  } catch (error) {
    return socialApiError(
      "SOCIAL_DISCONNECT_FAILED",
      error instanceof Error ? error.message : "Social connection could not be disconnected.",
      404,
      requestId,
    );
  }
}
