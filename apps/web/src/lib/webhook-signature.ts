import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies Meta's (Facebook/Instagram) `X-Hub-Signature-256` header:
 * `sha256=<hex hmac of the raw request body, keyed by the app secret>`.
 * Must be checked against the *raw* body bytes/text, before any JSON
 * parsing.
 */
export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const provided = signatureHeader.slice("sha256=".length).trim();
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");

  const providedBuffer = Buffer.from(provided, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}
