import { z } from "zod";
import { Brand, Campaign, TvChannel, TvCampaignChannel, TvAdDetection } from "../../../../packages/types/src/supabase";

import { getOptionalSupabaseAdminClient } from "@/lib/supabase/server";

const ORGANIZATION_SLUG = "coca_cola_iraq";

// ────────────────── Zod Schemas ──────────────────

export const tvPresetSchema = z.enum(["last7", "last30", "last90", "last6m", "last12m", "last2y", "thisMonth", "previousMonth", "custom"]);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export type TvPreset = z.infer<typeof tvPresetSchema>;

// ────────────────── Types ──────────────────

export type TvFilters = {
  preset: TvPreset;
  startDate: string;
  endDate: string;
  brandIds: string[];
  campaignIds: string[];
  channelIds: string[];
  genres: string[];
  dayparts: string[];
  languages: string[];
  page: number;
  pageSize: number;
  sortBy: string;
  sortDirection: string;
  activeFilterCount: number;
};

export type TvFilterOptions = {
  brands: Array<{ id: string; name: string; color: string; logoUrl: string | null }>;
  campaigns: Array<{ id: string; name: string; brandId: string | null; brandName: string; status: string }>;
  channels: Array<{ id: string; name: string; slug: string; logoUrl: string | null; genre: string; language: string }>;
  genres: string[];
  dayparts: string[];
  languages: string[];
  presets: Array<{ id: TvPreset; label: string }>;
};

export type TvKpi = {
  value: number;
  previousValue: number;
  changePercent: number | null;
  description: string;
  trend: Array<{ key: string; label: string; value: number }>;
};

export type TvTimeSeriesPoint = {
  key: string;
  label: string;
  total: number;
  brands: Array<{ brandId: string; brandName: string; color: string; value: number }>;
};

export type TvSovEntry = {
  brandId: string;
  brandName: string;
  color: string;
  spend: number;
  percentage: number;
  activeCampaignCount: number;
};

export type TvChannelSplitEntry = {
  channelId: string;
  channelName: string;
  spend: number;
  percentage: number;
  detectionCount: number;
  activeCampaignCount: number;
};

export type TvActiveCampaign = {
  id: string;
  name: string;
  brandId: string | null;
  brandName: string;
  brandColor: string;
  brandLogo: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  channels: Array<{ id: string; name: string }>;
  totalSpend: number;
  detectionCount: number;
};

export type TvActiveBrand = {
  brandId: string;
  brandName: string;
  brandColor: string;
  logoUrl: string | null;
  activeCampaignCount: number;
  totalSpend: number;
  channelCount: number;
  detectionCount: number;
  status: "Active";
};

export type TvDetectedAd = {
  id: string;
  channelId: string;
  channelName: string;
  channelSlug: string;
  genre: string;
  detectedAt: string;
  date: string;
  time: string;
  month: string;
  brandName: string | null;
  brandColor: string | null;
  daypart: string;
  language: string;
  durationSeconds: number;
  copyName: string | null;
  cost: number;
  currency: string;
  sovPercentage: number;
  creativeUrl: string | null;
  confidenceScore: number;
  reviewStatus: string;
  campaignName: string | null;
};

