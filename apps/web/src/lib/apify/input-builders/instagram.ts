import type { NormalizedSocialInput } from "@/lib/apify/unified-provider";

/**
 * Build Instagram Actor input from normalized user input.
 * Instagram Actor shu8hvrXbJbY3Eb9W supports profile URLs.
 */
export function buildInstagramInput(
  normalized: NormalizedSocialInput,
  resultsLimit = 100,
): Record<string, unknown> {
  const profileUrl = normalized.normalizedUrl;

  if (!profileUrl) {
    throw new Error("Instagram profile URL is required.");
  }

  if (resultsLimit < 1) {
    throw new Error("resultsLimit must be at least 1.");
  }

  return {
    resultsType: "posts",
    directUrls: [profileUrl],
    resultsLimit,
    searchType: "hashtag",
    searchLimit: 10,
    addParentData: true,
  };
}

