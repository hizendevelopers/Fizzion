import type { NormalizedSocialProfile, NormalizedSocialContent } from "../unified-provider";
import {
  toNumber,
  toString,
  toBoolean,
  toDate,
  toStringArray,
  sumEngagements,
  calcEngagementRate,
  extractHashtags,
  getNested,
} from "./common";

/**
 * Normalize a YouTube channel profile from raw Actor output items.
 * YouTube Actor h7sDV53CddomktSi5 returns channel metadata in each item.
 */
export function normalizeYouTubeProfile(
  items: Record<string, unknown>[],
): NormalizedSocialProfile {
  // Find first item with channel info
  const firstWithMeta = items.find(
    (item) => item.channelId != null || item.channelName != null,
  ) ?? items[0];
  const channel = (firstWithMeta.channel ?? {}) as Record<string, unknown>;

  const channelId = toString(firstWithMeta.channelId);
  const channelName = toString(firstWithMeta.channelName ?? channel.name);
  const channelUrl = toString(firstWithMeta.channelUrl)
    ?? (channelId ? `https://www.youtube.com/channel/${channelId}` : undefined);
  const avatar = toString(firstWithMeta.channelAvatar ?? channel.avatar);
  const description = toString(firstWithMeta.channelDescription ?? channel.description);
  const subscribers = toNumber(firstWithMeta.subscriberCount ?? channel.subscriberCount);
  const totalViews = toNumber(firstWithMeta.totalChannelViews ?? channel.views);
  const videoCount = items.length;

  return {
    platform: "youtube",
    externalAccountId: channelId,
    displayName: channelName ?? "Unknown Channel",
    username: toString(firstWithMeta.channelHandle ?? channel.handle),
    profileUrl: channelUrl ?? "",
    profileImageUrl: avatar,
    bio: description,
    category: toString(channel.category),
    verified: toBoolean(firstWithMeta.verified ?? channel.verified),
    followers: subscribers,
    following: undefined,
    totalPosts: videoCount,
    totalViews,
    rawData: { channelId, channelName, firstItem: firstWithMeta },
  };
}

/**
 * Normalize YouTube content items from raw Actor output.
 */
export function normalizeYouTubeContent(
  items: Record<string, unknown>[],
): NormalizedSocialContent[] {
  return items
    .filter((item) => item.id != null || item.videoId != null)
    .map((item) => {
      const videoId = toString(item.videoId ?? item.id);
      const title = toString(item.title ?? item.name) ?? "";
      const description = toString(item.description ?? item.caption) ?? "";
      const thumbnailUrl = toString(getNested(item, "thumbnail.url"))
        ?? toString(getNested(item, "thumbnails.default.url"))
        ?? toString(item.thumbnail);

      const tags = toStringArray(item.tags ?? item.keywords);
      const hashtags = tags.length > 0 ? tags : extractHashtags(description);

      const likes = toNumber(item.likeCount ?? item.likes);
      const comments = toNumber(item.commentCount ?? item.comments);
      const views = toNumber(item.viewCount ?? item.views);
      const shares = toNumber(item.shareCount ?? item.shares);
      const engagements = sumEngagements({ likes, comments, shares });

      const subscribers = toNumber(item.subscriberCount);
      const isShorts = Boolean(item.isShorts ?? item.shorts);
      const isLive = item.liveBroadcast === true || item.liveBroadcast === "live" || item.liveContent === true;
      const isStream = Boolean(item.isStream ?? item.stream);
      const contentType = isLive ? "live" : isStream ? "live" : isShorts ? "short" : "video";

      return {
        platform: "youtube",
        externalContentId: videoId ?? String(Math.random()),
        externalAccountId: toString(item.channelId),
        contentType: contentType as NormalizedSocialContent["contentType"],
        title: title,
        caption: title,
        description: description,
        permalink: videoId ? `https://www.youtube.com/watch?v=${videoId}` : toString(item.videoUrl),
        thumbnailUrl,
        mediaUrls: [toString(item.videoUrl)].filter(Boolean) as string[],
        hashtags,
        mentions: [],
        taggedAccounts: [],
        collaborators: [],
        publishedAt: toDate(item.uploadDate ?? item.publishedAt ?? item.publishedAt),
        durationSeconds: toNumber(item.duration ?? item.lengthSeconds ?? item.durationSeconds),
        views,
        likes,
        comments,
        shares,
        engagements,
        engagementRate: calcEngagementRate(engagements, subscribers),
        rawData: item as Record<string, unknown>,
      };
    });
}

/**
 * Normalize YouTube comments if available.
 */
export function normalizeYouTubeComments(
  items: Record<string, unknown>[],
): import("../unified-provider").NormalizedSocialComment[] {
  const comments: import("../unified-provider").NormalizedSocialComment[] = [];

  for (const item of items) {
    const itemComments = item.comments as Record<string, unknown>[] | undefined;
    if (!Array.isArray(itemComments)) continue;

    for (const c of itemComments) {
      const author = (c.author ?? {}) as Record<string, unknown>;
      comments.push({
        externalCommentId: String(c.id ?? c.commentId ?? Math.random()),
        parentCommentId: toString(c.parentId) as string | undefined,
        authorName: toString(author.displayName ?? author.name),
        authorUsername: toString(author.channelId ?? author.id),
        authorAvatarUrl: toString(author.avatar ?? author.profileImageUrl),
        commentText: toString(c.text ?? c.comment ?? c.message) ?? "",
        likes: toNumber(c.likeCount ?? c.likes),
        repliesCount: toNumber(c.totalReplyCount ?? c.replies) ?? 0,
        publishedAt: toDate(c.publishedAt ?? c.createdAt ?? c.timestamp),
        rawData: c as Record<string, unknown>,
      });
    }
  }

  return comments;
}
