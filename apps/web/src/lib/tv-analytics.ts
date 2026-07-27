import { z } from "zod";
import type { Brand, Campaign, TvCampaignChannel, TvChannel } from "../../../../packages/types/src/supabase";

import { isBeverageScopedBrand } from "@/lib/beverage-scope";
import { getOptionalSupabaseAdminClient } from "@/lib/supabase/server";

const ORGANIZATION_SLUG = "coca_cola_iraq";
const BAGHDAD_OFFSET = "+03:00";
const DEFAULT_TIMEZONE = "Asia/Baghdad";
const DEFAULT_CURRENCY = "PKR";
const TV_DATA_SOURCES = ["tv_dashboard_seed_v2", "uploaded_asset_seed"] as const;
const TV_SORT_FIELDS = [
  "detected_at",
  "brand",
  "channel",
  "duration",
  "cost",
  "sov",
] as const;
const DAYPARTS = [
  "Morning",
  "Afternoon",
  "Evening",
  "Pre Prime Time",
  "Prime Time",
  "Late Prime Time",
] as const;
const DEMO_PREVIEW_URL = "/demo/tv/manual-detections/bonus-02.mp4";
const DEMO_PREVIEW_POSTER = "/demo/tv/manual-detections/bonus-02.jpg";
const TV_LATEST_AVAILABLE_DATA_DATE = "2026-07-25";

export const tvPresetSchema = z.enum([
  "last7",
  "last30",
  "last90",
  "last6m",
  "last12m",
  "last2y",
  "custom",
]);

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const uuidArraySchema = z.array(z.string().uuid());
const sortFieldSchema = z.enum(TV_SORT_FIELDS);
const sortDirectionSchema = z.enum(["asc", "desc"]);

export type TvPreset = z.infer<typeof tvPresetSchema>;
export type TvSortField = z.infer<typeof sortFieldSchema>;
export type TvSortDirection = z.infer<typeof sortDirectionSchema>;

export type TvFilters = {
  preset: TvPreset;
  startDate: string;
  endDate: string;
  brandIds: string[];
  campaignIds: string[];
  channelIds: string[];
  timezone: string;
  activeFilterCount: number;
};

export type TvDetectedAdsFilters = TvFilters & {
  search?: string;
  sortBy: TvSortField;
  sortDirection: TvSortDirection;
  page: number;
  pageSize: number;
};

type NormalizedTvFilters = TvFilters & {
  start: Date;
  end: Date;
};

type NormalizedDetectedAdsFilters = TvDetectedAdsFilters & {
  start: Date;
  end: Date;
};

type TvBrandOption = {
  id: string;
  name: string;
  slug: string | null;
  color: string;
  logoUrl: string | null;
  initials: string;
};

type TvCampaignOption = {
  id: string;
  name: string;
  brandId: string | null;
  brandName: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  includesTv: boolean;
  selectedButUnavailable?: boolean;
};

type TvChannelOption = {
  id: string;
  name: string;
  slug: string;
  genre: string;
  language: string;
  initials: string;
};

type TvFilterOptionsResponse = {
  brands: TvBrandOption[];
  campaigns: TvCampaignOption[];
  channels: TvChannelOption[];
  dateBounds: {
    min: string;
    max: string;
  };
  presets: Array<{ id: TvPreset; label: string }>;
};

type TvKpiResponse = {
  value: number;
  previousValue: number;
  changePercent: number | null;
  description: string;
  comparisonLabel: string;
};

type TvTrendBucket = {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
  totalSpend: number;
  brands: Array<{
    brandId: string;
    brandName: string;
    color: string;
    spend: number;
    shareOfBucket: number;
  }>;
};

type TvBrandBreakdownItem = {
  brandId: string;
  brandName: string;
  color: string;
  logoUrl: string | null;
  initials: string;
  spend: number;
  shareOfTotal: number;
  previousSpend: number;
  changePercent: number | null;
};

type TvBrandSovItem = {
  brandId: string;
  brandName: string;
  color: string;
  spend: number;
  percentage: number;
  displayPercentage: number;
  activeCampaignCount: number;
};

type TvActiveCampaignItem = {
  id: string;
  name: string;
  brandId: string | null;
  brandName: string;
  brandColor: string;
  brandLogoUrl: string | null;
  initials: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  connectedChannels: Array<{ id: string; name: string }>;
  connectedChannelCount: number;
  detectedAdsCount: number;
  totalSpend: number;
};

type TvChannelSplitItem = {
  channelId: string;
  channelName: string;
  slug: string;
  genre: string;
  language: string;
  initials: string;
  spend: number;
  percentage: number;
  displayPercentage: number;
  detectedAdsCount: number;
};

type TvActiveBrandItem = {
  brandId: string;
  brandName: string;
  brandColor: string;
  logoUrl: string | null;
  initials: string;
  activeCampaignCount: number;
  connectedChannelCount: number;
  totalSpend: number;
  status: "Active";
};

export type TvDetectedAd = {
  id: string;
  channelName: string;
  channelSlug: string;
  genre: string;
  date: string;
  time: string;
  month: string;
  brandName: string;
  daypart: string;
  language: string;
  durationSeconds: number;
  copyName: string;
  cost: number;
  sovPercentage: number;
  previewUrl: string;
  previewPosterUrl: string | null;
  isDemoMedia: boolean;
  isUploadedAsset: boolean;
  campaignName: string | null;
  sortDetectedAt: string;
};

