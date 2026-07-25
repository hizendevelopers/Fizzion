import { z } from "zod";

import { getOptionalSupabaseAdminClient } from "@/lib/supabase/server";

const ORGANIZATION_SLUG = "coca_cola_iraq";
const OVERVIEW_PLATFORM_SLUGS = ["meta", "tiktok", "youtube", "google-ads", "web-advertising", "ooh"] as const;
const overviewPresetSchema = z.enum(["last7", "last30", "last90", "last2Years", "thisMonth", "previousMonth", "custom"]);
const overviewSortSchema = z.enum(["spend", "name", "brand", "startDate"]);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export type OverviewPreset = z.infer<typeof overviewPresetSchema>;
export type OverviewSort = z.infer<typeof overviewSortSchema>;

type OverviewFilterInput = {
  preset?: OverviewPreset;
  startDate?: string;
  endDate?: string;
  brandIds?: string[];
  campaignIds?: string[];
  platformIds?: string[];
  sortCampaigns?: OverviewSort;
  campaignSearch?: string;
  page?: number;
  pageSize?: number;
};

type OverviewBrand = {
  id: string;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  color: string;
  competitorGroup: string | null;
  isActive: boolean;
};

type OverviewPlatform = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string;
  isActive: boolean;
};

type OverviewCampaign = {
  id: string;
  brandId: string | null;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
};

type OverviewCampaignPlatform = {
  campaignId: string;
  platformId: string;
};

type OverviewSpendRecord = {
  brandId: string;
  campaignId: string;
  platformId: string;
  spendDate: string;
  amount: number;
  currency: string;
};

type TimeSeriesPoint = {
  key: string;
  label: string;
  total: number;
  brands: Array<{ brandId: string; value: number }>;
};

type CountTrendPoint = {
  key: string;
  label: string;
  value: number;
};

export type OverviewFilters = {
  preset: OverviewPreset;
  startDate: string;
  endDate: string;
  brandIds: string[];
  campaignIds: string[];
  platformIds: string[];
  sortCampaigns: OverviewSort;
  campaignSearch: string;
  page: number;
  pageSize: number;
  activeFilterCount: number;
};

type NormalizedOverviewFilters = OverviewFilters & {
  start: Date;
  end: Date;
};

export type OverviewResponse = {
  filters: OverviewFilters;
  summary: {
    title: string;
    description: string;
    currency: string;
    rangeLabel: string;
    activeFilterCount: number;
  };
  filterOptions: {
    brands: Array<{ id: string; name: string; color: string; logoUrl: string | null }>;
    campaigns: Array<{ id: string; name: string; brandId: string | null; brandName: string; status: string; platformIds: string[] }>;
    platforms: Array<{ id: string; name: string; slug: string; color: string; icon: string | null }>;
    presets: Array<{ id: OverviewPreset; label: string }>;
  };
  kpis: {
    activeBrands: {
      value: number;
      previousValue: number;
      changePercent: number | null;
      description: string;
      trend: CountTrendPoint[];
    };
    activeCampaigns: {
      value: number;
      previousValue: number;
      changePercent: number | null;
      description: string;
      trend: CountTrendPoint[];
    };
    totalSpending: {
      value: number;
      previousValue: number;
      changePercent: number | null;
      currency: string;
      description: string;
      trend: Array<{ key: string; label: string; value: number }>;
    };
  };
  spending: {
    timeSeries: TimeSeriesPoint[];
    totalsByBrand: Array<{
      brandId: string;
      brandName: string;
      color: string;
      totalSpend: number;
      percentage: number;
      previousTotalSpend: number;
      previousChangePercent: number | null;
    }>;
    total: number;
    currency: string;
  };
  shareOfVoice: Array<{
    brandId: string;
    brandName: string;
    color: string;
    spend: number;
    percentage: number;
    activeCampaignCount: number;
  }>;
  platformSplit: Array<{
    platformId: string;
    platformName: string;
    platformSlug: string;
    color: string;
    icon: string | null;
    spend: number;
    percentage: number;
  }>;
  activeCampaigns: {
    items: Array<{
      id: string;
      name: string;
      brandId: string | null;
      brandName: string;
      brandColor: string;
      status: string;
      startDate: string | null;
      endDate: string | null;
      platforms: Array<{ id: string; name: string; color: string; icon: string | null }>;
      totalSpend: number;
    }>;
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
  activeBrands: Array<{
    brandId: string;
    brandName: string;
    brandColor: string;
    logoUrl: string | null;
    activeCampaignCount: number;
    totalSpend: number;
    platformCount: number;
    status: "Active";
  }>;
  states: {
    isEmpty: boolean;
    emptyReason: string | null;
  };
};

type AnalyticsComputationInput = {
  filters: NormalizedOverviewFilters;
  brands: OverviewBrand[];
  platforms: OverviewPlatform[];
  campaigns: OverviewCampaign[];
  campaignPlatforms: OverviewCampaignPlatform[];
  currentSpendRecords: OverviewSpendRecord[];
  previousSpendRecords: OverviewSpendRecord[];
};

const BRAND_COLOR_FALLBACKS: Record<string, string> = {
  "coca-cola": "#F40009",
  pepsi: "#005CB4",
  "7up": "#16A34A",
  "mountain-dew": "#78BE20",
  "rc-cola": "#7A1F2B",
  mirinda: "#F58220",
};

export function getBrandColor(brand: Pick<OverviewBrand, "slug" | "name" | "color">) {
  if (brand.color && brand.color.trim().length > 0) {
    return brand.color;
  }

  const slug = brand.slug ?? brand.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return BRAND_COLOR_FALLBACKS[slug] ?? "#F40009";
}

function getPlatformColor(platform: Pick<OverviewPlatform, "color" | "slug">) {
  if (platform.color && platform.color.trim().length > 0) {
    return platform.color;
  }

  const fallbackMap: Record<string, string> = {
    meta: "#1877F2",
    tiktok: "#111111",
    youtube: "#FF0000",
    "google-ads": "#4285F4",
    "web-advertising": "#7C3AED",
    ooh: "#FF8A00",
  };

  return fallbackMap[platform.slug] ?? "#64748B";
}

function parseIdArray(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => item.split(",")).map((item) => item.trim()).filter(Boolean);
  }

  if (!value) {
    return [];
  }

  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function toInteger(value: string | string[] | undefined, fallback: number) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function formatIsoDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function addDays(date: Date, value: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + value);
  return next;
}

