import type { SocialProviderKey } from "./social-schemas";

type FixtureComment = {
  externalCommentId: string;
  authorName: string;
  authorAvatarUrl: string;
  commentText: string;
  commentLikes: number;
  repliesCount: number;
  sentiment: "positive" | "neutral" | "negative";
  publishedAt: string;
};

type FixtureContent = {
  externalContentId: string;
  contentType: string;
  title: string;
  caption: string;
  description: string;
  thumbnailUrl: string;
  mediaUrl: string;
  permalink: string;
  publishedAt: string;
  durationSeconds: number | null;
  hashtags: string[];
  mentions: string[];
  taggedAccounts: string[];
  collaborators: string[];
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  reach: number;
  impressions: number;
  engagements: number;
  engagementRate: number;
  watchTimeSeconds: number | null;
  averageWatchTimeSeconds: number | null;
  completionRate: number | null;
  commentsFeed: FixtureComment[];
};

type ProviderFixture = {
  externalAccountId: string;
  accountName: string;
  username: string;
  accountType: string;
  verified: boolean;
  publicProfileUrl: string;
  profileImageUrl: string;
  description: string;
  followers: number;
  following: number;
  reach: number;
  impressions: number;
  views: number;
  engagements: number;
  engagementRate: number;
  followerGrowth: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  watchTimeSeconds: number | null;
  content: FixtureContent[];
};

const BASE_DATE = "2026-07-20T00:00:00.000Z";