export type TvDetectedAdsResponse = {
  items: TvDetectedAd[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  totals: {
    filteredCost: number;
  };
};

export type TvOverviewResponse = {
  filters: TvFilters;
  summary: {
    title: "TV";
    description: string;
    currency: string;
    rangeLabel: string;
    activeFilterCount: number;
    lastUpdatedAt: string | null;
    latestDataDate: string | null;
  };
  filterOptions: TvFilterOptionsResponse;
  kpis: {
    activeBrands: TvKpiResponse;
    activeCampaigns: TvKpiResponse;
    activeChannels: TvKpiResponse;
    totalSpend: TvKpiResponse;
  };
  spendingTrend: {
    granularity: "daily" | "weekly" | "monthly";
    totalSpend: number;
    previousTotalSpend: number;
    changePercent: number | null;
    representedBrandCount: number;
    buckets: TvTrendBucket[];
  };
  brandSpendBreakdown: TvBrandBreakdownItem[];
  brandSov: TvBrandSovItem[];
  activeCampaigns: TvActiveCampaignItem[];
  channelSplit: TvChannelSplitItem[];
  activeBrands: TvActiveBrandItem[];
  reconciliation: {
    totalSpend: number;
    chartTotal: number;
    brandBreakdownTotal: number;
    channelSplitTotal: number;
    detectedAdsCostTotal: number;
  };
  states: {
    isEmpty: boolean;
    emptyReason: string | null;
  };
};

type DetectionRow = {
  id: string;
  brandId: string | null;
  campaignId: string | null;
  channelId: string;
  detectedAt: string;
  durationSeconds: number;
  cost: number;
  currency: string;
  genre: string;
  language: string;
  daypart: string;
  copyName: string;
  creativeUrl: string | null;
  previewPosterUrl: string | null;
  isUploadedAsset: boolean;
  source: string;
};

type CampaignRecord = {
  id: string;
  brandId: string | null;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  includesTv: boolean;
};

type ChannelRecord = {
  id: string;
  name: string;
  slug: string;
  genre: string;
  language: string;
};

type BrandRecord = {
  id: string;
  name: string;
  slug: string | null;
  category: string | null;
  color: string;
  logoUrl: string | null;
};

type TvDataset = {
  organizationId: string;
  brands: BrandRecord[];
  channels: ChannelRecord[];
  campaigns: CampaignRecord[];
  campaignChannels: Map<string, Set<string>>;
  detections: DetectionRow[];
  dateBounds: {
    min: string | null;
    max: string | null;
  };
};

function startOfDayUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfDayUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function parseIsoDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatIsoDate(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function addDaysUtc(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function daysBetweenInclusive(start: Date, end: Date) {
  return Math.max(1, Math.floor((endOfDayUtc(end).getTime() - startOfDayUtc(start).getTime()) / 86_400_000) + 1);
}

function safePercentChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

export function calculateDetectedAdSov(cost: number, totalCost: number) {
  if (totalCost <= 0) return 0;
  return Number(((cost / totalCost) * 100).toFixed(4));
}

function sumMoney(values: number[]) {
  return Number(values.reduce((sum, value) => sum + value, 0).toFixed(2));
}

function getInitials(name: string) {
  const parts = name.split(/[\s/-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
  }
  return name.slice(0, 2).toUpperCase();
}

function getBrandColor(brand: Pick<BrandRecord, "slug" | "color">) {
  const fallbackMap: Record<string, string> = {
    "zain-iraq": "#7C3AED",
    asiacell: "#F59E0B",
    "korek-telecom": "#E11D48",
    pepsi: "#2563EB",
    "coca-cola": "#DC2626",
    samsung: "#1D4ED8",
    lg: "#C026D3",
    toyota: "#EA580C",
    kia: "#B45309",
    hyundai: "#0F766E",
    nestle: "#0891B2",
    unilever: "#4F46E5",
    huawei: "#BE123C",
    careem: "#16A34A",
    talabat: "#F97316",
    carrefour: "#0284C7",
    visa: "#1E3A8A",
    mastercard: "#D97706",
    tapal: "#92400E",
    lifebuoy: "#047857",
    bonus: "#EAB308",
  };
  if (brand.slug && fallbackMap[brand.slug]) {
    return fallbackMap[brand.slug];
  }
  if (brand.color.trim().length > 0) {
    return brand.color;
  }
  return "#EF4444";
}

function formatRangeLabel(startDate: string, endDate: string) {
  return `${startDate} to ${endDate}`;
}

function getBaghdadDateTimeParts(value: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const parts = formatter.formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: get("day"),
    month: get("month"),
    year: get("year"),
    hour: get("hour"),
    minute: get("minute"),
    dayPeriod: get("dayPeriod").toUpperCase(),
  };
}

export function deriveTvDaypart(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: DEFAULT_TIMEZONE,
      hour: "2-digit",
      hour12: false,
    }).format(date),
  );

  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 19) return "Evening";
  if (hour >= 19 && hour < 20) return "Pre Prime Time";
  if (hour >= 20 && hour < 23) return "Prime Time";
  return "Late Prime Time";
}

export function campaignOverlapsSelectedRange(
  campaign: Pick<CampaignRecord, "startDate" | "endDate" | "status" | "includesTv">,
  startDate: Date,
  endDate: Date,
) {
  if (!campaign.includesTv) return false;
  if (campaign.status.toLowerCase() !== "active") return false;

  const startsAt = campaign.startDate ? parseIsoDate(campaign.startDate) : null;
  const endsAt = campaign.endDate ? endOfDayUtc(parseIsoDate(campaign.endDate)) : null;

  if (startsAt && startsAt.getTime() > endDate.getTime()) return false;
  if (endsAt && endsAt.getTime() < startDate.getTime()) return false;
  return true;
}

export function getTvGranularity(startDate: Date, endDate: Date) {
  const totalDays = daysBetweenInclusive(startDate, endDate);
  if (totalDays <= 45) return "daily" as const;
  if (totalDays <= 180) return "weekly" as const;
  return "monthly" as const;
}

function buildDateRange(preset: TvPreset, customStart?: string, customEnd?: string) {
  const latestAvailableDate = startOfDayUtc(parseIsoDate(TV_LATEST_AVAILABLE_DATA_DATE));
  if (preset === "custom") {
    const start = customStart ? startOfDayUtc(parseIsoDate(customStart)) : addDaysUtc(latestAvailableDate, -29);
    const end = customEnd ? endOfDayUtc(parseIsoDate(customEnd)) : endOfDayUtc(latestAvailableDate);
    return { start, end };
  }

  if (preset === "last7") return { start: addDaysUtc(latestAvailableDate, -6), end: endOfDayUtc(latestAvailableDate) };
  if (preset === "last90") return { start: addDaysUtc(latestAvailableDate, -89), end: endOfDayUtc(latestAvailableDate) };
  if (preset === "last6m") return { start: addDaysUtc(latestAvailableDate, -181), end: endOfDayUtc(latestAvailableDate) };
  if (preset === "last12m") return { start: addDaysUtc(latestAvailableDate, -364), end: endOfDayUtc(latestAvailableDate) };
  if (preset === "last2y") return { start: addDaysUtc(latestAvailableDate, -729), end: endOfDayUtc(latestAvailableDate) };
  return { start: addDaysUtc(latestAvailableDate, -29), end: endOfDayUtc(latestAvailableDate) };
}

