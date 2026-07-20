import { NextResponse } from "next/server";

import { makeSocialRequestId, socialApiError } from "@/lib/social-api";
import { persistSocialWebhookEvent } from "@/lib/social-data";
import { socialProviderSchema, socialWebhookIngestSchema } from "@/lib/social-schemas";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const providerParsed = socialProviderSchema.safeParse(provider);
  if (!providerParsed.success) {
    return socialApiError("INVALID_PROVIDER", "Webhook provider is invalid.", 400);
  }

  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("hub.challenge") ?? searchParams.get("challenge");
  const verifyToken = searchParams.get("hub.verify_token") ?? searchParams.get("verify_token");
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.SOCIAL_WEBHOOK_VERIFY_TOKEN;

  if (challenge && verifyToken && expected && verifyToken === expected) {
    return new NextResponse(challenge, { status: 200 });
  }

  return socialApiError(
    "WEBHOOK_VERIFICATION_FAILED",
    "Webhook verification token was rejected.",
    403,
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const requestId = makeSocialRequestId();
  const { provider } = await params;
  const providerParsed = socialProviderSchema.safeParse(provider);
  if (!providerParsed.success) {
    return socialApiError("INVALID_PROVIDER", "Webhook provider is invalid.", 400, requestId);
  }

  const body = await request.json().catch(() => null);
  const parsed = socialWebhookIngestSchema.safeParse({
    eventType: body?.eventType ?? body?.object ?? "event",
    externalEventId: body?.externalEventId ?? body?.id ?? body?.event_id ?? `${provider}-${Date.now()}`,
    connectionId: body?.connectionId,
    payload: body ?? {},
  });

  if (!parsed.success) {
    return socialApiError(
      "INVALID_WEBHOOK_PAYLOAD",
      parsed.error.issues[0]?.message ?? "Invalid social webhook payload.",
      400,
      requestId,
    );
  }

  const event = await persistSocialWebhookEvent(providerParsed.data, parsed.data);
  return NextResponse.json({
    requestId,
    ok: true,
    event,
  });
}
