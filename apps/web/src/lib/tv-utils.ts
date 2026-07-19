const DEFAULT_CONTEXT_MS = 5_000;

export type ContextWindowInput = {
  adStartMs: number;
  adEndMs: number;
  segmentStartMs: number;
  segmentEndMs: number;
  desiredPreContextMs?: number;
  desiredPostContextMs?: number;
};

export type ContextWindowResult = {
  contextStartMs: number;
  contextEndMs: number;
  exactAdStartOffsetMs: number;
  exactAdEndOffsetMs: number;
  preContextMs: number;
  postContextMs: number;
  clipDurationMs: number;
  contextStatus: "full" | "partial";
};

export type SourceAuthorizationGate = {
  authorizationStatus?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  permittedMonitoring?: boolean | null;
  permittedRecording?: boolean | null;
  permittedClipping?: boolean | null;
};

export function calculateContextWindow({
  adStartMs,
  adEndMs,
  segmentStartMs,
  segmentEndMs,
  desiredPreContextMs = DEFAULT_CONTEXT_MS,
  desiredPostContextMs = DEFAULT_CONTEXT_MS,
}: ContextWindowInput): ContextWindowResult {
  const contextStartMs = Math.max(segmentStartMs, adStartMs - desiredPreContextMs);
  const contextEndMs = Math.min(segmentEndMs, adEndMs + desiredPostContextMs);
  const preContextMs = Math.max(0, adStartMs - contextStartMs);
  const postContextMs = Math.max(0, contextEndMs - adEndMs);
  const clipDurationMs = Math.max(0, contextEndMs - contextStartMs);

  return {
    contextStartMs,
    contextEndMs,
    exactAdStartOffsetMs: Math.max(0, adStartMs - contextStartMs),
    exactAdEndOffsetMs: Math.max(0, adEndMs - contextStartMs),
    preContextMs,
    postContextMs,
    clipDurationMs,
    contextStatus:
      preContextMs >= desiredPreContextMs && postContextMs >= desiredPostContextMs
        ? "full"
        : "partial",
  };
}

export function buildTvRecordingFilename(
  channelSlug: string,
  baghdadIsoTimestamp: string,
  extension: "ts" | "mp4" | "mov" = "ts",
) {
  const date = new Date(baghdadIsoTimestamp);
  const baghdadParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const timeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const year = baghdadParts.find((part) => part.type === "year")?.value ?? "0000";
  const month = baghdadParts.find((part) => part.type === "month")?.value ?? "00";
  const day = baghdadParts.find((part) => part.type === "day")?.value ?? "00";
  const hour = timeParts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = timeParts.find((part) => part.type === "minute")?.value ?? "00";
  const second = timeParts.find((part) => part.type === "second")?.value ?? "00";

  return `${channelSlug}__${year}-${month}-${day}__${hour}-${minute}-${second}__Asia-Baghdad.${extension}`;
}

export function isSourceAuthorizedForRecording(
  gate: SourceAuthorizationGate,
  now = new Date(),
) {
  if (gate.authorizationStatus !== "approved") {
    return false;
  }

  if (!gate.permittedMonitoring || !gate.permittedRecording || !gate.permittedClipping) {
    return false;
  }

  const nowTime = now.getTime();

  if (gate.validFrom) {
    const validFrom = new Date(gate.validFrom).getTime();
    if (!Number.isNaN(validFrom) && nowTime < validFrom) {
      return false;
    }
  }

  if (gate.validUntil) {
    const validUntil = new Date(gate.validUntil).getTime();
    if (!Number.isNaN(validUntil) && nowTime > validUntil) {
      return false;
    }
  }

  return true;
}

export function detectBoundaryCrossing(startMs: number, endMs: number, segmentEndMs: number) {
  return startMs < segmentEndMs && endMs > segmentEndMs;
}

export function toBaghdadDateTime(utcValue?: string | null) {
  if (!utcValue) {
    return null;
  }

  const date = new Date(utcValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad",
    dateStyle: "medium",
    timeStyle: "medium",
    hour12: false,
  }).format(date);
}
