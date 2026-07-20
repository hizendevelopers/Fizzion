/**
 * Calculate total engagements from available interaction metrics.
 * Returns undefined when no values are available.
 */
export function calculateEngagements(metrics: {
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
  ].filter((value): value is number => typeof value === "number");

  if (values.length === 0) {
    return undefined;
  }

  return values.reduce((total, value) => total + value, 0);
}

/**
 * Calculate engagement rate as a percentage of engagements over followers.
 * Returns undefined when data is insufficient.
 */
export function calculateEngagementRateByFollowers(
  engagements?: number,
  followers?: number,
): number | undefined {
  if (
    engagements === undefined ||
    followers === undefined ||
    followers <= 0
  ) {
    return undefined;
  }

  return Number(((engagements / followers) * 100).toFixed(2));
}

/**
 * Calculate engagement rate as a percentage of engagements over reach.
 * Returns undefined when data is insufficient.
 */
export function calculateEngagementRateByReach(
  engagements?: number,
  reach?: number,
): number | undefined {
  if (
    engagements === undefined ||
    reach === undefined ||
    reach <= 0
  ) {
    return undefined;
  }

  return Number(((engagements / reach) * 100).toFixed(2));
}

/**
 * Extract unique hashtags from a text string, removing duplicates and normalizing.
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
 * Extract @mentions from a text string.
 */
export function extractMentions(text: string): string[] {
  const matches = text.match(/@[a-zA-Z0-9_.]+/g);
  if (!matches) return [];

  const seen = new Set<string>();
  return matches
    .map((mention) => mention.replace(/^@/, ""))
    .filter((mention) => {
      if (seen.has(mention)) return false;
      seen.add(mention);
      return true;
    });
}

/**
 * Map a raw numeric value, converting undefined/null to undefined.
 */
export function safeNumber(value: unknown): number | undefined {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

/**
 * Map a raw string value, returning undefined for empty/falsy.
 */
export function safeString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return undefined;
}

/**
 * Map a raw boolean value.
 */
export function safeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true" || value === "1") return true;
    if (value.toLowerCase() === "false" || value === "0") return false;
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
export function safeDate(value: unknown): Date | undefined {
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
 * Safely get a string from an array at a given index.
 */
export function safeArrayItem<T>(arr: unknown, index = 0): T | undefined {
  if (Array.isArray(arr) && arr.length > index) return arr[index] as T;
  return undefined;
}

/**
 * Extract a nested field from an object using dot notation.
 */
export function getNestedField(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