function daysBetweenInclusive(start: Date, end: Date) {
  return Math.max(1, Math.floor((endOfDay(end).getTime() - startOfDay(start).getTime()) / 86_400_000) + 1);
}

function buildDateRange(preset: OverviewPreset, customStart?: string, customEnd?: string) {
  const today = startOfDay(new Date());

  if (preset === "custom") {
    const start = customStart ? startOfDay(new Date(`${customStart}T00:00:00`)) : addDays(today, -29);
    const end = customEnd ? endOfDay(new Date(`${customEnd}T00:00:00`)) : endOfDay(today);
    return { start, end };
  }

  if (preset === "last7") {
    return { start: addDays(today, -6), end: endOfDay(today) };
  }

  if (preset === "last90") {
    return { start: addDays(today, -89), end: endOfDay(today) };
  }

  if (preset === "last2Years") {
    return { start: addDays(today, -729), end: endOfDay(today) };
  }

  if (preset === "thisMonth") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start, end: endOfDay(today) };
  }

  if (preset === "previousMonth") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    return { start, end };
  }

  return { start: addDays(today, -29), end: endOfDay(today) };
}

function safePercentChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return ((current - previous) / previous) * 100;
}

function overlapsRange(
  campaign: Pick<OverviewCampaign, "startDate" | "endDate">,
  startDate: Date,
  endDate: Date,
) {
  const startsAt = campaign.startDate ? new Date(`${campaign.startDate}T00:00:00`) : null;
  const endsAt = campaign.endDate ? endOfDay(new Date(`${campaign.endDate}T00:00:00`)) : null;

  if (startsAt && startsAt.getTime() > endDate.getTime()) {
    return false;
  }

  if (endsAt && endsAt.getTime() < startDate.getTime()) {
    return false;
  }

  return true;
}

function isCampaignActiveOnDate(campaign: Pick<OverviewCampaign, "status" | "startDate" | "endDate">, date: Date) {
  if (campaign.status.toLowerCase() !== "active") {
    return false;
  }

  const startsAt = campaign.startDate ? new Date(`${campaign.startDate}T00:00:00`) : null;
  const endsAt = campaign.endDate ? endOfDay(new Date(`${campaign.endDate}T00:00:00`)) : null;

  if (startsAt && startsAt.getTime() > date.getTime()) {
    return false;
  }

  if (endsAt && endsAt.getTime() < date.getTime()) {
    return false;
  }

  return true;
}