export const socialProviderFixtures: Record<SocialProviderKey, ProviderFixture> = {
  facebook: {
    externalAccountId: "fb-page-cc-iraq",
    accountName: "Coca-Cola Iraq",
    username: "cocacolairaq",
    accountType: "facebook_page",
    verified: true,
    publicProfileUrl: "https://facebook.com/cocacolairaq",
    profileImageUrl: "https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=200&q=80",
    description: "Official Coca-Cola Iraq page for campaigns, fan engagement, and video content.",
    followers: 248000,
    following: 18,
    reach: 154000,
    impressions: 287500,
    views: 198200,
    engagements: 28940,
    engagementRate: 11.67,
    followerGrowth: 3.8,
    totalLikes: 18240,
    totalComments: 4380,
    totalShares: 4120,
    totalSaves: 2200,
    watchTimeSeconds: 452200,
    content: [
      {
        externalContentId: "fb-post-1",
        contentType: "video",
        title: "Summer Spark Launch",
        caption: "Turn the heat into sparkle with Coca-Cola Summer Spark.",
        description: "Launch video with product moments and lifestyle scenes.",
        thumbnailUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80",
        mediaUrl: "https://example.com/fb-post-1.mp4",
        permalink: "https://facebook.com/cocacolairaq/posts/1",
        publishedAt: BASE_DATE,
        durationSeconds: 32,
        hashtags: ["#CocaCola", "#SummerSpark", "#Iraq"],
        mentions: ["@cocacolairaq"],
        taggedAccounts: ["Coca-Cola Middle East"],
        collaborators: ["Hizen Creative Studio"],
        likes: 7400,
        comments: 820,
        shares: 920,
        saves: 410,
        views: 64200,
        reach: 50200,
        impressions: 73100,
        engagements: 9550,
        engagementRate: 12.6,
        watchTimeSeconds: 132400,
        averageWatchTimeSeconds: 21.6,
        completionRate: 62.4,
        commentsFeed: [
          {
            externalCommentId: "fb-comment-1",
            authorName: "Rania A.",
            authorAvatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
            commentText: "Love this campaign, very refreshing.",
            commentLikes: 42,
            repliesCount: 3,
            sentiment: "positive",
            publishedAt: BASE_DATE,
          },
          {
            externalCommentId: "fb-comment-2",
            authorName: "Mustafa H.",
            authorAvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
            commentText: "Can we get the same promo in Basra too?",
            commentLikes: 12,
            repliesCount: 1,
            sentiment: "neutral",
            publishedAt: "2026-07-20T02:00:00.000Z",
          },
        ],
      },
      {
        externalContentId: "fb-post-2",
        contentType: "image",
        title: "Match Day Visual",
        caption: "Game time moments are better with Coca-Cola.",
        description: "Single-image promotional post.",
        thumbnailUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
        mediaUrl: "https://example.com/fb-post-2.jpg",
        permalink: "https://facebook.com/cocacolairaq/posts/2",
        publishedAt: "2026-07-18T12:00:00.000Z",
        durationSeconds: null,
        hashtags: ["#MatchDay", "#CocaCola"],
        mentions: [],
        taggedAccounts: [],
        collaborators: [],
        likes: 4200,
        comments: 540,
        shares: 390,
        saves: 280,
        views: 0,
        reach: 31200,
        impressions: 54400,
        engagements: 5410,
        engagementRate: 9.9,
        watchTimeSeconds: null,
        averageWatchTimeSeconds: null,
        completionRate: null,
        commentsFeed: [],
      },
    ],
  },
  instagram: {
    externalAccountId: "ig-professional-cc-iraq",
    accountName: "Coca-Cola Iraq",
    username: "cocacolairaq",
    accountType: "instagram_professional",
    verified: true,
    publicProfileUrl: "https://instagram.com/cocacolairaq",
    profileImageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80",
    description: "Stories, reels, and campaign moments from Coca-Cola Iraq.",
    followers: 191400,
    following: 162,
    reach: 182900,
    impressions: 344200,
    views: 276800,
    engagements: 35200,
    engagementRate: 18.39,
    followerGrowth: 4.4,
    totalLikes: 24420,
    totalComments: 4810,
    totalShares: 3320,
    totalSaves: 2650,
    watchTimeSeconds: 582000,
    content: [
      {
        externalContentId: "ig-reel-1",
        contentType: "reel",
        title: "Reel - Summer Spark",
        caption: "Turn up the fizz. #SummerSpark #CocaCola",
        description: "Short-form reel with product splash transitions.",
        thumbnailUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
        mediaUrl: "https://example.com/ig-reel-1.mp4",
        permalink: "https://instagram.com/p/IGREEL1",
        publishedAt: BASE_DATE,
        durationSeconds: 18,
        hashtags: ["#SummerSpark", "#CocaCola"],
        mentions: ["@cocacolairaq"],
        taggedAccounts: ["Coca-Cola Middle East"],
        collaborators: ["Hizen Social Lab"],
        likes: 9800,
        comments: 1200,
        shares: 860,
        saves: 1120,
        views: 88400,
        reach: 70100,
        impressions: 118000,
        engagements: 12980,
        engagementRate: 18.51,
        watchTimeSeconds: 201200,
        averageWatchTimeSeconds: 12.3,
        completionRate: 68.1,
        commentsFeed: [
          {
            externalCommentId: "ig-comment-1",
            authorName: "Dana S.",
            authorAvatarUrl: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=120&q=80",
            commentText: "This reel is so good.",
            commentLikes: 33,
            repliesCount: 2,
            sentiment: "positive",
            publishedAt: BASE_DATE,
          },
        ],
      },
    ],
  },
  tiktok: {
    externalAccountId: "tt-cc-iraq",
    accountName: "Coca-Cola Iraq",
    username: "cocacolairaq",
    accountType: "tiktok_account",
    verified: true,
    publicProfileUrl: "https://tiktok.com/@cocacolairaq",
    profileImageUrl: "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=200&q=80",
    description: "Short-form video challenges and trending campaign content.",
    followers: 133000,
    following: 11,
    reach: 201100,
    impressions: 266900,
    views: 312500,
    engagements: 24800,
    engagementRate: 18.65,
    followerGrowth: 6.1,
    totalLikes: 19010,
    totalComments: 2130,
    totalShares: 2780,
    totalSaves: 880,
    watchTimeSeconds: 690100,
    content: [
      {
        externalContentId: "tt-video-1",
        contentType: "short_video",
        title: "Fizz Dance Challenge",
        caption: "New challenge unlocked. #FizzDance #CocaColaIraq",
        description: "TikTok trend adaptation for Iraq market.",
        thumbnailUrl: "https://images.unsplash.com/photo-1519999482648-25049ddd37b1?auto=format&fit=crop&w=600&q=80",
        mediaUrl: "https://example.com/tt-video-1.mp4",
        permalink: "https://tiktok.com/@cocacolairaq/video/1",
        publishedAt: "2026-07-19T09:00:00.000Z",
        durationSeconds: 16,
        hashtags: ["#FizzDance", "#CocaColaIraq"],
        mentions: [],
        taggedAccounts: [],
        collaborators: [],
        likes: 6500,
        comments: 410,
        shares: 930,
        saves: 220,
        views: 106000,
        reach: 84200,
        impressions: 94200,
        engagements: 8060,
        engagementRate: 9.6,
        watchTimeSeconds: 260500,
        averageWatchTimeSeconds: 10.6,
        completionRate: 71.2,
        commentsFeed: [],
      },
    ],
  },
  youtube: {
    externalAccountId: "yt-cc-iraq",
    accountName: "Coca-Cola Iraq",
    username: "CocaColaIraqOfficial",
    accountType: "youtube_channel",
    verified: true,
    publicProfileUrl: "https://youtube.com/@CocaColaIraqOfficial",
    profileImageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    description: "Official Coca-Cola Iraq channel for long-form campaigns and shorts.",
    followers: 65400,
    following: 0,
    reach: 120000,
    impressions: 215000,
    views: 178400,
    engagements: 8400,
    engagementRate: 12.84,
    followerGrowth: 2.4,
    totalLikes: 5900,
    totalComments: 740,
    totalShares: 610,
    totalSaves: 0,
    watchTimeSeconds: 1050200,
    content: [
      {
        externalContentId: "yt-video-1",
        contentType: "long_video",
        title: "Coca-Cola Summer Spark Official Film",
        caption: "Watch the full campaign film for Summer Spark.",
        description: "Long-form campaign story with audience-retention pattern.",
        thumbnailUrl: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?auto=format&fit=crop&w=600&q=80",
        mediaUrl: "https://example.com/yt-video-1.mp4",
        permalink: "https://youtube.com/watch?v=1",
        publishedAt: "2026-07-17T08:30:00.000Z",
        durationSeconds: 74,
        hashtags: ["#CocaCola", "#SummerSpark"],
        mentions: [],
        taggedAccounts: [],
        collaborators: ["Hizen Motion"],
        likes: 2800,
        comments: 220,
        shares: 180,
        saves: 0,
        views: 54200,
        reach: 48100,
        impressions: 81200,
        engagements: 3200,
        engagementRate: 6.65,
        watchTimeSeconds: 456000,
        averageWatchTimeSeconds: 38.4,
        completionRate: 42.2,
        commentsFeed: [],
      },
    ],
  },
};

export function getSocialFixture(provider: SocialProviderKey) {
  return socialProviderFixtures[provider];
}
