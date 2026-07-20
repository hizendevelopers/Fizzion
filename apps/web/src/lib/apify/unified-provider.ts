import type { SocialProviderKey } from "@/lib/social-schemas";
import type { StartActorResult } from "./apify-service";

/**
 * Normalized social input after passing through validation and normalization.
 */
export interface NormalizedSocialInput {
  platform: SocialProviderKey;
  originalInput: string;
  normalizedUrl?: string;
  username?: string;
  handle?: string;
  externalId?: string;
  inputType: "url" | "username" | "handle" | "video";
}

/**
 * Normalized social profile data structure.
 * All platform scrapers map their raw data into this shape.
 */
export interface NormalizedSocialProfile {
  platform: SocialProviderKey;
  externalAccountId?: string;
  displayName: string;
  username?: string;
  profileUrl: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  bio?: string;
  category?: string;
  verified?: boolean;
  followers?: number;
  following?: number;
  totalPosts?: number;
  totalLikes?: number;
  totalViews?: number;
  reach?: number;
  impressions?: number;
  engagements?: number;
  engagementRate?: number;
  rawData: Record<string, unknown>;
}

/**
 * Normalized social content data structure.
 */
export interface NormalizedSocialContent {
  platform: SocialProviderKey;
  externalContentId: string;
  externalAccountId?: string;
  contentType:
    | "post"
    | "image"
    | "video"
    | "short"
    | "reel"
    | "carousel"
    | "story"
    | "live"
    | "unknown";
  title?: string;
  caption?: string;
  description?: string;
  permalink?: string;
  thumbnailUrl?: string;
  mediaUrls: string[];
  hashtags: string[];
  mentions: string[];
  taggedAccounts: string[];
  collaborators: string[];
  publishedAt?: Date;
  durationSeconds?: number;
  isPinned?: boolean;
  views?: number;
  reach?: number;
  impressions?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  reactions?: number;
  engagements?: number;
  engagementRate?: number;
  rawData: Record<string, unknown>;
}

/**
 * Normalized social comment structure.
 */
export interface NormalizedSocialComment {
  externalCommentId: string;
  parentCommentId?: string;
  authorName?: string;
  authorUsername?: string;
  authorAvatarUrl?: string;
  commentText: string;
  likes?: number;
  repliesCount?: number;
  publishedAt?: Date;
  sentiment?: string;
  rawData: Record<string, unknown>;
}

/**
 * Unified provider interface that every platform scraper adapter implements.
 */
export interface SocialScraperProvider {
  platform: SocialProviderKey;

  validateInput(input: string): Promise<NormalizedSocialInput>;

  buildActorInput(
    normalizedInput: NormalizedSocialInput,
    options?: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;

  startScrape(
    normalizedInput: NormalizedSocialInput,
    options?: Record<string, unknown>,
  ): Promise<StartActorResult>;

  normalizeProfile(
    items: Record<string, unknown>[],
  ): Promise<NormalizedSocialProfile>;

  normalizeContent(
    items: Record<string, unknown>[],
  ): Promise<NormalizedSocialContent[]>;

  normalizeComments?(
    items: Record<string, unknown>[],
  ): Promise<NormalizedSocialComment[]>;
}

