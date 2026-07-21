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
 * Normalize an Instagram profile from raw Actor output items.
 */
export function normalizeInstagramProfile(
  items: Record<string, unknown>[],
): NormalizedSocialProfile {
  const firstItem = items[0] ?? {};
  const owner = (firstItem.owner ?? firstItem.fullDetail) as Record<string, unknown> | undefined;
  const pd = (firstItem.profileData ?? owner) as Record<string, unknown> | undefined;
  const metaData = firstItem.metaData as Record<string, unknown> | undefined;
  const profileActorItem = items.find((item) =>
    Boolean(
      item.username ||
      item.fullName ||
      item.profilePicUrl ||
      item.followersCount ||
      item.postsCount,
    ),
  ) ?? firstItem;

  const actorUsername = toString(profileActorItem.username);
  const actorProfileUrl = toString(profileActorItem.inputUrl ?? profileActorItem.url);
  const actorProfileImageUrl = toString(
    profileActorItem.profilePicUrlHD ??
    profileActorItem.profilePicUrl ??
    getNested(profileActorItem, "profilePic.url"),
  );
  const actorBio = toString(profileActorItem.biography ?? profileActorItem.bio);
  const actorDisplayName = toString(profileActorItem.fullName ?? profileActorItem.name);
  const actorCategory = toString(profileActorItem.categoryName ?? profileActorItem.category);
  const actorVerified = toBoolean(profileActorItem.verified ?? profileActorItem.isVerified);

  let followers = toNumber(getNested(pd ?? {}, "edge_followed_by.count"))
    ?? toNumber(pd?.followers)
    ?? toNumber(metaData?.followersCount)
    ?? toNumber(profileActorItem.followersCount);
  let following = toNumber(getNested(pd ?? {}, "edge_follow.count"))
    ?? toNumber(pd?.following)
    ?? toNumber(metaData?.followsCount)
    ?? toNumber(profileActorItem.followsCount);
  let totalPosts = toNumber(getNested(pd ?? {}, "edge_owner_to_timeline_media.count"))
    ?? toNumber(pd?.posts)
    ?? toNumber(metaData?.postsCount)
    ?? toNumber(profileActorItem.postsCount);

  if (!followers || !totalPosts) {
    let maxFollowers = 0;
    let maxFollowing = 0;
    let postCount = 0;

    for (const item of items) {
      const io = item.owner as Record<string, unknown> | undefined;
      if (io) {
        const f = toNumber(getNested(io, "edge_followed_by.count")) ?? toNumber(io.followersCount);
        if (f && f > maxFollowers) maxFollowers = f;
        const fl = toNumber(getNested(io, "edge_follow.count")) ?? toNumber(io.followingCount);
        if (fl && fl > maxFollowing) maxFollowing = fl;
      }
      postCount++;
    }
    if (!followers) followers = maxFollowers > 0 ? maxFollowers : undefined;
    if (!following) following = maxFollowing > 0 ? maxFollowing : undefined;
    if (!totalPosts) totalPosts = postCount;
  }

  return {
    platform: "instagram",
    externalAccountId: toString(pd?.id ?? owner?.id ?? metaData?.id ?? profileActorItem.id ?? firstItem.ownerId ?? firstItem.id),
    displayName: toString(pd?.full_name ?? pd?.name ?? owner?.fullName ?? metaData?.fullName ?? actorDisplayName ?? firstItem.ownerFullName) ?? "Unknown",
    username: toString(pd?.username ?? pd?.handle ?? owner?.username ?? metaData?.username ?? actorUsername ?? firstItem.ownerUsername),
    profileUrl:
      toString(metaData?.url ?? firstItem.inputUrl ?? actorProfileUrl)
      ?? `https://www.instagram.com/${pd?.username ?? owner?.username ?? metaData?.username ?? actorUsername ?? firstItem.ownerUsername ?? ""}`,
    profileImageUrl: toString(
      pd?.profile_pic_url_hd
      ?? pd?.profile_pic_url
      ?? owner?.profilePicUrl
      ?? metaData?.profilePicUrlHD
      ?? metaData?.profilePicUrl
      ?? actorProfileImageUrl,
    ),
    bio: toString(pd?.biography ?? pd?.bio ?? owner?.bio ?? metaData?.biography ?? actorBio),
    category: toString(pd?.category_enum ?? pd?.category ?? metaData?.businessCategoryName ?? actorCategory),
    verified: toBoolean(pd?.is_verified ?? pd?.verified ?? metaData?.verified ?? actorVerified),
    followers,
    following,
    totalPosts,
    rawData: { profileData: pd, owner, metaData, firstItem },
  };
}

/**
 * Normalize Instagram content items from raw Actor output.
 */
