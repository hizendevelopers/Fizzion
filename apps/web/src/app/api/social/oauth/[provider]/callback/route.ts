import { NextResponse } from "next/server";

import { makeSocialRequestId, socialApiError } from "@/lib/social-api";
import { completeSocialOAuthConnection } from "@/lib/social-data";
import { socialCallbackQuerySchema, socialProviderSchema } from "@/lib/social-schemas";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const requestId = makeSocialRequestId();
  const { provider } = await params;
  const providerParsed = socialProviderSchema.safeParse(provider);
  const { searchParams } = new URL(request.url);
  const parsed = socialCallbackQuerySchema.safeParse({
    state: searchParams.get("state") ?? undefined,
    code: searchParams.get("code") ?? undefined,
    mode: searchParams.get("mode") ?? undefined,
  });

  if (!providerParsed.success) {
    return socialApiError(
      "INVALID_OAUTH_CALLBACK",
      providerParsed.error.issues[0]?.message ?? "Invalid provider.",
      400,
      requestId,
    );
  }

  if (!parsed.success) {
    return socialApiError(
      "INVALID_OAUTH_CALLBACK",
      parsed.error.issues[0]?.message ?? "Invalid OAuth callback payload.",
      400,
      requestId,
    );
  }

  // Live OAuth token exchange isn't wired up for any provider — the app
  // connects accounts through the Apify-based public-scrape flow
  // instead (see /api/social/connect/[provider] and
  // /api/social/connections/apify-connect). Nothing in the UI links to
  // this route today; it's kept only so a stale bookmarked callback URL
  // fails with a clear, honest error instead of a stack trace.
  try {
    const result = await completeSocialOAuthConnection({
      provider: providerParsed.data,
      state: parsed.data.state,
      code: parsed.data.code,
    });

    return NextResponse.json({
      requestId,
      provider: providerParsed.data,
      connectionId: result.connectionId,
      mode: result.mode,
    });
  } catch {
    return socialApiError(
      "OAUTH_NOT_SUPPORTED",
      `Live OAuth sign-in isn't available for ${providerParsed.data} yet. Use the "Connect account" flow instead, which imports public data via Apify.`,
      501,
      requestId,
    );
  }
}
