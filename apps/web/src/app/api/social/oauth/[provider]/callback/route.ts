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
  } catch (error) {
    return socialApiError(
      "OAUTH_CALLBACK_FAILED",
      error instanceof Error ? error.message : "OAuth callback failed.",
      409,
      requestId,
    );
  }
}