function countActiveFilterGroups(filters: {
  brandIds: string[];
  campaignIds: string[];
  channelIds: string[];
  preset: TvPreset;
  startDate?: string;
  endDate?: string;
}) {
  return (
    (filters.brandIds.length > 0 ? 1 : 0) +
    (filters.campaignIds.length > 0 ? 1 : 0) +
    (filters.channelIds.length > 0 ? 1 : 0) +
    (filters.preset !== "last30" || Boolean(filters.startDate) || Boolean(filters.endDate) ? 1 : 0)
  );
}

export function normalizeTvFilters(raw?: Partial<TvFilters>): NormalizedTvFilters {
  const schema = z
    .object({
      preset: tvPresetSchema.default("last30"),
      startDate: isoDateSchema.optional(),
      endDate: isoDateSchema.optional(),
      brandIds: uuidArraySchema.default([]),
      campaignIds: uuidArraySchema.default([]),
      channelIds: uuidArraySchema.default([]),
      timezone: z.string().trim().min(2).max(64).default(DEFAULT_TIMEZONE),
    })
    .superRefine((value, ctx) => {
      if (value.preset === "custom" && (!value.startDate || !value.endDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["startDate"],
          message: "Custom date ranges require both a start date and an end date.",
        });
      }
      if (value.startDate && value.endDate && value.startDate > value.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endDate"],
          message: "End date must be on or after the start date.",
        });
      }
    });

  const parsed = schema.parse({
    preset: raw?.preset,
    startDate: raw?.startDate,
    endDate: raw?.endDate,
    brandIds: raw?.brandIds ?? [],
    campaignIds: raw?.campaignIds ?? [],
    channelIds: raw?.channelIds ?? [],
    timezone: raw?.timezone ?? DEFAULT_TIMEZONE,
  });
  const { start, end } = buildDateRange(parsed.preset, parsed.startDate, parsed.endDate);

  return {
    ...parsed,
    startDate: formatIsoDate(start),
    endDate: formatIsoDate(end),
    start,
    end,
    activeFilterCount: countActiveFilterGroups(parsed),
  };
}

function normalizeDetectedAdsFilters(raw?: Partial<TvDetectedAdsFilters> & { search?: string }) {
  const base = normalizeTvFilters(raw);
  const schema = z.object({
    sortBy: sortFieldSchema.default("detected_at"),
    sortDirection: sortDirectionSchema.default("desc"),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(5).max(100).default(20),
    search: z.string().trim().max(120).optional().default(""),
  });
  const parsed = schema.parse({
    sortBy: raw?.sortBy,
    sortDirection: raw?.sortDirection,
    page: raw?.page,
    pageSize: raw?.pageSize,
    search: raw?.search,
  });
  return {
    ...base,
    ...parsed,
  } satisfies NormalizedDetectedAdsFilters;
}

export function parseTvFiltersFromSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
) {
  const getValue = (key: string) => {
    if (params instanceof URLSearchParams) {
      return params.get(key) ?? undefined;
    }
    return params[key];
  };

  const parseArray = (key: string) => {
    const raw = getValue(key);
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.flatMap((item) => item.split(",")).filter(Boolean);
    return raw.split(",").filter(Boolean);
  };

  return normalizeTvFilters({
    preset: (Array.isArray(getValue("preset")) ? getValue("preset")?.[0] : getValue("preset")) as TvPreset | undefined,
    startDate: Array.isArray(getValue("startDate"))
      ? getValue("startDate")?.[0]
      : (getValue("startDate") as string | undefined),
    endDate: Array.isArray(getValue("endDate"))
      ? getValue("endDate")?.[0]
      : (getValue("endDate") as string | undefined),
    brandIds: parseArray("brands"),
    campaignIds: parseArray("campaigns"),
    channelIds: parseArray("channels"),
    timezone: Array.isArray(getValue("timezone"))
      ? getValue("timezone")?.[0]
      : (getValue("timezone") as string | undefined),
  });
}

function parseDetectedAdsFiltersFromSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
) {
  const base = parseTvFiltersFromSearchParams(params);
  const getValue = (key: string) => {
    if (params instanceof URLSearchParams) {
      return params.get(key) ?? undefined;
    }
    return params[key];
  };
  return normalizeDetectedAdsFilters({
    ...base,
    search: Array.isArray(getValue("search")) ? getValue("search")?.[0] : (getValue("search") as string | undefined),
    sortBy: (Array.isArray(getValue("sortBy")) ? getValue("sortBy")?.[0] : getValue("sortBy")) as TvSortField | undefined,
    sortDirection: (Array.isArray(getValue("sortDirection")) ? getValue("sortDirection")?.[0] : getValue("sortDirection")) as TvSortDirection | undefined,
    page: Number(Array.isArray(getValue("page")) ? getValue("page")?.[0] : getValue("page")) || 1,
    pageSize: Number(Array.isArray(getValue("pageSize")) ? getValue("pageSize")?.[0] : getValue("pageSize")) || 20,
  });
}

function buildPercentageDisplay(values: Array<{ key: string; value: number }>) {
  if (values.length === 0) return new Map<string, number>();
  const basis = values.map((item) => ({
    ...item,
    raw: item.value * 10,
  }));
  const floorTotal = basis.reduce((sum, item) => sum + Math.floor(item.raw), 0);
  let remainder = Math.round(1000 - floorTotal);
  const sortedRemainders = [...basis].sort((left, right) => {
    const diff = (right.raw - Math.floor(right.raw)) - (left.raw - Math.floor(left.raw));
    return diff !== 0 ? diff : left.key.localeCompare(right.key);
  });

  const lookup = new Map<string, number>(basis.map((item) => [item.key, Math.floor(item.raw)]));
  for (const item of sortedRemainders) {
    if (remainder <= 0) break;
    lookup.set(item.key, (lookup.get(item.key) ?? 0) + 1);
    remainder -= 1;
  }

  return new Map<string, number>(
    [...lookup.entries()].map(([key, raw]) => [key, Number((raw / 10).toFixed(1))]),
  );
}

async function resolveOrganizationId() {
  const client = getOptionalSupabaseAdminClient();
  if (!client) throw new Error("Supabase admin client is not configured.");

  const organizationResponse = await client
    .from("organizations")
    .select("id")
    .eq("slug", ORGANIZATION_SLUG)
    .maybeSingle();

  if (organizationResponse.error) throw organizationResponse.error;
  if (organizationResponse.data?.id) return organizationResponse.data.id as string;

  const fallback = await client
    .from("organizations")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallback.error) throw fallback.error;
  if (!fallback.data?.id) throw new Error("No organization was available for TV analytics.");
  return fallback.data.id as string;
}