function formatRangeLabel(startDate: Date, endDate: Date) {
  return `${formatIsoDate(startDate)} to ${formatIsoDate(endDate)}`;
}

export function normalizeOverviewFilters(input?: OverviewFilterInput) {
  const schema = z
    .object({
      preset: overviewPresetSchema.default("last30"),
      startDate: isoDateSchema.optional(),
      endDate: isoDateSchema.optional(),
      brandIds: z.array(z.string().uuid()).default([]),
      campaignIds: z.array(z.string().uuid()).default([]),
      platformIds: z.array(z.string().uuid()).default([]),
      sortCampaigns: overviewSortSchema.default("spend"),
      campaignSearch: z.string().trim().max(120).optional().default(""),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(50).default(8),
    })
    .superRefine((value, ctx) => {
      if (value.preset === "custom") {
        if (!value.startDate || !value.endDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["startDate"],
            message: "Custom ranges require both start and end dates.",
          });
        }
      }

      if (value.startDate && value.endDate && value.endDate < value.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endDate"],
          message: "End date cannot be before start date.",
        });
      }
    });

  const parsed = schema.parse({
    preset: input?.preset,
    startDate: input?.startDate,
    endDate: input?.endDate,
    brandIds: input?.brandIds ?? [],
    campaignIds: input?.campaignIds ?? [],
    platformIds: input?.platformIds ?? [],
    sortCampaigns: input?.sortCampaigns,
    campaignSearch: input?.campaignSearch,
    page: input?.page,
    pageSize: input?.pageSize,
  });
  const { start, end } = buildDateRange(parsed.preset, parsed.startDate, parsed.endDate);
  const activeFilterCount =
    (parsed.brandIds.length > 0 ? 1 : 0) +
    (parsed.campaignIds.length > 0 ? 1 : 0) +
    (parsed.platformIds.length > 0 ? 1 : 0) +
    (parsed.preset !== "last30" || parsed.startDate || parsed.endDate ? 1 : 0);

  return {
    ...parsed,
    startDate: formatIsoDate(start),
    endDate: formatIsoDate(end),
    start,
    end,
    activeFilterCount,
  } satisfies NormalizedOverviewFilters;
}

export function parseOverviewFiltersFromSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
) {
  const getValue = (key: string) => {
    if (params instanceof URLSearchParams) {
      return params.get(key) ?? undefined;
    }

    return params[key];
  };

  return normalizeOverviewFilters({
    preset: (Array.isArray(getValue("preset")) ? getValue("preset")?.[0] : getValue("preset")) as OverviewPreset | undefined,
    startDate: Array.isArray(getValue("startDate")) ? getValue("startDate")?.[0] : (getValue("startDate") as string | undefined),
    endDate: Array.isArray(getValue("endDate")) ? getValue("endDate")?.[0] : (getValue("endDate") as string | undefined),
    brandIds: parseIdArray(getValue("brands")),
    campaignIds: parseIdArray(getValue("campaigns")),
    platformIds: parseIdArray(getValue("platforms")),
    sortCampaigns: (Array.isArray(getValue("sort")) ? getValue("sort")?.[0] : getValue("sort")) as OverviewSort | undefined,
    campaignSearch: Array.isArray(getValue("campaignSearch")) ? getValue("campaignSearch")?.[0] : (getValue("campaignSearch") as string | undefined),
    page: toInteger(getValue("page"), 1),
    pageSize: toInteger(getValue("pageSize"), 8),
  });
}

