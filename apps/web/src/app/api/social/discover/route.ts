import { NextResponse } from "next/server";

import { makeSocialRequestId, socialApiError } from "@/lib/social-api";
import { discoverSocialAccount } from "@/lib/social-data";
import { socialDiscoverSchema } from "@/lib/social-schemas";

export async function POST(request: Request) {
  const requestId = makeSocialRequestId();
  const body = await request.json().catch(() => null);
  const parsed = socialDiscoverSchema.safeParse(body);

  if (!parsed.success) {
    return socialApiError(
      "INVALID_DISCOVERY_REQUEST",
      parsed.error.issues[0]?.message ?? "Invalid social discovery payload.",
      400,
      requestId,
    );
  }

  const result = await discoverSocialAccount(parsed.data);
  return NextResponse.json({ requestId, ...result });
}