async function loadTvDataset(startDate: string, endDate: string) {
  const client = getOptionalSupabaseAdminClient();
  if (!client) throw new Error("Supabase admin client is not configured.");
  const organizationId = await resolveOrganizationId();

  const [brandsRes, channelsRes, campaignsRes, campaignChannelsRes, detectionsRes, boundsRes] =
    await Promise.all([
      client
        .from("brands")
        .select("id,name,slug,category,color,logo_url")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name", { ascending: true }),
      client
        .from("tv_channels")
        .select("id,name,slug,genre,primary_language")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name", { ascending: true }),
      client
        .from("campaigns")
        .select("id,brand_id,name,status,start_date,end_date,media_types,medium")
        .eq("organization_id", organizationId)
        .order("name", { ascending: true }),
      client
        .from("tv_campaign_channels")
        .select("campaign_id,channel_id")
        .eq("organization_id", organizationId),
      client
        .from("tv_ad_detections")
        .select("id,brand_id,campaign_id,channel_id,detected_at,duration_seconds,cost,currency,genre,language,daypart,copy_name,creative_url,preview_poster_url,is_uploaded_asset,source")
        .eq("organization_id", organizationId)
        .in("source", [...TV_DATA_SOURCES])
        .gte("detected_at", `${startDate}T00:00:00${BAGHDAD_OFFSET}`)
        .lte("detected_at", `${endDate}T23:59:59.999${BAGHDAD_OFFSET}`),
      client
        .from("tv_ad_detections")
        .select("detected_at")
        .eq("organization_id", organizationId)
        .in("source", [...TV_DATA_SOURCES])
        .order("detected_at", { ascending: true })
        .limit(1),
    ]);

  if (brandsRes.error) throw brandsRes.error;
  if (channelsRes.error) throw channelsRes.error;
  if (campaignsRes.error) throw campaignsRes.error;
  if (campaignChannelsRes.error) throw campaignChannelsRes.error;
  if (detectionsRes.error) throw detectionsRes.error;
  if (boundsRes.error) throw boundsRes.error;

  const lastBoundRes = await client
    .from("tv_ad_detections")
    .select("detected_at")
    .eq("organization_id", organizationId)
    .in("source", [...TV_DATA_SOURCES])
    .order("detected_at", { ascending: false })
    .limit(1);

  if (lastBoundRes.error) throw lastBoundRes.error;

  const brands = ((brandsRes.data ?? []) as Brand[]).map((row) => {
    const rawRow = row as unknown as Record<string, unknown>;
    return {
    id: String(row.id),
    name: String(row.name),
    slug: row.slug ? String(row.slug) : null,
    category: typeof rawRow.category === "string" ? rawRow.category : null,
    color: getBrandColor({
      slug: row.slug ? String(row.slug) : null,
      color: row.color ? String(row.color) : "",
    }),
    logoUrl: row.logo_url ? String(row.logo_url) : null,
  };
  }).filter((brand) =>
    isBeverageScopedBrand({
      name: brand.name,
      slug: brand.slug,
      category: brand.category,
    }),
  );
  const allowedBrandIds = new Set(brands.map((brand) => brand.id));

  const channels = ((channelsRes.data ?? []) as TvChannel[]).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    genre: row.genre ? String(row.genre) : "General Entertainment",
    language: row.primary_language ? String(row.primary_language) : "Arabic",
  }));

  const campaigns = ((campaignsRes.data ?? []) as Array<
    Campaign & { media_types?: string[] | null; medium?: string | null }
  >).map((row) => {
    const mediaTypes = Array.isArray(row.media_types)
      ? row.media_types.map((item) => String(item).toLowerCase())
      : [];
    const medium = row.medium ? String(row.medium).toLowerCase() : null;
    return {
      id: String(row.id),
      brandId: row.brand_id ? String(row.brand_id) : null,
      name: String(row.name),
      status: String(row.status ?? "draft"),
      startDate: row.start_date ? String(row.start_date) : null,
      endDate: row.end_date ? String(row.end_date) : null,
      includesTv: medium === "tv" || mediaTypes.includes("tv"),
    };
  }).filter((campaign) => campaign.brandId && allowedBrandIds.has(campaign.brandId));
  const allowedCampaignIds = new Set(campaigns.map((campaign) => campaign.id));

  const campaignChannels = new Map<string, Set<string>>();
  for (const row of (campaignChannelsRes.data ?? []) as TvCampaignChannel[]) {
    const campaignId = String(row.campaign_id);
    const current = campaignChannels.get(campaignId) ?? new Set<string>();
    current.add(String(row.channel_id));
    campaignChannels.set(campaignId, current);
  }

  const detections = ((detectionsRes.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    brandId: typeof row.brand_id === "string" ? row.brand_id : null,
    campaignId: typeof row.campaign_id === "string" ? row.campaign_id : null,
    channelId: String(row.channel_id),
    detectedAt: String(row.detected_at),
    durationSeconds: Number(row.duration_seconds ?? 0),
    cost: Number(row.cost ?? 0),
    currency: String(row.currency ?? DEFAULT_CURRENCY),
    genre: String(row.genre ?? "General Entertainment"),
    language: String(row.language ?? "Arabic"),
    daypart:
      typeof row.daypart === "string" && DAYPARTS.includes(row.daypart as (typeof DAYPARTS)[number])
        ? row.daypart
        : deriveTvDaypart(String(row.detected_at)),
    copyName: String(row.copy_name ?? "Untitled creative"),
    creativeUrl: typeof row.creative_url === "string" ? row.creative_url : null,
    previewPosterUrl: typeof row.preview_poster_url === "string" ? row.preview_poster_url : null,
    isUploadedAsset: Boolean(row.is_uploaded_asset),
    source: typeof row.source === "string" ? row.source : "tv_dashboard_seed_v2",
  })).filter((detection) =>
    detection.brandId !== null &&
    detection.campaignId !== null &&
    allowedBrandIds.has(detection.brandId) &&
    allowedCampaignIds.has(detection.campaignId),
  );

  return {
    organizationId,
    brands,
    channels,
    campaigns,
    campaignChannels,
    detections,
    dateBounds: {
      min: boundsRes.data?.[0]?.detected_at
        ? formatIsoDate(startOfDayUtc(new Date(String(boundsRes.data[0].detected_at))))
        : null,
      max: lastBoundRes.data?.[0]?.detected_at
        ? formatIsoDate(startOfDayUtc(new Date(String(lastBoundRes.data[0].detected_at))))
        : null,
    },
  } satisfies TvDataset;
}