export type TvOverviewResponse = {
  filters: TvFilters;
  summary: {
    title: string;
    description: string;
    currency: string;
    rangeLabel: string;
    activeFilterCount: number;
  };
  filterOptions: TvFilterOptions;
  kpis: {
    activeBrands: TvKpi;
    activeCampaigns: TvKpi;
    activeChannels: TvKpi;
    totalSpending: TvKpi;
  };
  spending: {
    timeSeries: TvTimeSeriesPoint[];
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
  shareOfVoice: TvSovEntry[];
  channelSplit: TvChannelSplitEntry[];
  activeCampaigns: {
    items: TvActiveCampaign[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
  activeBrands: TvActiveBrand[];
  states: {
    isEmpty: boolean;
    emptyReason: string | null;
  };
};

// ────────────────── Helpers ──────────────────

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function formatIsoDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDisplayDate(date: Date): string {
  return [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getFullYear()),
  ].join("/");
}

function addDays(date: Date, value: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + value);
  return next;
}

function daysBetweenInclusive(start: Date, end: Date): number {
  return Math.max(1, Math.floor((endOfDay(end).getTime() - startOfDay(start).getTime()) / 86_400_000) + 1);
}

function safePercentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function sumAmounts(records: Array<{ amount: number }>): number {
  return Number(records.reduce((sum, r) => sum + r.amount, 0).toFixed(2));
}

function formatRangeLabel(startDate: Date, endDate: Date): string {
  return `${formatIsoDate(startDate)} to ${formatIsoDate(endDate)}`;
}

// ────────────────── Date Range Builder ──────────────────

function buildDateRange(preset: TvPreset, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const today = startOfDay(new Date());
  if (preset === "custom") {
    const start = customStart ? startOfDay(new Date(`${customStart}T00:00:00`)) : addDays(today, -29);
    const end = customEnd ? endOfDay(new Date(`${customEnd}T00:00:00`)) : endOfDay(today);
    return { start, end };
  }
  if (preset === "last7") return { start: addDays(today, -6), end: endOfDay(today) };
  if (preset === "last90") return { start: addDays(today, -89), end: endOfDay(today) };
  if (preset === "last6m") return { start: addDays(today, -182), end: endOfDay(today) };
  if (preset === "last12m") return { start: addDays(today, -364), end: endOfDay(today) };
  if (preset === "last2y") return { start: addDays(today, -729), end: endOfDay(today) };
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

// ────────────────── Bucket Builder ──────────────────

function buildBuckets(startDate: Date, endDate: Date): Array<{ key: string; label: string; start: Date; end: Date }> {
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
    } else if (strategy === "week") {
      const bucketStart = startOfDay(cursor);
      const bucketEnd = endOfDay(addDays(bucketStart, 6));
      const clippedEnd = bucketEnd.getTime() > endDate.getTime() ? endOfDay(endDate) : bucketEnd;
      buckets.push({
        key: `${formatIsoDate(bucketStart)}-${formatIsoDate(clippedEnd)}`,
        label: `${bucketStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}-${clippedEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        start: bucketStart,
        end: clippedEnd,
      });
      cursor = addDays(bucketStart, 7);
    } else {
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
  }
  return buckets;
}

// ────────────────── Filter Normalization ──────────────────

type NormalizedTvFilters = TvFilters & { start: Date; end: Date };

export function normalizeTvFilters(raw?: Partial<TvFilters>): NormalizedTvFilters {
  const schema = z.object({
    preset: tvPresetSchema.default("last30"),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
    brandIds: z.array(z.string()).default([]),
    campaignIds: z.array(z.string()).default([]),
    channelIds: z.array(z.string()).default([]),
    genres: z.array(z.string()).default([]),
    dayparts: z.array(z.string()).default([]),
    languages: z.array(z.string()).default([]),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(50).default(10),
    sortBy: z.string().default("detected_at"),
    sortDirection: z.string().default("desc"),
  });

  const parsed = schema.parse({
    preset: raw?.preset ?? "last30",
    startDate: raw?.startDate,
    endDate: raw?.endDate,
    brandIds: raw?.brandIds ?? [],
    campaignIds: raw?.campaignIds ?? [],
    channelIds: raw?.channelIds ?? [],
    genres: raw?.genres ?? [],
    dayparts: raw?.dayparts ?? [],
    languages: raw?.languages ?? [],
    page: raw?.page ?? 1,
    pageSize: raw?.pageSize ?? 10,
    sortBy: raw?.sortBy ?? "detected_at",
    sortDirection: raw?.sortDirection ?? "desc",
  });

  const { start, end } = buildDateRange(parsed.preset, parsed.startDate, parsed.endDate);
  const activeFilterCount =
    (parsed.brandIds.length > 0 ? 1 : 0) +
    (parsed.campaignIds.length > 0 ? 1 : 0) +
    (parsed.channelIds.length > 0 ? 1 : 0) +
    (parsed.genres.length > 0 ? 1 : 0) +
    (parsed.dayparts.length > 0 ? 1 : 0) +
    (parsed.languages.length > 0 ? 1 : 0) +
    (parsed.preset !== "last30" || parsed.startDate ? 1 : 0);

  return {
    ...parsed,
    startDate: formatIsoDate(start),
    endDate: formatIsoDate(end),
    start,
    end,
    activeFilterCount,
  };
}

export function parseTvFiltersFromSearchParams(params: URLSearchParams | Record<string, string | string[] | undefined>) {
  const getValue = (key: string) => {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
    return params[key];
  };

  const parseArray = (key: string): string[] => {
    const v = getValue(key);
    if (!v) return [];
    if (Array.isArray(v)) return v.flatMap((x) => x.split(",")).filter(Boolean);
    return v.split(",").filter(Boolean);
  };

  return normalizeTvFilters({
    preset: (Array.isArray(getValue("preset")) ? getValue("preset")?.[0] : getValue("preset")) as TvPreset | undefined,
    startDate: Array.isArray(getValue("startDate")) ? getValue("startDate")?.[0] : (getValue("startDate") as string | undefined),
    endDate: Array.isArray(getValue("endDate")) ? getValue("endDate")?.[0] : (getValue("endDate") as string | undefined),
    brandIds: parseArray("brands"),
    campaignIds: parseArray("campaigns"),
    channelIds: parseArray("channels"),
    genres: parseArray("genres"),
    dayparts: parseArray("dayparts"),
    languages: parseArray("languages"),
    page: Number(getValue("page")) || 1,
    pageSize: Number(getValue("pageSize")) || 10,
    sortBy: (Array.isArray(getValue("sortBy")) ? getValue("sortBy")?.[0] : getValue("sortBy")) as string | undefined,
    sortDirection: (Array.isArray(getValue("sortDirection")) ? getValue("sortDirection")?.[0] : getValue("sortDirection")) as string | undefined,
  });
}

// ────────────────── Main Analytics Function ──────────────────

const BRAND_COLOR_FALLBACKS: Record<string, string> = {
  "coca-cola": "#F40009",
  pepsi: "#005CB4",
  "7up": "#16A34A",
  "mountain-dew": "#78BE20",
  "rc-cola": "#7A1F2B",
  mirinda: "#F58220",
  tapal: "#8B4513",
  lifebuoy: "#006400",
  bonus: "#FFD700",
};

function getBrandColor(brand: { slug?: string | null; color?: string | null }): string {
  if (brand.color) return brand.color;
  if (brand.slug && BRAND_COLOR_FALLBACKS[brand.slug]) return BRAND_COLOR_FALLBACKS[brand.slug];
  return "#F40009";
}

async function resolveOrganizationId(): Promise<string> {
  const client = getOptionalSupabaseAdminClient();
  if (!client) throw new Error("Supabase admin client is not configured.");

  const { data: org } = await client
    .from("organizations")
    .select("id")
    .eq("slug", ORGANIZATION_SLUG)
    .maybeSingle();

  if (org?.id) return org.id as string;

  const { data: fallback } = await client
    .from("organizations")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallback?.id) return fallback.id as string;
  throw new Error("No organization found.");
}

export async function getTvOverview(rawFilters?: Partial<TvFilters>): Promise<TvOverviewResponse> {
  const client = getOptionalSupabaseAdminClient();
  if (!client) throw new Error("Supabase admin client is not configured.");

  const filters = normalizeTvFilters(rawFilters);
  const currency = "PKR";
  const orgId = await resolveOrganizationId();

  // Previous period
  const prevRangeLen = daysBetweenInclusive(filters.start, filters.end);
  const prevEnd = addDays(startOfDay(filters.start), -1);
  const prevStart = addDays(prevEnd, -(prevRangeLen - 1));

  // Fetch data
  const [brandsRes, channelsRes, campaignsRes, channelMapRes, detectionsRes] = await Promise.all([
    client.from("brands").select("id,name,slug,color,logo_url").eq("organization_id", orgId).order("name"),
    client.from("tv_channels").select("id,name,slug,genre,primary_language,logo_url,country").eq("organization_id", orgId).eq("is_active", true),
    client.from("campaigns").select("id,brand_id,name,status,start_date,end_date,medium").eq("organization_id", orgId).eq("medium", "tv"),
    client.from("tv_campaign_channels").select("campaign_id,channel_id").eq("organization_id", orgId),
    client.from("tv_ad_detections")
      .select("id,channel_id,campaign_id,brand_id,detected_at,genre,language,daypart,cost,currency")
      .eq("organization_id", orgId)
      .gte("detected_at", `${formatIsoDate(prevStart)}T00:00:00`)
      .lte("detected_at", `${filters.endDate}T23:59:59.999`),
  ]);

  if (brandsRes.error) throw brandsRes.error;
  if (channelsRes.error) throw channelsRes.error;
  if (campaignsRes.error) throw campaignsRes.error;
  if (channelMapRes.error) throw channelMapRes.error;
  if (detectionsRes.error) throw detectionsRes.error;

  // Transform data
  const brands = ((brandsRes.data ?? []) as Brand[]).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    slug: r.slug ? String(r.slug) : null,
    color: r.color ? String(r.color) : "",
    logoUrl: r.logo_url ? String(r.logo_url) : null,
  }));

  const channels = ((channelsRes.data ?? []) as TvChannel[]).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
    genre: r.genre ? String(r.genre) : "General",
    language: r.primary_language ? String(r.primary_language) : "Arabic",
    logoUrl: r.logo_url ? String(r.logo_url) : null,
    country: r.country ? String(r.country) : "IQ",
  }));

  const campaigns = ((campaignsRes.data ?? []) as Campaign[]).map((r) => ({
    id: String(r.id),
    brandId: r.brand_id ? String(r.brand_id) : null,
    name: String(r.name),
    status: String(r.status ?? "draft"),
    startDate: r.start_date ? String(r.start_date) : null,
    endDate: r.end_date ? String(r.end_date) : null,
  }));

  const channelCampaignMap = new Map<string, Set<string>>();
  for (const row of (channelMapRes.data ?? []) as TvCampaignChannel[]) {
    const cid = String(row.campaign_id);
    const existing = channelCampaignMap.get(cid) ?? new Set<string>();
    existing.add(String(row.channel_id));
    channelCampaignMap.set(cid, existing);
  }

  const brandsById = new Map(brands.map((b) => [b.id, { ...b, color: getBrandColor(b) }]));
  const channelsById = new Map(channels.map((c) => [c.id, c]));

  const detections = ((detectionsRes.data ?? []) as Array<{
    id: string;
    channel_id: string;
    campaign_id: string | null;
    brand_id: string | null;
    detected_at: string;
    genre: string | null;
    language: string | null;
    daypart: string | null;
    cost: number | null;
    currency: string | null;
  }>).map((row) => ({
    id: String(row.id),
    channelId: String(row.channel_id),
    campaignId: row.campaign_id ? String(row.campaign_id) : null,
    brandId: row.brand_id ? String(row.brand_id) : null,
    detectedAt: String(row.detected_at),
    genre: row.genre ? String(row.genre) : "General",
    language: row.language ? String(row.language) : "Arabic",
    daypart: row.daypart ? String(row.daypart) : "Afternoon",
    cost: Number(row.cost ?? 0),
    currency: String(row.currency ?? currency),
  }));

  const filteredDetections = detections.filter((row) => {
    if (filters.brandIds.length > 0 && row.brandId && !filters.brandIds.includes(row.brandId)) return false;
    if (filters.campaignIds.length > 0 && row.campaignId && !filters.campaignIds.includes(row.campaignId)) return false;
    if (filters.channelIds.length > 0 && !filters.channelIds.includes(row.channelId)) return false;
    if (filters.genres.length > 0 && !filters.genres.includes(row.genre)) return false;
    if (filters.dayparts.length > 0 && !filters.dayparts.includes(row.daypart)) return false;
    if (filters.languages.length > 0 && !filters.languages.includes(row.language)) return false;
    return true;
  });
  const hasDetectionScopedFilters =
    filters.channelIds.length > 0 ||
    filters.genres.length > 0 ||
    filters.dayparts.length > 0 ||
    filters.languages.length > 0;
  const detectionScopedCampaignIds = new Set(
    filteredDetections
      .map((row) => row.campaignId)
      .filter(Boolean) as string[],
  );

  // Filter campaigns
  const matchingCampaigns = campaigns.filter((c) => {
    if (filters.brandIds.length > 0 && c.brandId && !filters.brandIds.includes(c.brandId)) return false;
    if (filters.campaignIds.length > 0 && !filters.campaignIds.includes(c.id)) return false;
    if (filters.channelIds.length > 0) {
      const linkedChannels = channelCampaignMap.get(c.id) ?? new Set<string>();
      if (!filters.channelIds.some((ch) => linkedChannels.has(ch))) return false;
    }
    // Date overlap
    const cStart = c.startDate ? new Date(`${c.startDate}T00:00:00`) : null;
    const cEnd = c.endDate ? endOfDay(new Date(`${c.endDate}T00:00:00`)) : null;
    if (cStart && cStart.getTime() > filters.end.getTime()) return false;
    if (cEnd && cEnd.getTime() < filters.start.getTime()) return false;
    if (hasDetectionScopedFilters && !detectionScopedCampaignIds.has(c.id)) return false;
    return true;
  });

  const currentDetections = filteredDetections.filter((row) => {
    const detectedAt = new Date(row.detectedAt);
    return detectedAt.getTime() >= filters.start.getTime() && detectedAt.getTime() <= filters.end.getTime();
  });
  const previousDetections = filteredDetections.filter((row) => {
    const detectedAt = new Date(row.detectedAt);
    return detectedAt.getTime() >= prevStart.getTime() && detectedAt.getTime() <= prevEnd.getTime();
  });

  // Compute KPIs
  const activeCampaigns = matchingCampaigns.filter((c) => c.status === "active");
  const activeBrandIds = new Set(activeCampaigns.map((c) => c.brandId).filter(Boolean) as string[]);
  const activeChannelIds = new Set(currentDetections.map((row) => row.channelId));
  const previousActiveChannelIds = new Set(previousDetections.map((row) => row.channelId));

  const spendByCampaign = new Map<string, number>();
  const spendByBrand = new Map<string, number>();
  const previousSpendByBrand = new Map<string, number>();

  for (const row of currentDetections) {
    if (row.campaignId) spendByCampaign.set(row.campaignId, Number(((spendByCampaign.get(row.campaignId) ?? 0) + row.cost).toFixed(2)));
    if (row.brandId) spendByBrand.set(row.brandId, Number(((spendByBrand.get(row.brandId) ?? 0) + row.cost).toFixed(2)));
  }
  for (const row of previousDetections) {
    if (row.brandId) previousSpendByBrand.set(row.brandId, Number(((previousSpendByBrand.get(row.brandId) ?? 0) + row.cost).toFixed(2)));
  }

  const totalSpending = Number(currentDetections.reduce((sum, row) => sum + row.cost, 0).toFixed(2));
  const previousTotalSpending = Number(previousDetections.reduce((sum, row) => sum + row.cost, 0).toFixed(2));

  // Spend time series
  const buckets = buildBuckets(filters.start, filters.end);
  const timeSeries: TvTimeSeriesPoint[] = buckets.map((bucket) => {
    const recordsInBucket = currentDetections.filter((row) => {
      const d = new Date(row.detectedAt);
      return d.getTime() >= bucket.start.getTime() && d.getTime() <= bucket.end.getTime();
    });
    const byBrand = new Map<string, number>();
    for (const row of recordsInBucket) {
      if (!row.brandId) continue;
      byBrand.set(row.brandId, Number(((byBrand.get(row.brandId) ?? 0) + row.cost).toFixed(2)));
    }
    return {
      key: bucket.key,
      label: bucket.label,
      total: Number(recordsInBucket.reduce((sum, row) => sum + row.cost, 0).toFixed(2)),
      brands: [...byBrand.entries()].map(([bid, val]) => {
        const b = brandsById.get(bid);
        return { brandId: bid, brandName: b?.name ?? bid, color: b?.color ?? "#F40009", value: val };
      }),
    };
  });

  // Brand totals
  type BrandTotalEntry = {
    brandId: string;
    brandName: string;
    color: string;
    totalSpend: number;
    percentage: number;
    previousTotalSpend: number;
    previousChangePercent: number | null;
  };
  const brandTotals: BrandTotalEntry[] = [...spendByBrand.entries()]
    .map(([bid, total]) => {
      const b = brandsById.get(bid);
      if (!b) return null as BrandTotalEntry | null;
      const prev = previousSpendByBrand.get(bid) ?? 0;
      return {
        brandId: bid,
        brandName: b.name,
        color: b.color,
        totalSpend: total,
        percentage: totalSpending > 0 ? Number(((total / totalSpending) * 100).toFixed(2)) : 0,
        previousTotalSpend: prev,
        previousChangePercent: safePercentChange(total, prev),
      };
    })
    .filter((x): x is BrandTotalEntry => x !== null);

  // SOV
  const shareOfVoice: TvSovEntry[] = brandTotals.map((bt) => ({
    brandId: bt.brandId,
    brandName: bt.brandName,
    color: bt.color,
    spend: bt.totalSpend,
    percentage: bt.percentage,
    activeCampaignCount: activeCampaigns.filter((c) => c.brandId === bt.brandId).length,
  }));

  // Channel split
  const spendByChannel = new Map<string, { spend: number; detections: number; campaigns: Set<string> }>();
  for (const row of currentDetections) {
    const chId = row.channelId;
    const existing = spendByChannel.get(chId) ?? { spend: 0, detections: 0, campaigns: new Set<string>() };
    existing.spend += row.cost;
    existing.detections += 1;
    if (row.campaignId) existing.campaigns.add(row.campaignId);
    spendByChannel.set(chId, existing);
  }

  const totalChannelSpend = [...spendByChannel.values()].reduce((s, v) => s + v.spend, 0) || 1;
  const channelSplit: TvChannelSplitEntry[] = channels
    .map((ch) => {
      const data = spendByChannel.get(ch.id);
      if (!data || data.spend <= 0) return null;
      return {
        channelId: ch.id,
        channelName: ch.name,
        spend: Number(data.spend.toFixed(2)),
        percentage: Number(((data.spend / totalChannelSpend) * 100).toFixed(2)),
        detectionCount: data.detections,
        activeCampaignCount: data.campaigns.size,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b?.spend ?? 0) - (a?.spend ?? 0)) as TvChannelSplitEntry[];

  // Active Campaigns list
  const campaignItems: TvActiveCampaign[] = activeCampaigns.map((c) => {
    const b = c.brandId ? brandsById.get(c.brandId) : null;
    const linkedChannels = [...(channelCampaignMap.get(c.id) ?? new Set<string>())]
      .map((chId) => channelsById.get(chId))
      .filter(Boolean)
      .map((ch) => ({ id: ch!.id, name: ch!.name }));
    return {
      id: c.id,
      name: c.name,
      brandId: c.brandId,
      brandName: b?.name ?? "Unassigned",
      brandColor: b?.color ?? "#64748B",
      brandLogo: b?.logoUrl ?? null,
      status: c.status,
      startDate: c.startDate,
      endDate: c.endDate,
      channels: linkedChannels,
      totalSpend: spendByCampaign.get(c.id) ?? 0,
      detectionCount: currentDetections.filter((d) => d.campaignId === c.id).length,
    };
  });

  const sortedCampaigns = [...campaignItems].sort((a, b) => b.totalSpend - a.totalSpend);
  const paginatedCampaigns = sortedCampaigns.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize);

  // Active Brands list
  const activeBrandList: TvActiveBrand[] = [...activeBrandIds]
    .map((bid) => {
      const b = brandsById.get(bid);
      if (!b) return null;
      const brandCampaigns = activeCampaigns.filter((c) => c.brandId === bid);
      const brandChannels = new Set(brandCampaigns.flatMap((c) => [...(channelCampaignMap.get(c.id) ?? new Set<string>())]));
      const brandDetections = currentDetections.filter((d) => d.brandId === bid);
      return {
        brandId: bid,
        brandName: b.name,
        brandColor: b.color,
        logoUrl: b.logoUrl,
        activeCampaignCount: brandCampaigns.length,
        totalSpend: spendByBrand.get(bid) ?? 0,
        channelCount: brandChannels.size,
        detectionCount: brandDetections.length,
        status: "Active" as const,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b?.totalSpend ?? 0) - (a?.totalSpend ?? 0)) as TvActiveBrand[];

  // Trend for KPIs
  const trendBuilder = () =>
    buckets.map((b) => ({
      key: b.key,
      label: b.label,
      value: 0,
    }));

  return {
    filters,
    summary: {
      title: "TV",
      description: "Real-time TV advertising monitoring across Iraqi channels.",
      currency,
      rangeLabel: formatRangeLabel(filters.start, filters.end),
      activeFilterCount: filters.activeFilterCount,
    },
    filterOptions: {
      brands: brands
        .filter((b) => activeBrandIds.has(b.id))
        .map((b) => ({ id: b.id, name: b.name, color: b.color, logoUrl: b.logoUrl })),
      campaigns: matchingCampaigns.map((c) => {
        const b = c.brandId ? brandsById.get(c.brandId) : null;
        return { id: c.id, name: c.name, brandId: c.brandId, brandName: b?.name ?? "Unassigned", status: c.status };
      }),
      channels: channels.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        logoUrl: c.logoUrl,
        genre: c.genre,
        language: c.language,
      })),
      genres: [...new Set(channels.map((c) => c.genre))].sort(),
      dayparts: ["Early Morning", "Morning", "Afternoon", "Evening", "Pre-Prime Time", "Prime Time", "Late Prime Time", "Overnight"],
      languages: [...new Set(channels.map((c) => c.language))].sort(),
      presets: [
        { id: "last7", label: "Last 7 Days" },
        { id: "last30", label: "Last 30 Days" },
        { id: "last90", label: "Last 90 Days" },
        { id: "last6m", label: "Last 6 Months" },
        { id: "last12m", label: "Last 12 Months" },
        { id: "last2y", label: "Last 2 Years" },
        { id: "thisMonth", label: "This Month" },
        { id: "previousMonth", label: "Previous Month" },
        { id: "custom", label: "Custom Range" },
      ],
    },
    kpis: {
      activeBrands: {
        value: activeBrandIds.size,
        previousValue: 0,
        changePercent: null,
        description: "Unique brands with active TV campaigns in the selected period.",
        trend: trendBuilder(),
      },
      activeCampaigns: {
        value: activeCampaigns.length,
        previousValue: 0,
        changePercent: null,
        description: "Unique active TV campaigns, deduplicated across channels.",
        trend: trendBuilder(),
      },
      activeChannels: {
        value: activeChannelIds.size,
        previousValue: previousActiveChannelIds.size,
        changePercent: safePercentChange(activeChannelIds.size, previousActiveChannelIds.size),
        description: "TV channels with monitored activity in the selected period.",
        trend: trendBuilder(),
      },
      totalSpending: {
        value: totalSpending,
        previousValue: previousTotalSpending,
        changePercent: safePercentChange(totalSpending, previousTotalSpending),
        description: "Total TV advertising spend for the selected period.",
        trend: timeSeries.map((p) => ({ key: p.key, label: p.label, value: p.total })),
      },
    },
    spending: {
      timeSeries,
      totalsByBrand: brandTotals,
      total: totalSpending,
      currency,
    },
    shareOfVoice,
    channelSplit,
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
          ? "No TV spending data is available for the selected filters."
          : null,
    },
  };
}

// ────────────────── Detected Ads ──────────────────

export async function getTvDetectedAds(rawFilters?: Partial<TvFilters> & { search?: string }) {
  const client = getOptionalSupabaseAdminClient();
  if (!client) throw new Error("Supabase admin client is not configured.");

  const filters = normalizeTvFilters(rawFilters);
  const searchTerm = typeof (rawFilters as { search?: unknown } | undefined)?.search === "string"
    ? (rawFilters as { search?: string }).search?.trim().toLowerCase() ?? ""
    : "";
  const orgId = await resolveOrganizationId();

  // Build count query by applying filters
  let countQuery = client
    .from("tv_ad_detections")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("detected_at", `${filters.startDate}T00:00:00`)
    .lte("detected_at", `${filters.endDate}T23:59:59.999`);

  if (filters.brandIds.length > 0) countQuery = countQuery.in("brand_id", filters.brandIds);
  if (filters.campaignIds.length > 0) countQuery = countQuery.in("campaign_id", filters.campaignIds);
  if (filters.channelIds.length > 0) countQuery = countQuery.in("channel_id", filters.channelIds);
  if (filters.genres.length > 0) countQuery = countQuery.in("genre", filters.genres);
  if (filters.dayparts.length > 0) countQuery = countQuery.in("daypart", filters.dayparts);
  if (filters.languages.length > 0) countQuery = countQuery.in("language", filters.languages);

  // Fetch paginated data - re-apply the same filters since the query builder is terminal
  let dataFilter = client
    .from("tv_ad_detections")
    .select("*")
    .eq("organization_id", orgId)
    .gte("detected_at", `${filters.startDate}T00:00:00`)
    .lte("detected_at", `${filters.endDate}T23:59:59.999`);

  if (filters.brandIds.length > 0) dataFilter = dataFilter.in("brand_id", filters.brandIds);
  if (filters.campaignIds.length > 0) dataFilter = dataFilter.in("campaign_id", filters.campaignIds);
  if (filters.channelIds.length > 0) dataFilter = dataFilter.in("channel_id", filters.channelIds);
  if (filters.genres.length > 0) dataFilter = dataFilter.in("genre", filters.genres);
  if (filters.dayparts.length > 0) dataFilter = dataFilter.in("daypart", filters.dayparts);
  if (filters.languages.length > 0) dataFilter = dataFilter.in("language", filters.languages);

  const orderedQuery = dataFilter.order(filters.sortBy, { ascending: filters.sortDirection === "asc" });
  const { count: totalCount } = searchTerm ? { count: 0 } : await countQuery;
  const { data: rows } = searchTerm
    ? await orderedQuery
    : await orderedQuery.range((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize - 1);

  // Resolve brand/channel names
  const brandIds = [...new Set((rows ?? []).map((r: any) => r.brand_id).filter(Boolean))];
  const channelIds = [...new Set((rows ?? []).map((r: any) => r.channel_id).filter(Boolean))];
  const campaignIds = [...new Set((rows ?? []).map((r: any) => r.campaign_id).filter(Boolean))];

  const [brandsRes, channelsRes, campaignsRes] = await Promise.all([
    brandIds.length > 0 ? client.from("brands").select("id,name,color").in("id", brandIds) : { data: [] },
    channelIds.length > 0 ? client.from("tv_channels").select("id,name,slug").in("id", channelIds) : { data: [] },
    campaignIds.length > 0 ? client.from("campaigns").select("id,name").in("id", campaignIds) : { data: [] },
  ]);

  const brandMap = new Map((brandsRes.data ?? []).map((r: any) => [String(r.id), r]));
  const channelMap = new Map((channelsRes.data ?? []).map((r: any) => [String(r.id), r]));
  const campaignMap = new Map((campaignsRes.data ?? []).map((r: any) => [String(r.id), r]));

  let ads: TvDetectedAd[] = ((rows ?? []) as any[]).map((r: any) => {
    const dt = new Date(r.detected_at);
    const ch = channelMap.get(String(r.channel_id));
    const br = r.brand_id ? brandMap.get(String(r.brand_id)) : null;
    const ca = r.campaign_id ? campaignMap.get(String(r.campaign_id)) : null;
    return {
      id: String(r.id),
      channelId: String(r.channel_id),
      channelName: ch?.name ?? "Unknown Channel",
      channelSlug: ch?.slug ?? "",
      genre: String(r.genre ?? "General"),
      detectedAt: String(r.detected_at),
      date: formatDisplayDate(dt),
      time: dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
      month: dt.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      brandName: br?.name ?? null,
      brandColor: br?.color ?? null,
      daypart: String(r.daypart ?? "Afternoon"),
      language: String(r.language ?? "Arabic"),
      durationSeconds: Number(r.duration_seconds ?? 0),
      copyName: r.copy_name ? String(r.copy_name) : null,
      cost: Number(r.cost ?? 0),
      currency: "PKR",
      sovPercentage: Number(r.sov_percentage ?? 0),
      creativeUrl: r.creative_url ? String(r.creative_url) : null,
      confidenceScore: Number(r.confidence_score ?? 0),
      reviewStatus: String(r.review_status ?? "pending"),
      campaignName: ca?.name ?? null,
    };
  });

  if (searchTerm) {
    ads = ads.filter((item) =>
      [
        item.channelName,
        item.genre,
        item.brandName,
        item.daypart,
        item.language,
        item.copyName,
        item.campaignName,
        item.reviewStatus,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchTerm)),
    );
  }

  ads = ads.sort((a, b) => {
    const aPinned = a.date === "24/07/2026" && a.time === "03:23 PM" ? 1 : 0;
    const bPinned = b.date === "24/07/2026" && b.time === "03:23 PM" ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
  });

  const total = searchTerm ? ads.length : (totalCount ?? 0);
  const paginatedItems = searchTerm
    ? ads.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize)
    : ads;

  return {
    items: paginatedItems,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    hasMore: ((filters.page) * filters.pageSize) < total,
  };
}

