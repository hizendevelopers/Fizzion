import type { NormalizedSocialInput } from "@/lib/apify/unified-provider";

/**
 * Build Instagram Actor input from normalized user input.
 * Instagram Actor fcz9izasQrM1LD56D supports post scraping by username.
 */
export function buildInstagramInput(
  normalized: NormalizedSocialInput,
  resultsLimit = 100,
): Record<string, unknown> {
  const username = normalized.username ?? normalized.handle;

  if (!username) {
    throw new Error("Instagram username is required.");
  }

  if (resultsLimit < 1) {
    throw new Error("resultsLimit must be at least 1.");
  }

  return {
    scrapeType: "posts",
    username,
    hashtag: "",
    keyword: "",
    maxResults: resultsLimit,
    minLikes: 0,
    includeVideos: true,
    includeComments: false,
  };
}

