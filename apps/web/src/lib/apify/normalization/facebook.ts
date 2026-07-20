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
  getNested,
} from "./common";

/**
 * Normalize a Facebook Page profile from raw Actor output items.
 * Facebook Actor 4Hv5RhChiaDk6iwad returns page data and posts.
 */
export function normalizeFacebookProfile(
  items: Record<string, unknown>[],
): NormalizedSocialProfile {
  // Try to find page metadata
  const firstWithPage = items.find(
    (item) => item.pageId != null || item.pageName != null,
  ) ?? items[0];

  const pageId = toString(firstWithPage.pageId);
  const pageName = toString(firstWithPage.pageName ?? firstWithPage.page?.name);
  const username = toString(firstWithPage.username ?? firstWithPage.page?.username);
  const pageUrl = toString(firstWithPage.pageUrl)
    ?? (pageId ? `https://www.facebook.com/${pageId}` : undefined);
  const avatar = toString(firstWithPage.profilePicture ?? firstWithPage.page?.profilePicture ?? firstWithPage.page?.avatar);
  const cover = toString(firstWithPage.coverPicture ?? firstWithPage.page?.cover);
  const description = toString(firstWithPage.about ?? firstWithPage.description ?? firstWithPage.page?.about);
  const category = toString(firstWithPage.category ?? firstWithPage.page?.category);
  const followers = toNumber(firstWithPage.followerCount ?? firstWithPage.page?.followers);
  const likes = toNumber(firstWithPage.likes ?? firstWithPage.page?.likes);
  const checkins = toNumber(firstWithPage.checkins ?? firstWithPage.page?.checkins);

  return {
    platform: "facebook",
    externalAccountId: pageId,
    displayName: pageName ?? "Unknown Page",
    username,
    profileUrl: pageUrl ?? "",
    profileImageUrl: avatar,
    coverImageUrl: cover,
    bio: description,
    category,
    verified: toBoolean(firstWithPage.verified ?? firstWithPage.page?.verified),
    followers,
    totalLikes: likes,
    totalPosts: items.length,
    rawData: { pageId, pageName, checkins, firstItem: firstWithPage },
  };
}

/**
 * Normalize Facebook content items from raw Actor output.
 */
export function normalizeFacebookContent(
  items: Record<string, unknown>[],
): NormalizedSocialContent[] {
  return items
    .filter((item) => item.id != null || item.postId != null)
    .map((item) => {
      const postId = toString(item.postId ?? item.id);
      const message = toString(item.message ?? item.text ?? item.caption ?? item.description) ?? "";
      const description = toString(item.description ?? item.story);
      const hashtags = toStringArray(item.hashtags).length > 0
        ? toStringArray(item.hashtags)
        : extractHashtags(message + " " + (description ?? ""));
      const mentions = toStringArray(item.mentions).length > 0
        ? toStringArray(item.mentions)
        : extractMentions(message);

      const imageList = toStringArray(item.images ?? item.pictureUrls ?? item.photos);
      const videoUrl = toString(item.videoUrl ?? item.video?.source);
      const mediaUrls = [
        ...(videoUrl ? [videoUrl] : []),
        ...imageList,
      ];

      const reactions = toNumber(item.reactionCount ?? item.reactions?.length ?? item.reactions);
      const likes = toNumber(item.likeCount ?? item.likes);
      const comments = toNumber(item.commentCount ?? item.comments?.length ?? item.comments);
      const shares = toNumber(item.shareCount ?? item.shares);
      const views = toNumber(item.viewCount ?? item.views);
      const engagements = sumEngagements({ likes, comments, shares, reactions });

      const attachments = item.attachments as Record<string, unknown> | undefined;
      const imageFromAttachment = toString(getNested(attachments ?? {}, "data.0.media.image.src"))
        ?? toString(getNested(attachments ?? {}, "data.0.target.url"));

      return {
        platform: "facebook",
        externalContentId: postId ?? String(Math.random()),
        contentType: videoUrl ? "video" : imageList.length > 0 ? "image" : "post",
        title: message ? message.split("\n")[0].slice(0, 120) : "Facebook Post",
        caption: message,
        description: description ?? message,
        permalink: toString(item.permalinkUrl ?? item.permalink ?? item.postUrl),
        thumbnailUrl: toString(item.thumbnail ?? item.thumbnailUrl ?? item.picture ?? imageFromAttachment),
        mediaUrls,
        hashtags,
        mentions,
        taggedAccounts: toStringArray(item.taggedUsers ?? item.taggedAccounts ?? item.with),
        collaborators: [],
        publishedAt: toDate(item.createdTime ?? item.created_time ?? item.createdAt ?? item.publishedAt),
        views,
        likes,
        comments,
        shares,
        reactions,
        engagements,
        engagementRate: undefined,
        rawData: item as Record<string, unknown>,
      };
    });
}

/**
 * Normalize Facebook comments if available.
 */
export function normalizeFacebookComments(
  items: Record<string, unknown>[],
): NormalizedSocialComment[] {
  const comments: NormalizedSocialComment[] = [];

  for (const item of items) {
    const itemComments = item.comments as Record<string, unknown>[] | undefined;
    if (!Array.isArray(itemComments)) {
      const nestedComments = item.comments as Record<string, unknown> | undefined;
      const dataArr = nestedComments?.data as Record<string, unknown>[] | undefined;
      if (Array.isArray(dataArr)) {
        for (const c of dataArr) {
          const from = c.from as Record<string, unknown> | undefined;
          comments.push({
            externalCommentId: String(c.id ?? Math.random()),
            parentCommentId: toString(c.parent?.id),
            authorName: toString(from?.name),
            authorUsername: toString(from?.username ?? from?.id),
            authorAvatarUrl: undefined,
            commentText: toString(c.message ?? c.text ?? c.comment) ?? "",
            likes: toNumber(c.likeCount ?? c.likes),
            repliesCount: toNumber(c.commentCount ?? c.replies) ?? 0,
            publishedAt: toDate(c.createdTime ?? c.created_time ?? c.createdAt),
            rawData: c as Record<string, unknown>,
          });
        }
      }
      continue;
    }

    for (const c of itemComments) {
      const from = c.from as Record<string, unknown> | undefined;
      comments.push({
        externalCommentId: String(c.id ?? Math.random()),
        parentCommentId: toString(c.parent?.id),
        authorName: toString(from?.name),
        authorUsername: toString(from?.username ?? from?.id),
        authorAvatarUrl: undefined,
        commentText: toString(c.message ?? c.text ?? c.comment) ?? "",
        likes: toNumber(c.likeCount ?? c.likes),
        repliesCount: toNumber(c.commentCount ?? c.replies) ?? 0,
        publishedAt: toDate(c.createdTime ?? c.created_time ?? c.createdAt),
        rawData: c as Record<string, unknown>,
      });
    }
  }

  return comments;
}
</create_file>
