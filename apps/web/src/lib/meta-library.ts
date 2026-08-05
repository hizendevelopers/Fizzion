/**
 * Meta Library — shared helpers for the Apify Meta/Facebook Ad Library scraper.
 *
 * Kept framework-agnostic so it can be unit-tested independently and reused by
 * the API route, the client component, and test suites.
 */

export const META_AD_LIBRARY_ACTOR_ID = "JHGi3kAzHO1t3Fxrb";

export const DEFAULT_MAX_RESULTS = 50;
export const MIN_MAX_RESULTS = 10;
export const MAX_MAX_RESULTS = 500;

/**
 * Normalize a user-supplied maximum-results value into a safe, positive integer.
 *
 * Rules:
 * - Missing, null, undefined, NaN, empty string, or 0 => DEFAULT_MAX_RESULTS (50)
 * - Negative => DEFAULT_MAX_RESULTS (50)
 * - Below MIN_MAX_RESULTS => MIN_MAX_RESULTS (10)
 * - Above MAX_MAX_RESULTS => MAX_MAX_RESULTS (500)
 * - Any other finite number is floored and clamped to [MIN, MAX].
 *
 * The returned value is ALWAYS a positive integer between MIN and MAX, so it can
 * never be passed to Apify as 0, NaN, null, an empty string, or a negative number.
 */
export function sanitizeMaxResults(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_RESULTS;
  }

  return Math.min(MAX_MAX_RESULTS, Math.max(MIN_MAX_RESULTS, Math.floor(parsed)));
}

/**
 * Build the Apify run options for starting the Meta Ad Library Actor.
 *
 * Only valid Apify run options are included here. `maxItems` is a pay-per-result
 * run option so Apify never sees a zero charged-results limit. Fields such as
 * `waitForFinish`, `waitSecs`, `timeout`, `memory`, and `maxTotalChargeUsd` are
 * NOT part of the Actor's input schema and must never be placed in the input or
 * in this run-options object. Waiting is handled separately via
 * `client.run(runId).waitForFinish({ waitSecs })`.
 */
export function buildMetaLibraryRunOptions(maxResults: unknown): {
  maxItems: number;
} {
  return {
    maxItems: sanitizeMaxResults(maxResults),
  };
}

/**
 * Build the Actor input. Includes a positive result-limit field when the Actor
 * schema accepts it. The exact field name used by this Actor is `maxResults`.
 */
export function buildMetaLibraryActorInput(
  input: {
    country?: string;
    searchQuery?: string;
    pageId?: string;
    activeStatus?: string;
    adType?: string;
    mediaType?: string;
    isTargetedCountry?: boolean;
    sortMode?: string;
    sortDirection?: string;
    maxConcurrency?: number;
    requestHandlerTimeoutSecs?: number;
  },
  maxResults: unknown,
): Record<string, unknown> {
  const safeMax = sanitizeMaxResults(maxResults);

  return {
    country: input.country || "US",
    searchQuery: input.searchQuery || "",
    pageId: input.pageId || "",
    activeStatus: input.activeStatus || "active",
    adType: input.adType || "all",
    mediaType: input.mediaType || "all",
    isTargetedCountry: typeof input.isTargetedCountry === "boolean" ? input.isTargetedCountry : false,
    sortMode: input.sortMode || "total_impressions",
    sortDirection: input.sortDirection || "desc",
    maxConcurrency: typeof input.maxConcurrency === "number" ? input.maxConcurrency : 1,
    requestHandlerTimeoutSecs:
      typeof input.requestHandlerTimeoutSecs === "number" ? input.requestHandlerTimeoutSecs : 900,
    // Positive result-limit field for pay-per-result Actors that read it from input.
    maxResults: safeMax,
  };
}

/**
 * Max seconds the route will poll a running Actor before giving up.
 */
export const META_LIBRARY_POLL_TIMEOUT_SECS = 180;

/**
 * Data shape returned by the API route to the client.
 */
export type MetaLibraryApiResult = {
  ok: boolean;
  runId?: string;
  datasetId?: string;
  status?: string;
  total?: number;
  error?: string;
  errorCode?: string;
  httpStatus?: number;
  details?: string;
  userMessage?: string;
  emptyButSucceeded?: boolean;
  query?: Record<string, unknown>;
  items?: Record<string, unknown>[];
};
