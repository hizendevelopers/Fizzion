import { NextResponse } from "next/server";

import { makeSocialRequestId, socialApiError } from "@/lib/social-api";
import { createSocialAuthorizationLink, getDefaultSocialOrganizationId } from "@/lib/social-data";
import { socialConnectStartSchema, socialProviderSchema } from "@/lib/social-schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const requestId = makeSocialRequestId();
  const { provider } = await params;
  const body = await request.json().catch(() => null);
  const providerParsed = socialProviderSchema.safeParse(provider);
  const parsed = socialConnectStartSchema.safeParse({
    provider,
    input: body?.input,
    mode: body?.mode,
  });

  if (!providerParsed.success) {
    return socialApiError(
      "INVALID_CONNECT_REQUEST",
      providerParsed.error.issues[0]?.message ?? "Invalid provider.",
      400,
      requestId,
    );
  }

  if (!parsed.success) {
    return socialApiError(
      "INVALID_CONNECT_REQUEST",
      parsed.error.issues[0]?.message ?? "Invalid social connect payload.",
      400,
      requestId,
    );
  }

  const organizationId = await getDefaultSocialOrganizationId();
  const result = await createSocialAuthorizationLink({
    provider: providerParsed.data,
    accountInput: parsed.data.input,
    organizationId,
  });

  return NextResponse.json({
    requestId,
    provider: providerParsed.data,
    authorizationUrl: result.authorizationUrl,
    mode: result.mode,
  });
}
