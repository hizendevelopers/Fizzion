import type { NormalizedSocialProfile, NormalizedSocialContent, NormalizedSocialComment } from "../unified-provider";
import {
  toNumber,
  toString,
  toBoolean,
  toDate,
  toStringArray,
  sumEngagements,
  calcEngagementRate,
  extractHashtags,
  extractMentions,
} from "./common";

/**
 * Normalize a TikTok profile from raw Actor output items.
 * TikTok Actor GdWCkxBtKWOsKjdch returns profile info in each video item's authorMeta.
 */
export function normalizeTikTokProfile(
  items: Record<string, unknown>[],
): NormalizedSocialProfile {
  const itemWithMeta = items.find(
    (item) => item.authorMeta != null && typeof item.authorMeta === "object",
  );
  const meta = itemWithMeta?.authorMeta as Record<string, unknown> | undefined;

  let maxFollowers = 0;
  let maxFollowing = 0;
  let totalLikes = 0;
  let totalViews = 0;
  let totalComments = 0;
  let totalShares = 0;

  for (const item of items) {
    const itemMeta = item.authorMeta as Record<string, unknown> | undefined;
    if (itemMeta) {
      const followers = toNumber(itemMeta.followers) ?? 0;
      const following = toNumber(itemMeta.following) ?? 0;
      maxFollowers = Math.max(maxFollowers, followers);
      maxFollowing = Math.max(maxFollowing, following);
    }
    totalLikes += toNumber(item.diggCount) ?? 0;
    totalViews += toNumber(item.playCount) ?? 0;
    totalComments += toNumber(item.commentCount) ?? 0;
    totalShares += toNumber(item.shareCount) ?? 0;
  }

  const profileUrl = meta?.url ? toString(meta.url) : "";
  const engagements = sumEngagements({ likes: totalLikes, comments: totalComments, shares: totalShares });

  return {
    platform: "tiktok",
    externalAccountId: meta?.id ? String(meta.id) : undefined,
    displayName: toString(meta?.name) ?? "Unknown",
    username: toString(meta?.uniqueId),
    profileUrl: profileUrl || `https://www.tiktok.com/@${meta?.uniqueId ?? "unknown"}`,
    profileImageUrl: toString(meta?.avatar),
    bio: toString(meta?.signature),
    verified: toBoolean(meta?.verified),
    followers: maxFollowers > 0 ? maxFollowers : undefined,
    following: maxFollowing > 0 ? maxFollowing : undefined,
    totalPosts: items.length,
    totalLikes: totalLikes > 0 ? totalLikes : undefined,
    totalViews: totalViews > 0 ? totalViews : undefined,
    engagements: engagements,
    engagementRate: calcEngagementRate(engagements, maxFollowers),
    rawData: { authorMeta: meta, itemCount: items.length },
  };
}

/**
 * Normalize TikTok content items from raw Actor output.
 */
export function normalizeTikTokContent(
  items: Record<string, unknown>[],
): NormalizedSocialContent[] {
  return items
    .filter((item) => item.id != null)
    .map((item) => {
      const meta = item.authorMeta as Record<string, unknown> | undefined;
      const description = toString(item.description) ?? toString(item.text) ?? "";
      const hashtags = toStringArray(item.hashtags).length > 0
        ? toStringArray(item.hashtags)
        : extractHashtags(description);
      const mentions = extractMentions(description);
      const likes = toNumber(item.diggCount);
      const comments = toNumber(item.commentCount);
      const shares = toNumber(item.shareCount);
      const saves = toNumber(item.savedCount);
      const views = toNumber(item.playCount);
      const engagements = sumEngagements({ likes, comments, shares, saves });
      const covers = item.covers as Record<string, unknown> | undefined;
      const videoMeta = item.videoMeta as Record<string, unknown> | undefined;

      return {
        platform: "tiktok",
        externalContentId: String(item.id),
        externalAccountId: meta?.id ? String(meta.id) : undefined,
        contentType: videoMeta ? "video" : "short",
        title: description ? description.split("\n")[0].slice(0, 120) : undefined,
        caption: description,
        description: description,
        permalink: toString(item.webVideoUrl) ?? toString(item.videoUrl),
        thumbnailUrl: toString(covers?.default) ?? toString(covers?.dynamic),
        mediaUrls: [toString(item.videoUrl)].filter(Boolean) as string[],
        hashtags,
        mentions,
        taggedAccounts: [],
        collaborators: [],
        publishedAt: toDate(item.createTimeISO ?? item.createTime),
        durationSeconds: toNumber(videoMeta?.duration),
        isPinned: toBoolean(item.isPinned),
        views,
        likes,
        comments,
        shares,
        saves,
        engagements,
        engagementRate: calcEngagementRate(engagements, meta ? toNumber(meta.followers) : undefined),
        rawData: item as Record<string, unknown>,
      };
    });
}

/**
 * Normalize TikTok comments from raw Actor output if available.
 */
export function normalizeTikTokComments(
  items: Record<string, unknown>[],
): NormalizedSocialComment[] {
  const comments: NormalizedSocialComment[] = [];

  for (const item of items) {
    const itemComments = item.comments as Record<string, unknown>[] | undefined;
    if (!Array.isArray(itemComments)) continue;

    for (const c of itemComments) {
      const authorMeta = c.authorMeta as Record<string, unknown> | undefined;
      comments.push({
        externalCommentId: String(c.id ?? c.commentId ?? Math.random()),
        authorName: toString(authorMeta?.name),
        authorUsername: toString(authorMeta?.uniqueId),
        authorAvatarUrl: toString(authorMeta?.avatar),
        commentText: toString(c.text ?? c.comment ?? c.message) ?? "",
        likes: toNumber(c.diggCount ?? c.likes),
        repliesCount: toNumber(c.replyCount) ?? 0,
        publishedAt: toDate(c.createTimeISO ?? c.createTime),
        rawData: c as Record<string, unknown>,
      });
    }
  }

  return comments;
}
</create_file>
