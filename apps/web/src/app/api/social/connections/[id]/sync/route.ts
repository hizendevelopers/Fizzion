import { NextResponse } from "next/server";

import { makeSocialRequestId, socialApiError } from "@/lib/social-api";
import { syncSocialConnection } from "@/lib/social-data";
import { socialSyncSchema } from "@/lib/social-schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = makeSocialRequestId();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = socialSyncSchema.safeParse(body);

  if (!parsed.success) {
    return socialApiError(
      "INVALID_SYNC_REQUEST",
      parsed.error.issues[0]?.message ?? "Invalid social sync payload.",
      400,
      requestId,
    );
  }

  try {
    const result = await syncSocialConnection(id, parsed.data);
    return NextResponse.json({
      requestId,
      ok: true,
      ...result,
    });
  } catch (error) {
    return socialApiError(
      "SOCIAL_SYNC_FAILED",
      error instanceof Error ? error.message : "Social sync failed.",
      409,
      requestId,
    );
  }
}
