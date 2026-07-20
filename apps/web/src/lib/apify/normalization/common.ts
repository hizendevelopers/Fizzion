import type {
  NormalizedSocialContent,
  NormalizedSocialProfile,
} from "../unified-provider";

/**
 * Map a raw value to a number or undefined.
 */
export function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && !Number.isNaN(value) && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[,\s]/g, "");
    const parsed = Number(cleaned);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/**
 * Map a raw value to a string or undefined.
 */
export function toString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

/**
 * Map a raw value to a boolean.
 */
export function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (["true", "1", "yes"].includes(value.toLowerCase())) return true;
    if (["false", "0", "no"].includes(value.toLowerCase())) return false;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return undefined;
}

/**
 * Safely parse a date value.
 */
export function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return undefined;
}

/**
 * Safely extract a string array from a raw value.
 */
export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof value === "string") {
    return [value.trim()];
  }
  return [];
}

/**
 * Get a nested value from an object using a dot-separated path.
 */
export function getNested(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/**
 * Safe integer parsing with minimum value.
 */
export function toPositiveInt(value: unknown): number | undefined {
  const num = toNumber(value);
  if (num === undefined) return undefined;
  const int = Math.floor(num);
  return int >= 0 ? int : undefined;
}

/**
 * Calculate total engagements from available interaction metrics.
 * Returns undefined when no values are available.
 */
export function sumEngagements(metrics: {
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  reactions?: number;
}): number | undefined {
  const values = [
    metrics.likes,
    metrics.comments,
    metrics.shares,
    metrics.saves,
    metrics.reactions,
  ].filter((v): v is number => v !== undefined);

  if (values.length === 0) return undefined;
  return values.reduce((a, b) => a + b, 0);
}

/**
 * Calculate engagement rate as a percentage of engagements/followers.
 */
export function calcEngagementRate(
  engagements?: number,
  base?: number,
): number | undefined {
  if (engagements === undefined || base === undefined || base <= 0) {
    return undefined;
  }
  return Number(((engagements / base) * 100).toFixed(2));
}

/**
 * Extract hashtags from text using regex.
 */
export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[a-zA-Z0-9_\u0600-\u06FF]+/g);
  if (!matches) return [];
  const seen = new Set<string>();
  return matches
    .map((tag) => tag.replace(/^#/, "").toLowerCase())
    .filter((tag) => {
      if (seen.has(tag)) return false;
      seen.add(tag);
      return true;
    });
}

/**
 * Extract @mentions from text.
 */
export function extractMentions(text: string): string[] {
  const matches = text.match(/@[a-zA-Z0-9_.]+/g);
  if (!matches) return [];
  const seen = new Set<string>();
  return matches
    .map((m) => m.replace(/^@/, ""))
    .filter((m) => {
      if (seen.has(m)) return false;
      seen.add(m);
      return true;
    });
}
