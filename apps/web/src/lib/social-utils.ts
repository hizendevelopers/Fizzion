import type { SocialProviderKey } from "./social-schemas";

export type DateRangePreset = "today" | "last7" | "last30" | "last90" | "custom";

export function normalizeSocialAccountInput(provider: SocialProviderKey, input: string) {
  const trimmed = input.trim();
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;

  if (provider === "youtube" && withoutAt.startsWith("channel/")) {
    return {
      normalizedUrl: `https://youtube.com/${withoutAt}`,
      normalizedHandle: withoutAt.replace(/^channel\//, ""),
    };
  }

  const looksLikeUrl =
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.includes(".") ||
    trimmed.includes("/");

  try {
    if (!looksLikeUrl) {
      throw new Error("Treat as handle");
    }

    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const path = url.pathname.replace(/^\/+|\/+$/g, "");
    const firstSegment = path.split("/")[0] || withoutAt;
    return {
      normalizedUrl: url.toString(),
      normalizedHandle: firstSegment.replace(/^@/, ""),
    };
  } catch {
    const base =
      provider === "facebook"
        ? "https://facebook.com/"
        : provider === "instagram"
          ? "https://instagram.com/"
          : provider === "tiktok"
            ? "https://tiktok.com/@"
            : "https://youtube.com/@";

    return {
      normalizedUrl: `${base}${provider === "tiktok" ? withoutAt.replace(/^@/, "") : withoutAt}`,
      normalizedHandle: withoutAt,
    };
  }
}

export function calculateNormalizedEngagements(metrics: {
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
}) {
  return (metrics.likes ?? 0) + (metrics.comments ?? 0) + (metrics.shares ?? 0) + (metrics.saves ?? 0);
}

export function calculateEngagementRateByFollowers(input: {
  engagements?: number | null;
  followers?: number | null;
}) {
  if (!input.followers || input.followers <= 0) {
    return null;
  }

  return (100 * (input.engagements ?? 0)) / input.followers;
}

export function calculateEngagementRateByReach(input: {
  engagements?: number | null;
  reach?: number | null;
}) {
  if (!input.reach || input.reach <= 0) {
    return null;
  }

  return (100 * (input.engagements ?? 0)) / input.reach;
}

export function calculateEngagementRateByLikesAndViews(input: {
  likes?: number | null;
  views?: number | null;
}) {
  if (!input.views || input.views <= 0) {
    return null;
  }

  return (100 * (input.likes ?? 0)) / input.views;
}

export function calculateFollowerGrowthRate(input: {
  followersStart?: number | null;
  followersEnd?: number | null;
}) {
  if (!input.followersStart || input.followersStart <= 0 || input.followersEnd == null) {
    return null;
  }

  return ((input.followersEnd - input.followersStart) / input.followersStart) * 100;
}

export function previousRangeLabel(dateRange: DateRangePreset) {
  switch (dateRange) {
    case "today":
      return "vs yesterday";
    case "last7":
      return "vs previous 7 days";
    case "last30":
      return "vs previous 30 days";
    case "last90":
      return "vs previous 90 days";
    default:
      return "vs previous period";
  }
}

export function formatNumber(value?: number | null) {
  if (value == null) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

export function classifySentiment(text: string) {
  const normalized = text.toLowerCase();
  if (/(love|great|amazing|refreshing|best|good)/.test(normalized)) {
    return "positive" as const;
  }
  if (/(bad|hate|poor|worst|awful)/.test(normalized)) {
    return "negative" as const;
  }
  return "neutral" as const;
}
