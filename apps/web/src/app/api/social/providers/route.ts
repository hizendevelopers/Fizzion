import { NextResponse } from "next/server";

import { makeSocialRequestId, socialApiError } from "@/lib/social-api";
import { listSocialProviderAvailability } from "@/lib/social-providers";

export async function GET() {
  const requestId = makeSocialRequestId();

  try {
    const providers = listSocialProviderAvailability();
    return NextResponse.json({
      requestId,
      items: providers,
      availableProviders: providers.filter((provider) => provider.available).map((provider) => provider.provider),
    });
  } catch (error) {
    return socialApiError(
      "SOCIAL_PROVIDERS_FAILED",
      error instanceof Error ? error.message : "Social providers could not be loaded.",
      500,
      requestId,
    );
  }
}
