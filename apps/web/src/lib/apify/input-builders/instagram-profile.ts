import type { NormalizedSocialInput } from "@/lib/apify/unified-provider";

/**
 * Build Instagram profile Actor input from normalized user input.
 * Actor dSCLg0C3YEZ83HzYX expects usernames.
 */
export function buildInstagramProfileInput(
  normalized: NormalizedSocialInput,
): Record<string, unknown> {
  const username = normalized.username ?? normalized.handle;

  if (!username) {
    throw new Error("Instagram username is required for the profile scraper.");
  }

  return {
    usernames: [username.replace(/^@/, "")],
    includeAboutSection: false,
  };
}