function matchesSharedFilters(
  row: DetectionRow,
  filters: NormalizedTvFilters,
) {
  if (filters.brandIds.length > 0 && (!row.brandId || !filters.brandIds.includes(row.brandId))) return false;
  if (filters.campaignIds.length > 0 && (!row.campaignId || !filters.campaignIds.includes(row.campaignId))) return false;
  if (filters.channelIds.length > 0 && !filters.channelIds.includes(row.channelId)) return false;

  const detectedAt = new Date(row.detectedAt).getTime();
  return detectedAt >= filters.start.getTime() && detectedAt <= filters.end.getTime();
}

function buildFilterOptions(dataset: TvDataset, filters: NormalizedTvFilters): TvFilterOptionsResponse {
  const brandMap = new Map(dataset.brands.map((brand) => [brand.id, brand]));
  const campaignMap = new Map(dataset.campaigns.map((campaign) => [campaign.id, campaign]));
  const detectedBrandIds = new Set(dataset.detections.map((row) => row.brandId).filter(Boolean) as string[]);
  const detectedCampaignIds = new Set(dataset.detections.map((row) => row.campaignId).filter(Boolean) as string[]);
  const detectedChannelIds = new Set(dataset.detections.map((row) => row.channelId));

  const brands = dataset.brands
    .map((brand) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      color: brand.color,
      logoUrl: brand.logoUrl,
      initials: getInitials(brand.name),
    }))
    .sort((left, right) => {
      const leftOwned = left.name.toLowerCase().includes("coca-cola") ? 0 : 1;
      const rightOwned = right.name.toLowerCase().includes("coca-cola") ? 0 : 1;
      if (leftOwned !== rightOwned) return leftOwned - rightOwned;
      const leftDetected = detectedBrandIds.has(left.id) ? 0 : 1;
      const rightDetected = detectedBrandIds.has(right.id) ? 0 : 1;
      if (leftDetected !== rightDetected) return leftDetected - rightDetected;
      return left.name.localeCompare(right.name);
    });

  const matchingCampaigns = dataset.campaigns.filter((campaign) => {
    if (!campaign.includesTv) return false;
    if (!detectedCampaignIds.has(campaign.id) && !filters.campaignIds.includes(campaign.id)) return false;
    if (filters.brandIds.length > 0 && (!campaign.brandId || !filters.brandIds.includes(campaign.brandId))) return false;
    if (filters.channelIds.length > 0) {
      const linkedChannels = dataset.campaignChannels.get(campaign.id) ?? new Set<string>();
      if (!filters.channelIds.some((channelId) => linkedChannels.has(channelId))) return false;
    }
    return true;
  });

  const selectedCampaigns = filters.campaignIds
    .map((campaignId) => campaignMap.get(campaignId))
    .filter(Boolean) as CampaignRecord[];

  const campaigns = [...matchingCampaigns, ...selectedCampaigns]
    .filter((campaign, index, array) => array.findIndex((item) => item.id === campaign.id) === index)
    .map((campaign) => {
      const brand = campaign.brandId ? brandMap.get(campaign.brandId) : null;
      const unavailable = !matchingCampaigns.some((item) => item.id === campaign.id);
      return {
        id: campaign.id,
        name: campaign.name,
        brandId: campaign.brandId,
        brandName: brand?.name ?? "Unassigned",
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        includesTv: campaign.includesTv,
        selectedButUnavailable: unavailable || undefined,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  const channels = dataset.channels
    .filter((channel) => detectedChannelIds.has(channel.id) || filters.channelIds.includes(channel.id))
    .map((channel) => ({
      id: channel.id,
      name: channel.name,
      slug: channel.slug,
      genre: channel.genre,
      language: channel.language,
      initials: getInitials(channel.name),
    }));

  return {
    brands,
    campaigns,
    channels,
    dateBounds: {
      min: dataset.dateBounds.min ?? filters.startDate,
      max: dataset.dateBounds.max ?? filters.endDate,
    },
    presets: [
      { id: "last7", label: "Last 7 days" },
      { id: "last30", label: "Last 30 days" },
      { id: "last90", label: "Last 90 days" },
      { id: "last6m", label: "Last 6 months" },
      { id: "last12m", label: "Last 12 months" },
      { id: "last2y", label: "Last 2 years" },
      { id: "custom", label: "Custom range" },
    ],
  };
}

function buildTrendBuckets(
  detections: DetectionRow[],
  brandsById: Map<string, BrandRecord>,
  startDate: Date,
  endDate: Date,
) {
  const granularity = getTvGranularity(startDate, endDate);
  const buckets: Array<{ key: string; label: string; start: Date; end: Date }> = [];
  let cursor = startOfDayUtc(startDate);

  while (cursor.getTime() <= endDate.getTime()) {
    if (granularity === "daily") {
      buckets.push({
        key: formatIsoDate(cursor),
        label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(cursor),
        start: startOfDayUtc(cursor),
        end: endOfDayUtc(cursor),
      });
      cursor = addDaysUtc(cursor, 1);
      continue;
    }

    if (granularity === "weekly") {
      const bucketStart = startOfDayUtc(cursor);
      const bucketEnd = endOfDayUtc(addDaysUtc(bucketStart, 6));
      const clippedEnd = bucketEnd.getTime() > endDate.getTime() ? endOfDayUtc(endDate) : bucketEnd;
      buckets.push({
        key: `${formatIsoDate(bucketStart)}-${formatIsoDate(clippedEnd)}`,
        label: `${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(bucketStart)}-${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(clippedEnd)}`,
        start: bucketStart,
        end: clippedEnd,
      });
      cursor = addDaysUtc(bucketStart, 7);
      continue;
    }

    const bucketStart = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
    const bucketEnd = endOfDayUtc(new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)));
    const clippedEnd = bucketEnd.getTime() > endDate.getTime() ? endOfDayUtc(endDate) : bucketEnd;
    buckets.push({
      key: `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }).format(cursor),
      start: bucketStart,
      end: clippedEnd,
    });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  const bucketRows: TvTrendBucket[] = buckets.map((bucket) => {
    const bucketDetections = detections.filter((row) => {
      const detectedAt = new Date(row.detectedAt).getTime();
      return detectedAt >= bucket.start.getTime() && detectedAt <= bucket.end.getTime();
    });
    const spendByBrand = new Map<string, number>();
    for (const row of bucketDetections) {
      if (!row.brandId) continue;
      spendByBrand.set(row.brandId, Number(((spendByBrand.get(row.brandId) ?? 0) + row.cost).toFixed(2)));
    }
    const totalSpend = sumMoney(bucketDetections.map((row) => row.cost));
    return {
      key: bucket.key,
      label: bucket.label,
      startDate: formatIsoDate(bucket.start),
      endDate: formatIsoDate(bucket.end),
      totalSpend,
      brands: [...spendByBrand.entries()]
        .map(([brandId, spend]) => {
          const brand = brandsById.get(brandId);
          return {
            brandId,
            brandName: brand?.name ?? "Unknown brand",
            color: brand?.color ?? "#EF4444",
            spend,
            shareOfBucket: totalSpend > 0 ? Number(((spend / totalSpend) * 100).toFixed(2)) : 0,
          };
        })
        .sort((left, right) => right.spend - left.spend),
    };
  });

  return {
    granularity,
    buckets: bucketRows,
  };
}

function computeCurrentAndPreviousScope(
  dataset: TvDataset,
  filters: NormalizedTvFilters,
) {
  const { previousStart, previousEnd } = getPreviousPeriodRange(filters.start, filters.end);

  const previousFilters: NormalizedTvFilters = {
    ...filters,
    startDate: formatIsoDate(previousStart),
    endDate: formatIsoDate(previousEnd),
    start: previousStart,
    end: previousEnd,
  };

  const currentDetections = dataset.detections.filter((row) => matchesSharedFilters(row, filters));
  const previousDetections = dataset.detections.filter((row) => matchesSharedFilters(row, previousFilters));

  return {
    previousStart,
    previousEnd,
    currentDetections,
    previousDetections,
  };
}

export function getPreviousPeriodRange(start: Date, end: Date) {
  const previousRangeDays = daysBetweenInclusive(start, end);
  const previousEnd = endOfDayUtc(addDaysUtc(start, -1));
  const previousStart = startOfDayUtc(addDaysUtc(previousEnd, -(previousRangeDays - 1)));
  return { previousStart, previousEnd };
}

function validateDateBounds(filters: NormalizedTvFilters, bounds: TvDataset["dateBounds"]) {
  if (!bounds.max) return;
  if (filters.endDate > bounds.max) {
    throw new Error(`End date cannot be later than ${bounds.max}, which is the latest available TV data date.`);
  }
}

export async function getTvFilterOptions(rawFilters?: Partial<TvFilters>) {
  const filters = normalizeTvFilters(rawFilters);
  const previousStart = formatIsoDate(addDaysUtc(filters.start, -730));
  const dataset = await loadTvDataset(previousStart, filters.endDate);
  return buildFilterOptions(dataset, filters);
}

export async function getTvAnalytics(rawFilters?: Partial<TvFilters>): Promise<TvOverviewResponse> {
  const filters = normalizeTvFilters(rawFilters);
  const { previousStart } = getPreviousPeriodRange(filters.start, filters.end);
  const previousSeedStart = formatIsoDate(previousStart);
  const dataset = await loadTvDataset(previousSeedStart, filters.endDate);
  validateDateBounds(filters, dataset.dateBounds);

  const brandsById = new Map(dataset.brands.map((brand) => [brand.id, brand]));
  const channelsById = new Map(dataset.channels.map((channel) => [channel.id, channel]));
  const filterOptions = buildFilterOptions(dataset, filters);
  const { previousEnd, previousStart: previousStartDate, currentDetections, previousDetections } =
    computeCurrentAndPreviousScope(dataset, filters);

  const activeCampaigns = dataset.campaigns.filter((campaign) => {
    if (!campaignOverlapsSelectedRange(campaign, filters.start, filters.end)) return false;
    if (filters.brandIds.length > 0 && (!campaign.brandId || !filters.brandIds.includes(campaign.brandId))) return false;
    if (filters.campaignIds.length > 0 && !filters.campaignIds.includes(campaign.id)) return false;
    if (filters.channelIds.length > 0) {
      const linkedChannels = dataset.campaignChannels.get(campaign.id) ?? new Set<string>();
      if (!filters.channelIds.some((channelId) => linkedChannels.has(channelId))) return false;
    }
    return currentDetections.some((row) => row.campaignId === campaign.id);
  });

  const previousActiveCampaigns = dataset.campaigns.filter((campaign) => {
    if (!campaignOverlapsSelectedRange(campaign, previousStartDate, previousEnd)) return false;
    if (filters.brandIds.length > 0 && (!campaign.brandId || !filters.brandIds.includes(campaign.brandId))) return false;
    if (filters.campaignIds.length > 0 && !filters.campaignIds.includes(campaign.id)) return false;
    if (filters.channelIds.length > 0) {
      const linkedChannels = dataset.campaignChannels.get(campaign.id) ?? new Set<string>();
      if (!filters.channelIds.some((channelId) => linkedChannels.has(channelId))) return false;
    }
    return previousDetections.some((row) => row.campaignId === campaign.id);
  });

  const activeBrandIds = new Set(activeCampaigns.map((campaign) => campaign.brandId).filter(Boolean) as string[]);
  const previousActiveBrandIds = new Set(
    previousActiveCampaigns.map((campaign) => campaign.brandId).filter(Boolean) as string[],
  );
  const activeChannelIds = new Set(currentDetections.map((row) => row.channelId));
  const previousActiveChannelIds = new Set(previousDetections.map((row) => row.channelId));

  const currentSpendTotal = sumMoney(currentDetections.map((row) => row.cost));
  const previousSpendTotal = sumMoney(previousDetections.map((row) => row.cost));

  const currentSpendByBrand = new Map<string, number>();
  const previousSpendByBrand = new Map<string, number>();
  const currentSpendByCampaign = new Map<string, number>();
  const currentSpendByChannel = new Map<string, number>();

  for (const row of currentDetections) {
    if (row.brandId) currentSpendByBrand.set(row.brandId, Number(((currentSpendByBrand.get(row.brandId) ?? 0) + row.cost).toFixed(2)));
    if (row.campaignId) currentSpendByCampaign.set(row.campaignId, Number(((currentSpendByCampaign.get(row.campaignId) ?? 0) + row.cost).toFixed(2)));
    currentSpendByChannel.set(row.channelId, Number(((currentSpendByChannel.get(row.channelId) ?? 0) + row.cost).toFixed(2)));
  }
  for (const row of previousDetections) {
    if (row.brandId) previousSpendByBrand.set(row.brandId, Number(((previousSpendByBrand.get(row.brandId) ?? 0) + row.cost).toFixed(2)));
  }

  const trend = buildTrendBuckets(currentDetections, brandsById, filters.start, filters.end);
  const chartTotal = sumMoney(trend.buckets.map((bucket) => bucket.totalSpend));

  const brandBreakdown = [...currentSpendByBrand.entries()]
    .map(([brandId, spend]) => {
      const brand = brandsById.get(brandId);
      if (!brand) return null;
      const previousSpend = previousSpendByBrand.get(brandId) ?? 0;
      return {
        brandId,
        brandName: brand.name,
        color: brand.color,
        logoUrl: brand.logoUrl,
        initials: getInitials(brand.name),
        spend,
        shareOfTotal: currentSpendTotal > 0 ? Number(((spend / currentSpendTotal) * 100).toFixed(2)) : 0,
        previousSpend,
        changePercent: safePercentChange(spend, previousSpend),
      };
    })
    .filter(Boolean)
    .sort((left, right) => (right?.spend ?? 0) - (left?.spend ?? 0)) as TvBrandBreakdownItem[];

  const brandPercentageDisplay = buildPercentageDisplay(
    brandBreakdown.map((item) => ({ key: item.brandId, value: item.shareOfTotal })),
  );
  const brandSov = brandBreakdown.map((item) => ({
    brandId: item.brandId,
    brandName: item.brandName,
    color: item.color,
    spend: item.spend,
    percentage: item.shareOfTotal,
    displayPercentage: brandPercentageDisplay.get(item.brandId) ?? Number(item.shareOfTotal.toFixed(1)),
    activeCampaignCount: activeCampaigns.filter((campaign) => campaign.brandId === item.brandId).length,
  }));

  const channelPercentageDisplay = buildPercentageDisplay(
    [...currentSpendByChannel.entries()].map(([channelId, spend]) => ({
      key: channelId,
      value: currentSpendTotal > 0 ? (spend / currentSpendTotal) * 100 : 0,
    })),
  );

  const channelSplit = [...currentSpendByChannel.entries()]
    .map(([channelId, spend]) => {
      const channel = channelsById.get(channelId);
      if (!channel) return null;
      return {
        channelId,
        channelName: channel.name,
        slug: channel.slug,
        genre: channel.genre,
        language: channel.language,
        initials: getInitials(channel.name),
        spend,
        percentage: currentSpendTotal > 0 ? Number(((spend / currentSpendTotal) * 100).toFixed(2)) : 0,
        displayPercentage:
          channelPercentageDisplay.get(channelId) ??
          Number((currentSpendTotal > 0 ? (spend / currentSpendTotal) * 100 : 0).toFixed(1)),
        detectedAdsCount: currentDetections.filter((row) => row.channelId === channelId).length,
      };
    })
    .filter(Boolean)
    .sort((left, right) => (right?.spend ?? 0) - (left?.spend ?? 0)) as TvChannelSplitItem[];

  const activeCampaignItems = activeCampaigns
    .map((campaign) => {
      const brand = campaign.brandId ? brandsById.get(campaign.brandId) : null;
      const linkedChannels = [...(dataset.campaignChannels.get(campaign.id) ?? new Set<string>())]
        .map((channelId) => channelsById.get(channelId))
        .filter(Boolean)
        .map((channel) => ({ id: channel!.id, name: channel!.name }));
      return {
        id: campaign.id,
        name: campaign.name,
        brandId: campaign.brandId,
        brandName: brand?.name ?? "Unassigned",
        brandColor: brand?.color ?? "#6B7280",
        brandLogoUrl: brand?.logoUrl ?? null,
        initials: getInitials(brand?.name ?? campaign.name),
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        connectedChannels: linkedChannels,
        connectedChannelCount: linkedChannels.length,
        detectedAdsCount: currentDetections.filter((row) => row.campaignId === campaign.id).length,
        totalSpend: currentSpendByCampaign.get(campaign.id) ?? 0,
      };
    })
    .sort((left, right) => right.totalSpend - left.totalSpend);

  const activeBrandItems = [...activeBrandIds]
    .map((brandId) => {
      const brand = brandsById.get(brandId);
      if (!brand) return null;
      const brandCampaigns = activeCampaigns.filter((campaign) => campaign.brandId === brandId);
      const channelIds = new Set(
        brandCampaigns.flatMap((campaign) => [...(dataset.campaignChannels.get(campaign.id) ?? new Set<string>())]),
      );
      return {
        brandId,
        brandName: brand.name,
        brandColor: brand.color,
        logoUrl: brand.logoUrl,
        initials: getInitials(brand.name),
        activeCampaignCount: brandCampaigns.length,
        connectedChannelCount: channelIds.size,
        totalSpend: currentSpendByBrand.get(brandId) ?? 0,
        status: "Active" as const,
      };
    })
    .filter(Boolean)
    .sort((left, right) => (right?.totalSpend ?? 0) - (left?.totalSpend ?? 0)) as TvActiveBrandItem[];

  const channelTotal = sumMoney(channelSplit.map((item) => item.spend));
  const brandTotal = sumMoney(brandBreakdown.map((item) => item.spend));
  const latestDetectionAt = currentDetections.length > 0
    ? [...currentDetections].sort((left, right) => right.detectedAt.localeCompare(left.detectedAt))[0]?.detectedAt ?? null
    : dataset.dateBounds.max
      ? `${dataset.dateBounds.max}T00:00:00${BAGHDAD_OFFSET}`
      : null;

  return {
    filters: {
      preset: filters.preset,
      startDate: filters.startDate,
      endDate: filters.endDate,
      brandIds: filters.brandIds,
      campaignIds: filters.campaignIds,
      channelIds: filters.channelIds,
      timezone: filters.timezone,
      activeFilterCount: filters.activeFilterCount,
    },
    summary: {
      title: "TV",
      description: "Monitor TV advertising performance, active brands, campaigns, channels, spend, and detected creatives.",
      currency: DEFAULT_CURRENCY,
      rangeLabel: formatRangeLabel(filters.startDate, filters.endDate),
      activeFilterCount: filters.activeFilterCount,
      lastUpdatedAt: latestDetectionAt,
      latestDataDate: dataset.dateBounds.max,
    },
    filterOptions,
    kpis: {
      activeBrands: {
        value: activeBrandIds.size,
        previousValue: previousActiveBrandIds.size,
        changePercent: safePercentChange(activeBrandIds.size, previousActiveBrandIds.size),
        description: "Unique brands active on TV",
        comparisonLabel: "Unique brands active on TV",
      },
      activeCampaigns: {
        value: activeCampaigns.length,
        previousValue: previousActiveCampaigns.length,
        changePercent: safePercentChange(activeCampaigns.length, previousActiveCampaigns.length),
        description: "TV campaigns active in the selected period",
        comparisonLabel: "TV campaigns active in the selected period",
      },
      activeChannels: {
        value: activeChannelIds.size,
        previousValue: previousActiveChannelIds.size,
        changePercent: safePercentChange(activeChannelIds.size, previousActiveChannelIds.size),
        description: "TV channels with monitored activity",
        comparisonLabel: "TV channels with monitored activity",
      },
      totalSpend: {
        value: currentSpendTotal,
        previousValue: previousSpendTotal,
        changePercent: safePercentChange(currentSpendTotal, previousSpendTotal),
        description: "Combined filtered TV media spend",
        comparisonLabel: "Combined filtered TV media spend",
      },
    },
    spendingTrend: {
      granularity: trend.granularity,
      totalSpend: currentSpendTotal,
      previousTotalSpend: previousSpendTotal,
      changePercent: safePercentChange(currentSpendTotal, previousSpendTotal),
      representedBrandCount: brandBreakdown.length,
      buckets: trend.buckets,
    },
    brandSpendBreakdown: brandBreakdown,
    brandSov,
    activeCampaigns: activeCampaignItems,
    channelSplit,
    activeBrands: activeBrandItems,
    reconciliation: {
      totalSpend: currentSpendTotal,
      chartTotal,
      brandBreakdownTotal: brandTotal,
      channelSplitTotal: channelTotal,
      detectedAdsCostTotal: currentSpendTotal,
    },
    states: {
      isEmpty: currentDetections.length === 0,
      emptyReason: currentDetections.length === 0 ? "No TV spend found for the selected filters." : null,
    },
  };
}

export async function getTvOverview(rawFilters?: Partial<TvFilters>) {
  return getTvAnalytics(rawFilters);
}

export async function getTvDetectedAds(
  rawFilters?: Partial<TvDetectedAdsFilters> & { search?: string },
): Promise<TvDetectedAdsResponse> {
  const filters = normalizeDetectedAdsFilters(rawFilters);
  const { previousStart } = getPreviousPeriodRange(filters.start, filters.end);
  const previousSeedStart = formatIsoDate(previousStart);
  const dataset = await loadTvDataset(previousSeedStart, filters.endDate);
  validateDateBounds(filters, dataset.dateBounds);

  const brandsById = new Map(dataset.brands.map((brand) => [brand.id, brand]));
  const channelsById = new Map(dataset.channels.map((channel) => [channel.id, channel]));
  const campaignsById = new Map(dataset.campaigns.map((campaign) => [campaign.id, campaign]));

  let items = dataset.detections.filter((row) => matchesSharedFilters(row, filters)).map((row) => {
    const brand = row.brandId ? brandsById.get(row.brandId) : null;
    const campaign = row.campaignId ? campaignsById.get(row.campaignId) : null;
    const channel = channelsById.get(row.channelId);
    const parts = getBaghdadDateTimeParts(row.detectedAt);
    return {
      id: row.id,
      channelName: channel?.name ?? "Unknown channel",
      channelSlug: channel?.slug ?? "",
      genre: channel?.genre ?? row.genre,
      date: `${parts.day}/${parts.month}/${parts.year}`,
      time: `${parts.hour}:${parts.minute} ${parts.dayPeriod}`,
      month: new Intl.DateTimeFormat("en-US", { timeZone: DEFAULT_TIMEZONE, month: "long", year: "numeric" }).format(new Date(row.detectedAt)),
      brandName: brand?.name ?? "Unknown brand",
      daypart: row.daypart,
      language: row.language,
      durationSeconds: Math.round(row.durationSeconds),
      copyName: row.copyName,
      cost: row.cost,
      sovPercentage: 0,
      previewUrl: row.creativeUrl ?? DEMO_PREVIEW_URL,
      previewPosterUrl: row.previewPosterUrl ?? DEMO_PREVIEW_POSTER,
      isDemoMedia: !row.isUploadedAsset,
      isUploadedAsset: row.isUploadedAsset,
      campaignName: campaign?.name ?? null,
      sortDetectedAt: row.detectedAt,
    } satisfies TvDetectedAd;
  });

  const totalCost = sumMoney(items.map((item) => item.cost));
  items = items.map((item) => ({
    ...item,
    sovPercentage: calculateDetectedAdSov(item.cost, totalCost),
  }));

  const searchTerm = filters.search.trim().toLowerCase();
  if (searchTerm) {
    items = items.filter((item) =>
      [
        item.channelName,
        item.brandName,
        item.campaignName,
        item.copyName,
        item.genre,
        item.language,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchTerm)),
    );
  }

  items.sort((left, right) => {
    const uploadedBias =
      left.isUploadedAsset !== right.isUploadedAsset && filters.sortBy === "detected_at" && filters.sortDirection === "desc"
        ? (left.isUploadedAsset ? -1 : 1)
        : 0;
    if (uploadedBias !== 0) return uploadedBias;

    if (filters.sortBy === "brand") {
      const compare = left.brandName.localeCompare(right.brandName);
      return filters.sortDirection === "asc" ? compare : -compare;
    }
    if (filters.sortBy === "channel") {
      const compare = left.channelName.localeCompare(right.channelName);
      return filters.sortDirection === "asc" ? compare : -compare;
    }
    if (filters.sortBy === "duration") {
      return filters.sortDirection === "asc"
        ? left.durationSeconds - right.durationSeconds
        : right.durationSeconds - left.durationSeconds;
    }
    if (filters.sortBy === "cost") {
      return filters.sortDirection === "asc" ? left.cost - right.cost : right.cost - left.cost;
    }
    if (filters.sortBy === "sov") {
      return filters.sortDirection === "asc"
        ? left.sovPercentage - right.sovPercentage
        : right.sovPercentage - left.sovPercentage;
    }

    return filters.sortDirection === "asc"
      ? left.sortDetectedAt.localeCompare(right.sortDetectedAt)
      : right.sortDetectedAt.localeCompare(left.sortDetectedAt);
  });

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / filters.pageSize));
  const page = Math.min(filters.page, totalPages);
  const startIndex = (page - 1) * filters.pageSize;
  const pagedItems = items.slice(startIndex, startIndex + filters.pageSize);

  return {
    items: pagedItems,
    pagination: {
      page,
      pageSize: filters.pageSize,
      totalItems,
      totalPages,
    },
    totals: {
      filteredCost: totalCost,
    },
  };
}

export { parseDetectedAdsFiltersFromSearchParams };
