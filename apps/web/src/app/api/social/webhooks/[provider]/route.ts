import { NextResponse } from "next/server";

import { makeSocialRequestId, socialApiError } from "@/lib/social-api";
import { persistSocialWebhookEvent } from "@/lib/social-data";
import { socialProviderSchema, socialWebhookIngestSchema } from "@/lib/social-schemas";
import { getOptionalMetaAppSecret } from "@/lib/env";
import { verifyMetaWebhookSignature } from "@/lib/webhook-signature";

// Providers whose webhook deliveries we know how to authenticate today.
// Meta (Facebook/Instagram) signs with X-Hub-Signature-256 over the raw
// body. Everything else has no verification implemented, so those
// deliveries are rejected rather than trusted unverified.
const META_SIGNED_PROVIDERS = new Set(["facebook", "instagram"]);

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

  // Read the raw body first — signature verification must run over the
  // exact bytes Meta signed, before any JSON parsing.
  const rawBody = await request.text();

  if (META_SIGNED_PROVIDERS.has(providerParsed.data)) {
    const appSecret = getOptionalMetaAppSecret();
    if (!appSecret) {
      return socialApiError(
        "WEBHOOK_NOT_CONFIGURED",
        "META_APP_SECRET is not configured, so this webhook cannot be verified. Deliveries are rejected until it is set.",
        503,
        requestId,
      );
    }

    const signature = request.headers.get("x-hub-signature-256");
    if (!verifyMetaWebhookSignature(rawBody, signature, appSecret)) {
      return socialApiError("WEBHOOK_SIGNATURE_INVALID", "Webhook signature verification failed.", 401, requestId);
    }
  } else {
    // No signature scheme implemented for this provider yet — fail
    // closed rather than accept an unverified payload as genuine.
    return socialApiError(
      "WEBHOOK_VERIFICATION_NOT_IMPLEMENTED",
      `Signature verification is not implemented for ${providerParsed.data} webhooks yet.`,
      501,
      requestId,
    );
  }

  const body = (() => {
    try {
      return JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return null;
    }
  })();

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
