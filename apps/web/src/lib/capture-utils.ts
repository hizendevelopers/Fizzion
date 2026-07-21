import { createHash, randomBytes, randomUUID } from "node:crypto";

export const CAPTURE_ACCESS_TOKEN_TTL_HOURS = 24;
export const CAPTURE_REGISTRATION_TTL_MINUTES = 15;
export const CAPTURE_UPLOAD_SESSION_TTL_MINUTES = 60;

export function hashCaptureToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateRegistrationCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);

  let output = "";
  for (const byte of bytes) {
    output += alphabet[byte % alphabet.length];
  }

  return `${output.slice(0, 3)}-${output.slice(3)}`;
}

export function generateAccessToken() {
  return `fca_${randomUUID().replaceAll("-", "")}${randomBytes(8).toString("hex")}`;
}

export function buildUploadReference(deviceId: string, filename: string) {
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 96);
  return `capture/${deviceId}/${Date.now()}-${safeFilename}`;
}

export function computeRetryScheduleMinutes() {
  return [0.17, 0.5, 1, 5, 15, 30];
}

export function nowPlusMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export function nowPlusHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60_000).toISOString();
}

export function parseBearerToken(request: Request) {
  const value = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!value) {
    return null;
  }

  const [scheme, token] = value.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}