function buildBuckets(startDate: Date, endDate: Date) {
  const totalDays = daysBetweenInclusive(startDate, endDate);
  const strategy = totalDays <= 31 ? "day" : totalDays <= 120 ? "week" : "month";
  const buckets: Array<{ key: string; label: string; start: Date; end: Date }> = [];
  let cursor = startOfDay(startDate);

  while (cursor.getTime() <= endDate.getTime()) {
    if (strategy === "day") {
      buckets.push({
        key: formatIsoDate(cursor),
        label: cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        start: startOfDay(cursor),
        end: endOfDay(cursor),
      });
      cursor = addDays(cursor, 1);
      continue;
    }

    if (strategy === "week") {
      const bucketStart = startOfDay(cursor);
      const bucketEnd = endOfDay(addDays(bucketStart, 6));
      const clippedEnd = bucketEnd.getTime() > endDate.getTime() ? endOfDay(endDate) : bucketEnd;
      buckets.push({
        key: `${formatIsoDate(bucketStart)}-${formatIsoDate(clippedEnd)}`,
        label: `${bucketStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${clippedEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        start: bucketStart,
        end: clippedEnd,
      });
      cursor = addDays(bucketStart, 7);
      continue;
    }

    const bucketStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const bucketEnd = endOfDay(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
    const clippedEnd = bucketEnd.getTime() > endDate.getTime() ? endOfDay(endDate) : bucketEnd;
    buckets.push({
      key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
      label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      start: bucketStart,
      end: clippedEnd,
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return buckets;
}

function sumAmounts(records: OverviewSpendRecord[]) {
  return Number(records.reduce((sum, record) => sum + record.amount, 0).toFixed(2));
}

function buildSpendTimeSeries(
  records: OverviewSpendRecord[],
  brandsById: Map<string, OverviewBrand>,
  startDate: Date,
  endDate: Date,
) {
  const buckets = buildBuckets(startDate, endDate);

  return buckets.map((bucket) => {
    const recordsInBucket = records.filter((record) => {
      const spendDate = new Date(`${record.spendDate}T00:00:00`);
      return spendDate.getTime() >= bucket.start.getTime() && spendDate.getTime() <= bucket.end.getTime();
    });
    const byBrand = new Map<string, number>();

    for (const record of recordsInBucket) {
      byBrand.set(record.brandId, Number(((byBrand.get(record.brandId) ?? 0) + record.amount).toFixed(2)));
    }

    const brands = [...byBrand.entries()].map(([brandId, value]) => ({
      brandId,
      value,
      color: getBrandColor(brandsById.get(brandId) ?? { slug: brandId, name: brandId, color: "#F40009" }),
    }));

    return {
      key: bucket.key,
      label: bucket.label,
      total: sumAmounts(recordsInBucket),
      brands,
    };
  });
}

function buildCountTrend(
  campaigns: OverviewCampaign[],
  campaignPlatforms: Map<string, Set<string>>,
  filters: NormalizedOverviewFilters,
  mode: "campaigns" | "brands",
) {
  const buckets = buildBuckets(filters.start, filters.end);

  return buckets.map((bucket) => {
    const date = endOfDay(bucket.end);
    const activeCampaigns = campaigns.filter((campaign) => {
      if (!campaign.brandId) return false;
      if (!isCampaignActiveOnDate(campaign, date)) return false;
      if (filters.campaignIds.length > 0 && !filters.campaignIds.includes(campaign.id)) return false;
      if (filters.brandIds.length > 0 && !filters.brandIds.includes(campaign.brandId)) return false;
      if (filters.platformIds.length > 0) {
        const linkedPlatforms = campaignPlatforms.get(campaign.id) ?? new Set<string>();
        return filters.platformIds.some((platformId) => linkedPlatforms.has(platformId));
      }

      return true;
    });

    const value =
      mode === "campaigns"
        ? activeCampaigns.length
        : new Set(activeCampaigns.map((campaign) => campaign.brandId)).size;

    return {
      key: bucket.key,
      label: bucket.label,
      value,
    };
  });
}

function sortCampaignItems<T extends { name: string; brandName: string; startDate: string | null; totalSpend: number }>(
  items: T[],
  sort: OverviewSort,
) {
  const next = [...items];
  next.sort((left, right) => {
    if (sort === "name") return left.name.localeCompare(right.name);
    if (sort === "brand") return left.brandName.localeCompare(right.brandName);
    if (sort === "startDate") return (right.startDate ?? "").localeCompare(left.startDate ?? "");
    return right.totalSpend - left.totalSpend;
  });
  return next;
}

export function computeOverviewAnalytics(input: AnalyticsComputationInput): OverviewResponse {
  const { filters } = input;
  const currency = input.currentSpendRecords[0]?.currency ?? input.previousSpendRecords[0]?.currency ?? "USD";
  const brandsById = new Map(input.brands.map((brand) => [brand.id, { ...brand, color: getBrandColor(brand) }]));
  const platformsById = new Map(input.platforms.map((platform) => [platform.id, { ...platform, color: getPlatformColor(platform) }]));
  const campaignPlatformMap = new Map<string, Set<string>>();

  for (const entry of input.campaignPlatforms) {
    const existing = campaignPlatformMap.get(entry.campaignId) ?? new Set<string>();
    existing.add(entry.platformId);
    campaignPlatformMap.set(entry.campaignId, existing);
  }

  const campaignsMatchingFilters = input.campaigns.filter((campaign) => {
    if (!campaign.brandId) return false;
    if (filters.brandIds.length > 0 && !filters.brandIds.includes(campaign.brandId)) return false;
    if (filters.campaignIds.length > 0 && !filters.campaignIds.includes(campaign.id)) return false;
    if (!overlapsRange(campaign, filters.start, filters.end)) return false;
    if (filters.platformIds.length > 0) {
      const linkedPlatforms = campaignPlatformMap.get(campaign.id) ?? new Set<string>();
      if (!filters.platformIds.some((platformId) => linkedPlatforms.has(platformId))) return false;
    }
    return true;
  });

  const currentCampaignSpendIds = new Set(input.currentSpendRecords.map((record) => record.campaignId));
  const previousCampaignSpendIds = new Set(input.previousSpendRecords.map((record) => record.campaignId));
  const activeCampaigns = campaignsMatchingFilters.filter(
    (campaign) => campaign.status.toLowerCase() === "active" && currentCampaignSpendIds.has(campaign.id),
  );
  const activeBrandIds = new Set(activeCampaigns.map((campaign) => campaign.brandId).filter(Boolean) as string[]);
  const currentSpendByBrand = new Map<string, number>();
  const previousSpendByBrand = new Map<string, number>();
  const currentSpendByPlatform = new Map<string, number>();
  const currentSpendByCampaign = new Map<string, number>();

  for (const record of input.currentSpendRecords) {
    currentSpendByBrand.set(record.brandId, Number(((currentSpendByBrand.get(record.brandId) ?? 0) + record.amount).toFixed(2)));
    currentSpendByPlatform.set(record.platformId, Number(((currentSpendByPlatform.get(record.platformId) ?? 0) + record.amount).toFixed(2)));
    currentSpendByCampaign.set(record.campaignId, Number(((currentSpendByCampaign.get(record.campaignId) ?? 0) + record.amount).toFixed(2)));
  }

  for (const record of input.previousSpendRecords) {
    previousSpendByBrand.set(record.brandId, Number(((previousSpendByBrand.get(record.brandId) ?? 0) + record.amount).toFixed(2)));
  }

  const totalSpending = sumAmounts(input.currentSpendRecords);
  const previousTotalSpending = sumAmounts(input.previousSpendRecords);
  const spendingTimeSeries = buildSpendTimeSeries(input.currentSpendRecords, brandsById, filters.start, filters.end);
  const totalSpendTrend = spendingTimeSeries.map((point) => ({ key: point.key, label: point.label, value: point.total }));
  const activeCampaignTrend = buildCountTrend(activeCampaigns, campaignPlatformMap, filters, "campaigns");
  const activeBrandTrend = buildCountTrend(activeCampaigns, campaignPlatformMap, filters, "brands");
  const previousRangeLength = daysBetweenInclusive(filters.start, filters.end);
  const previousEnd = addDays(startOfDay(filters.start), -1);
  const previousStart = addDays(previousEnd, -(previousRangeLength - 1));

  const previousCampaigns = input.campaigns.filter((campaign) => {
    if (!campaign.brandId) return false;
    if (campaign.status.toLowerCase() !== "active") return false;
    if (!previousCampaignSpendIds.has(campaign.id)) return false;
    if (filters.brandIds.length > 0 && !filters.brandIds.includes(campaign.brandId)) return false;
    if (filters.campaignIds.length > 0 && !filters.campaignIds.includes(campaign.id)) return false;
    if (!overlapsRange(campaign, previousStart, previousEnd)) return false;
    if (filters.platformIds.length > 0) {
      const linkedPlatforms = campaignPlatformMap.get(campaign.id) ?? new Set<string>();
      return filters.platformIds.some((platformId) => linkedPlatforms.has(platformId));
    }
    return true;
  });

  const previousActiveBrandCount = new Set(previousCampaigns.map((campaign) => campaign.brandId).filter(Boolean) as string[]).size;
  const brandTotals = [...currentSpendByBrand.entries()]
    .map(([brandId, totalSpend]) => {
      const brand = brandsById.get(brandId);
      if (!brand) return null;
      const previousTotalSpend = previousSpendByBrand.get(brandId) ?? 0;
      return {
        brandId,
        brandName: brand.name,
        color: brand.color,
        totalSpend,
        percentage: totalSpending > 0 ? Number(((totalSpend / totalSpending) * 100).toFixed(2)) : 0,
        previousTotalSpend,
        previousChangePercent: safePercentChange(totalSpend, previousTotalSpend),
      };
    })
    .filter(Boolean)
    .sort((left, right) => (right?.totalSpend ?? 0) - (left?.totalSpend ?? 0)) as OverviewResponse["spending"]["totalsByBrand"];

  const shareOfVoice = brandTotals.map((brand) => {
    const brandActiveCampaigns = activeCampaigns.filter((c) => c.brandId === brand.brandId);
    return {
      brandId: brand.brandId,
      brandName: brand.brandName,
      color: brand.color,
      spend: brand.totalSpend,
      percentage: brand.percentage,
      activeCampaignCount: brandActiveCampaigns.length,
    };
  });

  const platformSplit = [...currentSpendByPlatform.entries()]
    .map(([platformId, spend]) => {
      const platform = platformsById.get(platformId);
      if (!platform || spend <= 0) return null;
      return {
        platformId,
        platformName: platform.name,
        platformSlug: platform.slug,
        color: platform.color,
        icon: platform.icon,
        spend,
        percentage: totalSpending > 0 ? Number(((spend / totalSpending) * 100).toFixed(2)) : 0,
      };
    })
    .filter(Boolean)
    .sort((left, right) => (right?.spend ?? 0) - (left?.spend ?? 0)) as OverviewResponse["platformSplit"];

  const campaignSearch = filters.campaignSearch.trim().toLowerCase();
  const campaignItems = activeCampaigns
    .map((campaign) => {
      const brand = campaign.brandId ? brandsById.get(campaign.brandId) : null;
      const linkedPlatforms = [...(campaignPlatformMap.get(campaign.id) ?? new Set<string>())]
        .map((platformId) => platformsById.get(platformId))
        .filter(Boolean)
        .map((platform) => ({
          id: platform!.id,
          name: platform!.name,
          color: platform!.color,
          icon: platform!.icon,
        }));

      return {
        id: campaign.id,
        name: campaign.name,
        brandId: campaign.brandId,
        brandName: brand?.name ?? "Unassigned",
        brandColor: brand?.color ?? "#64748B",
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        platforms: linkedPlatforms,
        totalSpend: currentSpendByCampaign.get(campaign.id) ?? 0,
      };
    })
    .filter((item) =>
      campaignSearch.length > 0
        ? item.name.toLowerCase().includes(campaignSearch) || item.brandName.toLowerCase().includes(campaignSearch)
        : true,
    );

  const sortedCampaigns = sortCampaignItems(campaignItems, filters.sortCampaigns);
  const paginatedCampaigns = sortedCampaigns.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize);

  const activeBrandList = [...activeBrandIds]
    .map((brandId) => {
      const brand = brandsById.get(brandId);
      if (!brand) return null;
      const brandCampaigns = activeCampaigns.filter((campaign) => campaign.brandId === brandId);
      const platformCount = new Set(
        brandCampaigns.flatMap((campaign) => [...(campaignPlatformMap.get(campaign.id) ?? new Set<string>())]),
      ).size;
      return {
        brandId,
        brandName: brand.name,
        brandColor: brand.color,
        logoUrl: brand.logoUrl,
        activeCampaignCount: brandCampaigns.length,
        totalSpend: currentSpendByBrand.get(brandId) ?? 0,
        platformCount,
        status: "Active" as const,
      };
    })
    .filter(Boolean)
    .sort((left, right) => (right?.totalSpend ?? 0) - (left?.totalSpend ?? 0)) as OverviewResponse["activeBrands"];

  const campaignsForFilterOptions = campaignsMatchingFilters.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    brandId: campaign.brandId,
    brandName: campaign.brandId ? brandsById.get(campaign.brandId)?.name ?? "Unassigned" : "Unassigned",
    status: campaign.status,
    platformIds: [...(campaignPlatformMap.get(campaign.id) ?? new Set<string>())],
  }));

  return {
    filters: {
      preset: filters.preset,
      startDate: filters.startDate,
      endDate: filters.endDate,
      brandIds: filters.brandIds,
      campaignIds: filters.campaignIds,
      platformIds: filters.platformIds,
      sortCampaigns: filters.sortCampaigns,
      campaignSearch: filters.campaignSearch,
      page: filters.page,
      pageSize: filters.pageSize,
      activeFilterCount: filters.activeFilterCount,
    },
    summary: {
      title: "Overview",
      description: "Real-time Coca-Cola Iraq media monitoring across brands, campaigns, and platforms.",
      currency,
      rangeLabel: formatRangeLabel(filters.start, filters.end),
      activeFilterCount: filters.activeFilterCount,
    },
    filterOptions: {
      brands: input.brands
        .filter((brand) => brand.isActive)
        .map((brand) => ({
          id: brand.id,
          name: brand.name,
          color: brandsById.get(brand.id)?.color ?? "#F40009",
          logoUrl: brand.logoUrl,
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
      campaigns: campaignsForFilterOptions.sort((left, right) => left.name.localeCompare(right.name)),
      platforms: input.platforms
        .filter((platform) => platform.isActive)
        .map((platform) => ({
          id: platform.id,
          name: platform.name,
          slug: platform.slug,
          color: platformsById.get(platform.id)?.color ?? "#64748B",
          icon: platform.icon,
        })),
      presets: [
        { id: "last7", label: "Last 7 Days" },
        { id: "last30", label: "Last 30 Days" },
        { id: "last90", label: "Last 90 Days" },
        { id: "last2Years", label: "Last 2 Years" },
        { id: "thisMonth", label: "This Month" },
        { id: "previousMonth", label: "Previous Month" },
        { id: "custom", label: "Custom Range" },
      ],
    },
    kpis: {
      activeBrands: {
        value: activeBrandIds.size,
        previousValue: previousActiveBrandCount,
        changePercent: safePercentChange(activeBrandIds.size, previousActiveBrandCount),
        description: "Unique active brands with at least one active campaign and in-range spend in scope.",
        trend: activeBrandTrend,
      },
      activeCampaigns: {
        value: activeCampaigns.length,
        previousValue: previousCampaigns.length,
        changePercent: safePercentChange(activeCampaigns.length, previousCampaigns.length),
        description: "Unique active campaigns with in-range spend, deduplicated across all selected platforms.",
        trend: activeCampaignTrend,
      },
      totalSpending: {
        value: totalSpending,
        previousValue: previousTotalSpending,
        changePercent: safePercentChange(totalSpending, previousTotalSpending),
        currency,
        description: "Total filtered media and advertising spend from spend records only.",
        trend: totalSpendTrend,
      },
    },
    spending: {
      timeSeries: spendingTimeSeries,
      totalsByBrand: brandTotals,
      total: totalSpending,
      currency,
    },
    shareOfVoice,
    platformSplit,
    activeCampaigns: {
      items: paginatedCampaigns,
      total: sortedCampaigns.length,
      page: filters.page,
      pageSize: filters.pageSize,
      hasMore: filters.page * filters.pageSize < sortedCampaigns.length,
    },
    activeBrands: activeBrandList,
    states: {
      isEmpty: totalSpending === 0 && activeCampaigns.length === 0 && activeBrandIds.size === 0,
      emptyReason:
        totalSpending === 0 && activeCampaigns.length === 0 && activeBrandIds.size === 0
          ? "No matching spend or active campaign activity was found for the selected filters."
          : null,
    },
  };
}

async function resolveOrganizationId() {
  const client = getOptionalSupabaseAdminClient();
  if (!client) {
    throw new Error("Supabase admin client is not configured.");
  }

  const organizationResponse = await client
    .from("organizations")
    .select("id, slug")
    .eq("slug", ORGANIZATION_SLUG)
    .maybeSingle();

  if (organizationResponse.error) {
    throw organizationResponse.error;
  }

  if (organizationResponse.data?.id) {
    return organizationResponse.data.id as string;
  }

  const fallbackResponse = await client
    .from("organizations")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallbackResponse.error) {
    throw fallbackResponse.error;
  }

  if (!fallbackResponse.data?.id) {
    throw new Error("No organization was available for overview analytics.");
  }

  return fallbackResponse.data.id as string;
}

export async function getOverviewAnalytics(rawFilters?: OverviewFilterInput) {
  const client = getOptionalSupabaseAdminClient();
  if (!client) {
    throw new Error("Supabase admin client is not configured.");
  }

  const filters = normalizeOverviewFilters(rawFilters);
  const organizationId = await resolveOrganizationId();
  const previousRangeLength = daysBetweenInclusive(filters.start, filters.end);
  const previousEnd = addDays(startOfDay(filters.start), -1);
  const previousStart = addDays(previousEnd, -(previousRangeLength - 1));

  const allowedPlatformsRes = await client
    .from("platforms")
    .select("id")
    .eq("organization_id", organizationId)
    .in("slug", [...OVERVIEW_PLATFORM_SLUGS]);

  if (allowedPlatformsRes.error) throw allowedPlatformsRes.error;

  const allowedPlatformIds = ((allowedPlatformsRes.data ?? []) as Array<Record<string, unknown>>)
    .map((row) => String(row.id));

  if (allowedPlatformIds.length === 0) {
    return computeOverviewAnalytics({
      filters,
      brands: [],
      platforms: [],
      campaigns: [],
      campaignPlatforms: [],
      currentSpendRecords: [],
      previousSpendRecords: [],
    });
  }

  const spendRes = await client
    .from("spend_records")
    .select("brand_id,campaign_id,platform_id,spend_date,amount,currency")
    .eq("organization_id", organizationId)
    .in("platform_id", allowedPlatformIds)
    .gte("spend_date", formatIsoDate(previousStart))
    .lte("spend_date", filters.endDate);

  if (spendRes.error) throw spendRes.error;

  const spendRecords = ((spendRes.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    brandId: String(row.brand_id),
    campaignId: String(row.campaign_id),
    platformId: String(row.platform_id),
    spendDate: String(row.spend_date),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? "USD"),
  }));

  const relevantBrandIds = Array.from(new Set(spendRecords.map((record) => record.brandId)));
  const relevantCampaignIds = Array.from(new Set(spendRecords.map((record) => record.campaignId)));
  const relevantPlatformIds = Array.from(new Set(spendRecords.map((record) => record.platformId)));

  if (relevantCampaignIds.length === 0) {
    return computeOverviewAnalytics({
      filters,
      brands: [],
      platforms: [],
      campaigns: [],
      campaignPlatforms: [],
      currentSpendRecords: [],
      previousSpendRecords: [],
    });
  }

  const [brandsRes, platformsRes, campaignsRes, campaignPlatformsRes] = await Promise.all([
    client
      .from("brands")
      .select("id,name,slug,logo_url,color,competitor_group,is_active")
      .eq("organization_id", organizationId)
      .in("id", relevantBrandIds)
      .order("name", { ascending: true }),
    client
      .from("platforms")
      .select("id,name,slug,icon,color,is_active")
      .eq("organization_id", organizationId)
      .in("id", relevantPlatformIds)
      .order("name", { ascending: true }),
    client
      .from("campaigns")
      .select("id,brand_id,name,status,start_date,end_date")
      .eq("organization_id", organizationId)
      .in("id", relevantCampaignIds)
      .order("start_date", { ascending: false }),
    client
      .from("campaign_platforms")
      .select("campaign_id,platform_id")
      .eq("organization_id", organizationId)
      .in("campaign_id", relevantCampaignIds),
  ]);

  if (brandsRes.error) throw brandsRes.error;
  if (platformsRes.error) throw platformsRes.error;
  if (campaignsRes.error) throw campaignsRes.error;
  if (campaignPlatformsRes.error) throw campaignPlatformsRes.error;

  const brands = ((brandsRes.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    slug: row.slug ? String(row.slug) : null,
    logoUrl: row.logo_url ? String(row.logo_url) : null,
    color: row.color ? String(row.color) : "",
    competitorGroup: row.competitor_group ? String(row.competitor_group) : null,
    isActive: Boolean(row.is_active),
  }));
  const platforms = ((platformsRes.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    icon: row.icon ? String(row.icon) : null,
    color: row.color ? String(row.color) : "",
    isActive: Boolean(row.is_active),
  }));
  const campaigns = ((campaignsRes.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    brandId: row.brand_id ? String(row.brand_id) : null,
    name: String(row.name),
    status: String(row.status ?? "draft"),
    startDate: row.start_date ? String(row.start_date) : null,
    endDate: row.end_date ? String(row.end_date) : null,
  }));
  const campaignPlatforms = ((campaignPlatformsRes.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    campaignId: String(row.campaign_id),
    platformId: String(row.platform_id),
  }));

  const filteredSpend = spendRecords.filter((record) => {
      if (filters.brandIds.length > 0 && !filters.brandIds.includes(record.brandId)) return false;
      if (filters.campaignIds.length > 0 && !filters.campaignIds.includes(record.campaignId)) return false;
      if (filters.platformIds.length > 0 && !filters.platformIds.includes(record.platformId)) return false;
      return true;
    });

  const currentSpendRecords = filteredSpend.filter(
    (record) => record.spendDate >= filters.startDate && record.spendDate <= filters.endDate,
  );
  const previousSpendRecords = filteredSpend.filter(
    (record) => record.spendDate >= formatIsoDate(previousStart) && record.spendDate <= formatIsoDate(previousEnd),
  );

  return computeOverviewAnalytics({
    filters,
    brands,
    platforms,
    campaigns,
    campaignPlatforms,
    currentSpendRecords,
    previousSpendRecords,
  });
}
