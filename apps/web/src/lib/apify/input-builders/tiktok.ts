import type { NormalizedSocialInput } from "@/lib/apify/unified-provider";

export interface TikTokScrapeOptions {
  resultsPerPage: number;
  profileSorting: "latest" | "popular" | "oldest";
  excludePinnedPosts: boolean;
  includeFollowers: boolean;
  includeFollowing: boolean;
  commentsPerPost: number;
  maxRepliesPerComment: number;
  downloadVideos: boolean;
  downloadCovers: boolean;
}

export const defaultTikTokOptions: TikTokScrapeOptions = {
  resultsPerPage: 100,
  profileSorting: "latest",
  excludePinnedPosts: false,
  includeFollowers: false,
  includeFollowing: false,
  commentsPerPost: 0,
  maxRepliesPerComment: 0,
  downloadVideos: false,
  downloadCovers: false,
};

/**
 * Build TikTok Actor input from normalized user input.
 * TikTok Actor GdWCkxBtKWOsKjdch supports profile URLs directly.
 */
export function buildTikTokInput(
  normalized: NormalizedSocialInput,
  options: Partial<TikTokScrapeOptions> = {},
): Record<string, unknown> {
  const opts = { ...defaultTikTokOptions, ...options };
  const profileUrl = normalized.normalizedUrl;

  if (!profileUrl) {
    throw new Error("TikTok profile URL is required.");
  }

  return {
    hashtags: [],
    resultsPerPage: opts.resultsPerPage,
    profileScrapeSections: ["videos"],
    profileSorting: opts.profileSorting,
    excludePinnedPosts: opts.excludePinnedPosts,
    maxFollowersPerProfile: opts.includeFollowers ? 1000 : 0,
    maxFollowingPerProfile: opts.includeFollowing ? 1000 : 0,
    searchSection: "",
    maxProfilesPerQuery: 10,
    videoSearchSorting: "MOST_RELEVANT",
    videoSearchDateFilter: "ALL_TIME",
    scrapeRelatedSearchWords: false,
    scrapeRelatedVideos: false,
    scrapeAdditionalAuthorMeta: false,
    shouldDownloadVideos: opts.downloadVideos,
    shouldDownloadCovers: opts.downloadCovers,
    shouldDownloadSlideshowImages: false,
    shouldDownloadAvatars: false,
    shouldDownloadMusicCovers: false,
    downloadSubtitlesOptions: "NEVER_DOWNLOAD_SUBTITLES",
    commentsPerPost: opts.commentsPerPost,
    topLevelCommentsPerPost: opts.commentsPerPost,
    maxRepliesPerComment: opts.maxRepliesPerComment,
    proxyCountryCode: "None",
    profileURLs: [profileUrl],
  };
}

