import type { NormalizedSocialInput } from "@/lib/apify/unified-provider";

/**
 * Build Facebook Actor input from normalized user input.
 * Facebook Actor 4Hv5RhChiaDk6iwad supports page URLs.
 */
export function buildFacebookInput(
  normalized: NormalizedSocialInput,
): Record<string, unknown> {
  const pageUrl = normalized.normalizedUrl;

  if (!pageUrl) {
    throw new Error("Facebook Page URL is required.");
  }

  return {
    startUrls: [{ url: pageUrl }],
  };
}

/**
 * Build Facebook Actor input for multiple pages in batch.
 */
export function buildFacebookBatchInput(
  pageUrls: string[],
): Record<string, unknown> {
  if (pageUrls.length === 0) {
    throw new Error("At least one Facebook Page URL is required.");
  }

  return {
    startUrls: pageUrls.map((url) => ({ url })),
  };
}