export function normalizeInstagramContent(
  items: Record<string, unknown>[],
): NormalizedSocialContent[] {
  return items
    .filter((item) => item.id != null || item.shortcode != null)
    .map((item) => {
      const shortcode = toString(item.shortcode);
      const code = shortcode || String(item.id);
      const captionText = toString(getNested(item, "caption.text")) ?? toString(item.caption) ?? toString(item.description) ?? "";
      const likes = toNumber(item.likesCount) ?? toNumber(getNested(item, "edge_liked_by.count")) ?? toNumber(item.likes);
      const comments = toNumber(item.commentsCount) ?? toNumber(getNested(item, "edge_media_to_comment.count")) ?? toNumber(item.comments);
      const views = toNumber(item.videoViewCount) ?? toNumber(item.viewCount) ?? toNumber(item.video_views);
      const plays = toNumber(item.playCount) ?? toNumber(item.plays);
      const shares = toNumber(item.shareCount) ?? toNumber(item.shares);
      const saves = toNumber(item.savedCount) ?? toNumber(item.saves);

      const mt = toString(item.mediaType ?? item.media_type ?? item.__typename) ?? "";
      const contentType = mt.includes("VIDEO") || mt.includes("Reel") || mt.includes("video")
        ? "reel"
        : mt.includes("CAROUSEL") || mt.includes("carousel")
          ? "carousel"
          : mt.includes("IMAGE") || mt.includes("image")
            ? "image"
            : "post";

      const hashtags = toStringArray(item.hashtags).length > 0
        ? toStringArray(item.hashtags)
        : extractHashtags(captionText);
      const mentions = toStringArray(item.mentions).length > 0
        ? toStringArray(item.mentions)
        : extractMentions(captionText);
      const taggedAccounts = toStringArray(item.taggedUsers ?? item.tagged_accounts);
      const collaborators = toStringArray(item.collaborators);

      const engagements = sumEngagements({ likes, comments, shares, saves });
      const owner = item.owner as Record<string, unknown> | undefined;
      const followerCount = toNumber(owner?.followersCount);
      const images = item.displayUrls ?? item.images ?? item.mediaUrls;
      const firstImage = Array.isArray(images)
        ? toString(images[0])
        : toString(item.displayUrl ?? item.display_url ?? item.thumbnailUrl ?? item.thumbnail);

      return {
        platform: "instagram",
        externalContentId: String(item.id ?? shortcode),
        externalAccountId: toString(owner?.id ?? item.ownerId),
        contentType: contentType as NormalizedSocialContent["contentType"],
        title: captionText ? captionText.split("\n")[0].slice(0, 120) : undefined,
        caption: captionText,
        description: captionText,
        permalink: `https://www.instagram.com/p/${code}/`,
        thumbnailUrl: firstImage,
        mediaUrls: Array.isArray(images) ? images.filter(Boolean).map(String) : firstImage ? [firstImage] : [],
        hashtags,
        mentions,
        taggedAccounts,
        collaborators,
        publishedAt: toDate(item.timestamp ?? item.taken_at_timestamp ?? item.createdAt),
        durationSeconds: toNumber(item.videoDuration ?? item.duration ?? item.video_duration),
        views: views ?? plays,
        likes,
        comments,
        shares,
        saves,
        engagements,
        engagementRate: calcEngagementRate(engagements, followerCount),
        rawData: item as Record<string, unknown>,
      };
    });
}

/**
 * Normalize Instagram comments if available.
 */
export function normalizeInstagramComments(
  items: Record<string, unknown>[],
): NormalizedSocialComment[] {
  const comments: NormalizedSocialComment[] = [];

  for (const item of items) {
    const commentData = item.comments as Record<string, unknown> | undefined;
    const edges = (getNested(commentData ?? {}, "data") ?? item.edge_media_to_comment) as
      | Record<string, unknown>[]
      | { edges?: Record<string, unknown>[] }
      | undefined;
    const edgeList = Array.isArray(edges) ? edges : edges?.edges ?? [];

    for (const edge of edgeList) {
      const node = (edge.node ?? edge) as Record<string, unknown>;
      const nodeOwner = node.owner as Record<string, unknown> | undefined;

      comments.push({
        externalCommentId: String(node.id ?? Math.random()),
        parentCommentId: undefined,
        authorName: toString((nodeOwner ?? {}).full_name ?? (nodeOwner ?? {}).username),
        authorUsername: toString((nodeOwner ?? {}).username),
        authorAvatarUrl: toString((nodeOwner ?? {}).profile_pic_url),
        commentText: toString(node.text ?? node.comment) ?? "",
        likes: toNumber(getNested(node, "edge_liked_by.count")) ?? toNumber(node.likes),
        repliesCount: toNumber(getNested(node, "edge_threaded_comments.count")) ?? toNumber(node.replies) ?? 0,
        publishedAt: toDate(node.created_at ?? node.timestamp ?? node.createdAt),
        rawData: node as Record<string, unknown>,
      });
    }
  }

  return comments;
}
