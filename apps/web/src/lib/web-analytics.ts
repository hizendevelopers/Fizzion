/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import { getOptionalSupabaseAdminClient } from "@/lib/supabase/server";

const ORGANIZATION_SLUG = "coca_cola_iraq";

// ────────────────── Zod Schemas ──────────────────

export const webPresetSchema = z.enum(["last7", "last30", "last90", "thisMonth", "previousMonth", "custom"]);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export type WebPreset = z.infer<typeof webPresetSchema>;

// ────────────────── Types ──────────────────

export type WebFilters = {
  preset: WebPreset;
  startDate: string;
  endDate: string;
  brandIds: string[];
  campaignIds: string[];
  websiteIds: string[];
  languages: string[];
  adFormats: string[];
  pageTypes: string[];
  statuses: string[];
  page: number;
  pageSize: number;
  sortBy: string;
  sortDirection: string;
  activeFilterCount: number;
};

export type WebFilterOptions = {
  brands: Array<{ id: string; name: string; color: string; logoUrl: string | null }>;
  campaigns: Array<{ id: string; name: string; brandId: string | null; brandName: string; status: string }>;
  websites: Array<{ id: string; name: string; domain: string; logoUrl: string | null; language: string; category: string }>;
  languages: string[];
  adFormats: string[];
  pageTypes: string[];
  statuses: string[];
  presets: Array<{ id: WebPreset; label: string }>;
};

export type WebKpi = {
  value: number;
  previousValue: number;
  changePercent: number | null;
  description: string;
  trend: Array<{ key: string; label: string; value: number }>;
};

export type WebTimeSeriesPoint = {
  key: string;
  label: string;
  total: number;
  brands: Array<{ brandId: string; brandName: string; color: string; value: number }>;
};

export type WebSovEntry = {
  brandId: string;
  brandName: string;
  color: string;
  spend: number;
  percentage: number;
  activeCampaignCount: number;
};

export type WebWebsiteSplitEntry = {
  websiteId: string;
  websiteName: string;
  domain: string;
  spend: number;
  percentage: number;
  detectionCount: number;
  activeCampaignCount: number;
};

export type WebActiveCampaign = {
  id: string;
  name: string;
  brandId: string | null;
  brandName: string;
  brandColor: string;
  brandLogo: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  websites: Array<{ id: string; name: string; domain: string }>;
  totalSpend: number;
  screenshotCount: number;
  detectionCount: number;
};

export type WebActiveBrand = {
  brandId: string;
  brandName: string;
  brandColor: string;
  logoUrl: string | null;
  activeCampaignCount: number;
  totalSpend: number;
  websiteCount: number;
  detectionCount: number;
  status: "Active";
};

export type WebDetection = {
  id: string;
  websiteId: string;
  websiteName: string;
  domain: string;
  pageUrl: string | null;
  capturedAt: string;
  date: string;
  time: string;
  brandName: string | null;
  brandColor: string | null;
  campaignName: string | null;
  adFormat: string | null;
  position: string | null;
  destinationUrl: string | null;
  confidenceScore: number;
  reviewStatus: string;
  spendAmount: number;
  currency: string;
  size: string | null;
  screenshotUrl: string | null;
};

export type WebOverviewResponse = {
  filters: WebFilters;
  summary: {
    title: string;
    description: string;
    currency: string;
    rangeLabel: string;
    activeFilterCount: number;
  };
  filterOptions: WebFilterOptions;
  kpis: {
    activeBrands: WebKpi;
    activeCampaigns: WebKpi;
    totalSpending: WebKpi;
  };
  spending: {
    timeSeries: WebTimeSeriesPoint[];
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
  shareOfVoice: WebSovEntry[];
  websiteSplit: WebWebsiteSplitEntry[];
  activeCampaigns: {
    items: WebActiveCampaign[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
  activeBrands: WebActiveBrand[];
  recentScans: {
    completed: number;
    failed: number;
    total: number;
    lastScanAt: string | null;
  };
  states: {
    isEmpty: boolean;
    emptyReason: string | null;
  };
};

// ────────────────── Helpers (shared with tv-analytics) ──────────────────

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function formatIsoDate(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
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

function normalizeDimensionLabel(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const matched = trimmed.match(/(\d{2,5})\s*[x×]\s*(\d{2,5})/i);
  if (!matched) return trimmed;
  return `${matched[1]} × ${matched[2]}`;
}

function readSizeFromUnknown(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return normalizeDimensionLabel(value);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const width = typeof record.width === "number" ? record.width : typeof record.w === "number" ? record.w : null;
    const height = typeof record.height === "number" ? record.height : typeof record.h === "number" ? record.h : null;
    if (width && height) return `${Math.round(width)} × ${Math.round(height)}`;
    for (const key of ["dimensions", "size", "adSize", "creativeSize"] as const) {
      const nested = readSizeFromUnknown(record[key]);
      if (nested) return nested;
    }
  }
  return null;
}

export function inferWebDetectionSize(row: Record<string, unknown>): string | null {
  for (const key of ["dimensions", "size", "ad_size", "creative_size"] as const) {
    const direct = readSizeFromUnknown(row[key]);
    if (direct) return direct;
  }
  for (const key of ["bounding_box", "boundingBox", "placement_box", "placementBox", "metadata", "media_metadata"] as const) {
    const derived = readSizeFromUnknown(row[key]);
    if (derived) return derived;
  }
  const width = typeof row.width === "number" ? row.width : null;
  const height = typeof row.height === "number" ? row.height : null;
  if (width && height) return `${Math.round(width)} × ${Math.round(height)}`;
  return null;
}

function sumAmounts(records: Array<{ amount: number }>): number {
  return Number(records.reduce((sum, r) => sum + r.amount, 0).toFixed(2));
}

function formatRangeLabel(startDate: Date, endDate: Date): string {
  return `${formatIsoDate(startDate)} to ${formatIsoDate(endDate)}`;
}

function buildDateRange(preset: WebPreset, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const today = startOfDay(new Date());
  if (preset === "custom") {
    const start = customStart ? startOfDay(new Date(`${customStart}T00:00:00`)) : addDays(today, -29);
    const end = customEnd ? endOfDay(new Date(`${customEnd}T00:00:00`)) : endOfDay(today);
    return { start, end };
  }
  if (preset === "last7") return { start: addDays(today, -6), end: endOfDay(today) };
  if (preset === "last90") return { start: addDays(today, -89), end: endOfDay(today) };
  if (preset === "thisMonth") {
    return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: endOfDay(today) };
  }
  if (preset === "previousMonth") {
    return { start: new Date(today.getFullYear(), today.getMonth() - 1, 1), end: new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999) };
  }
  return { start: addDays(today, -29), end: endOfDay(today) };
}

function buildBuckets(startDate: Date, endDate: Date): Array<{ key: string; label: string; start: Date; end: Date }> {
  const totalDays = daysBetweenInclusive(startDate, endDate);
  const strategy = totalDays <= 31 ? "day" : totalDays <= 120 ? "week" : "month";
  const buckets: Array<{ key: string; label: string; start: Date; end: Date }> = [];
  let cursor = startOfDay(startDate);
  while (cursor.getTime() <= endDate.getTime()) {
    if (strategy === "day") {
      buckets.push({ key: formatIsoDate(cursor), label: cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" }), start: startOfDay(cursor), end: endOfDay(cursor) });
      cursor = addDays(cursor, 1);
    } else if (strategy === "week") {
      const bs = startOfDay(cursor);
      const be = endOfDay(addDays(bs, 6));
      const ce = be.getTime() > endDate.getTime() ? endOfDay(endDate) : be;
      buckets.push({ key: `${formatIsoDate(bs)}-${formatIsoDate(ce)}`, label: `${bs.toLocaleDateString("en-US", { month: "short", day: "numeric" })}-${ce.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, start: bs, end: ce });
      cursor = addDays(bs, 7);
    } else {
      const bs = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const be = endOfDay(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
      const ce = be.getTime() > endDate.getTime() ? endOfDay(endDate) : be;
      buckets.push({ key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`, label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), start: bs, end: ce });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  }
  return buckets;
}

// ────────────────── Filter Normalization ──────────────────

type NormalizedWebFilters = WebFilters & { start: Date; end: Date };

export function normalizeWebFilters(raw?: Partial<WebFilters>): NormalizedWebFilters {
  const schema = z.object({
    preset: webPresetSchema.default("last30"),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
    brandIds: z.array(z.string()).default([]),
    campaignIds: z.array(z.string()).default([]),
    websiteIds: z.array(z.string()).default([]),
    languages: z.array(z.string()).default([]),
    adFormats: z.array(z.string()).default([]),
    pageTypes: z.array(z.string()).default([]),
    statuses: z.array(z.string()).default([]),
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
    websiteIds: raw?.websiteIds ?? [],
    languages: raw?.languages ?? [],
    adFormats: raw?.adFormats ?? [],
    pageTypes: raw?.pageTypes ?? [],
    statuses: raw?.statuses ?? [],
    page: raw?.page ?? 1,
    pageSize: raw?.pageSize ?? 10,
    sortBy: raw?.sortBy ?? "detected_at",
    sortDirection: raw?.sortDirection ?? "desc",
  });

  const { start, end } = buildDateRange(parsed.preset, parsed.startDate, parsed.endDate);
  const activeFilterCount =
    (parsed.brandIds.length > 0 ? 1 : 0) + (parsed.campaignIds.length > 0 ? 1 : 0) +
    (parsed.websiteIds.length > 0 ? 1 : 0) + (parsed.languages.length > 0 ? 1 : 0) +
    (parsed.adFormats.length > 0 ? 1 : 0) + (parsed.pageTypes.length > 0 ? 1 : 0) +
    (parsed.statuses.length > 0 ? 1 : 0) + (parsed.preset !== "last30" || parsed.startDate ? 1 : 0);

  return { ...parsed, startDate: formatIsoDate(start), endDate: formatIsoDate(end), start, end, activeFilterCount };
}

export function parseWebFiltersFromSearchParams(params: URLSearchParams | Record<string, string | string[] | undefined>) {
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
  return normalizeWebFilters({
    preset: (Array.isArray(getValue("preset")) ? getValue("preset")?.[0] : getValue("preset")) as WebPreset | undefined,
    startDate: Array.isArray(getValue("startDate")) ? getValue("startDate")?.[0] : (getValue("startDate") as string | undefined),
    endDate: Array.isArray(getValue("endDate")) ? getValue("endDate")?.[0] : (getValue("endDate") as string | undefined),
    brandIds: parseArray("brands"),
    campaignIds: parseArray("campaigns"),
    websiteIds: parseArray("websites"),
    languages: parseArray("languages"),
    adFormats: parseArray("adFormats"),
    pageTypes: parseArray("pageTypes"),
    statuses: parseArray("statuses"),
    page: Number(getValue("page")) || 1,
    pageSize: Number(getValue("pageSize")) || 10,
    sortBy: (Array.isArray(getValue("sortBy")) ? getValue("sortBy")?.[0] : getValue("sortBy")) as string | undefined,
    sortDirection: (Array.isArray(getValue("sortDirection")) ? getValue("sortDirection")?.[0] : getValue("sortDirection")) as string | undefined,
  });
}

// ────────────────── Main Analytics ──────────────────

const BRAND_COLOR_FALLBACKS: Record<string, string> = {
  "coca-cola": "#F40009", pepsi: "#005CB4", "7up": "#16A34A",
  "mountain-dew": "#78BE20", "rc-cola": "#7A1F2B", mirinda: "#F58220",
};

function getBrandColor(brand: { slug?: string | null; color?: string | null }): string {
  if (brand.color) return brand.color;
  if (brand.slug && BRAND_COLOR_FALLBACKS[brand.slug]) return BRAND_COLOR_FALLBACKS[brand.slug];
  return "#7C3AED";
}

async function resolveOrganizationId(): Promise<string> {
  const client = getOptionalSupabaseAdminClient();
  if (!client) throw new Error("Supabase admin client is not configured.");
  const { data: org } = await client.from("organizations").select("id").eq("slug", ORGANIZATION_SLUG).maybeSingle();
  if (org?.id) return org.id as string;
  const { data: fallback } = await client.from("organizations").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (fallback?.id) return fallback.id as string;
  throw new Error("No organization found.");
}

export async function getWebOverview(rawFilters?: Partial<WebFilters>): Promise<WebOverviewResponse> {
  const client = getOptionalSupabaseAdminClient();
  if (!client) throw new Error("Supabase admin client is not configured.");
  const filters = normalizeWebFilters(rawFilters);
  const currency = "USD";
  const orgId = await resolveOrganizationId();
  const prevRangeLen = daysBetweenInclusive(filters.start, filters.end);
  const prevEnd = addDays(startOfDay(filters.start), -1);
  const prevStart = addDays(prevEnd, -(prevRangeLen - 1));

  const [brandsRes, websitesRes, campaignsRes, websiteMapRes, spendRes] = await Promise.all([
    client.from("brands").select("id,name,slug,color,logo_url").eq("organization_id", orgId).order("name"),
    client.from("websites").select("id,name,domain,logo_url,primary_language,category,is_active").eq("organization_id", orgId).eq("is_active", true),
    client.from("campaigns").select("id,brand_id,name,status,start_date,end_date,medium").eq("organization_id", orgId).eq("medium", "web"),
    client.from("web_campaign_websites").select("campaign_id,website_id").eq("organization_id", orgId),
    client.from("spend_records").select("brand_id,campaign_id,platform_id,spend_date,amount,currency").eq("organization_id", orgId).gte("spend_date", formatIsoDate(prevStart)).lte("spend_date", filters.endDate),
  ]);

  if (brandsRes.error) throw brandsRes.error;
  if (websitesRes.error) throw websitesRes.error;
  if (campaignsRes.error) throw campaignsRes.error;
  if (websiteMapRes.error) throw websiteMapRes.error;
  if (spendRes.error) throw spendRes.error;

  const brands = ((brandsRes.data ?? []) as any[]).map((r: any) => ({
    id: String(r.id), name: String(r.name), slug: r.slug ? String(r.slug) : null,
    color: r.color ? String(r.color) : "", logoUrl: r.logo_url ? String(r.logo_url) : null,
  }));
  const websites = ((websitesRes.data ?? []) as any[]).map((r: any) => ({
    id: String(r.id), name: String(r.name), domain: String(r.domain),
    logoUrl: r.logo_url ? String(r.logo_url) : null, language: r.primary_language ? String(r.primary_language) : "Arabic",
    category: r.category ? String(r.category) : "News",
  }));
  const campaigns = ((campaignsRes.data ?? []) as any[]).map((r: any) => ({
    id: String(r.id), brandId: r.brand_id ? String(r.brand_id) : null, name: String(r.name),
    status: String(r.status ?? "draft"), startDate: r.start_date ? String(r.start_date) : null, endDate: r.end_date ? String(r.end_date) : null,
  }));

  const websiteCampaignMap = new Map<string, Set<string>>();
  for (const row of (websiteMapRes.data ?? []) as any[]) {
    const cid = String(row.campaign_id);
    const existing = websiteCampaignMap.get(cid) ?? new Set<string>();
    existing.add(String(row.website_id));
    websiteCampaignMap.set(cid, existing);
  }

  const brandsById = new Map(brands.map((b) => [b.id, { ...b, color: getBrandColor(b) }]));
  const websitesById = new Map(websites.map((w) => [w.id, w]));
  const hasWebsiteScopedFilters =
    filters.websiteIds.length > 0 ||
    filters.languages.length > 0 ||
    filters.pageTypes.length > 0;
  const matchingWebsiteIds = new Set(
    websites
      .filter((website) => {
        if (filters.websiteIds.length > 0 && !filters.websiteIds.includes(website.id)) return false;
        if (filters.languages.length > 0 && !filters.languages.includes(website.language)) return false;
        if (filters.pageTypes.length > 0 && !filters.pageTypes.includes(website.category)) return false;
        return true;
      })
      .map((website) => website.id),
  );

  const { data: webDetectionRows } = await client
    .from("web_ad_detections")
    .select("website_id,campaign_id,brand_id,ad_format,review_status,spend_amount")
    .eq("organization_id", orgId)
    .gte("detected_at", filters.startDate)
    .lte("detected_at", filters.endDate);

  const filteredDetections = ((webDetectionRows ?? []) as any[]).filter((row: any) => {
    const websiteId = String(row.website_id);
    if (hasWebsiteScopedFilters && !matchingWebsiteIds.has(websiteId)) return false;
    if (filters.brandIds.length > 0 && row.brand_id && !filters.brandIds.includes(String(row.brand_id))) return false;
    if (filters.campaignIds.length > 0 && row.campaign_id && !filters.campaignIds.includes(String(row.campaign_id))) return false;
    if (filters.adFormats.length > 0 && row.ad_format && !filters.adFormats.includes(String(row.ad_format))) return false;
    if (filters.statuses.length > 0 && row.review_status && !filters.statuses.includes(String(row.review_status))) return false;
    return true;
  });
  const hasDetectionScopedFilters =
    filters.languages.length > 0 ||
    filters.pageTypes.length > 0 ||
    filters.adFormats.length > 0 ||
    filters.statuses.length > 0 ||
    filters.websiteIds.length > 0;
  const detectionScopedCampaignIds = new Set(
    filteredDetections
      .map((row: any) => (row.campaign_id ? String(row.campaign_id) : null))
      .filter(Boolean) as string[],
  );

  const matchingCampaigns = campaigns.filter((c) => {
    if (filters.brandIds.length > 0 && c.brandId && !filters.brandIds.includes(c.brandId)) return false;
    if (filters.campaignIds.length > 0 && !filters.campaignIds.includes(c.id)) return false;
    if (hasWebsiteScopedFilters) {
      const linked = websiteCampaignMap.get(c.id) ?? new Set<string>();
      if (![...matchingWebsiteIds].some((w) => linked.has(w))) return false;
    }
    const cStart = c.startDate ? new Date(`${c.startDate}T00:00:00`) : null;
    const cEnd = c.endDate ? endOfDay(new Date(`${c.endDate}T00:00:00`)) : null;
    if (cStart && cStart.getTime() > filters.end.getTime()) return false;
    if (cEnd && cEnd.getTime() < filters.start.getTime()) return false;
    if (hasDetectionScopedFilters && !detectionScopedCampaignIds.has(c.id)) return false;
    return true;
  });

  const allSpend = ((spendRes.data ?? []) as any[]).map((r: any) => ({
    brandId: String(r.brand_id), campaignId: String(r.campaign_id), platformId: String(r.platform_id),
    spendDate: String(r.spend_date), amount: Number(r.amount ?? 0), currency: String(r.currency ?? "USD"),
  }));

  const filteredSpend = allSpend.filter((r) => {
    if (filters.brandIds.length > 0 && !filters.brandIds.includes(r.brandId)) return false;
    if (filters.campaignIds.length > 0 && !filters.campaignIds.includes(r.campaignId)) return false;
    if (hasDetectionScopedFilters && !detectionScopedCampaignIds.has(r.campaignId)) return false;
    return true;
  });

  const currentSpend = filteredSpend.filter((r) => r.spendDate >= filters.startDate && r.spendDate <= filters.endDate);
  const previousSpend = filteredSpend.filter((r) => r.spendDate >= formatIsoDate(prevStart) && r.spendDate <= formatIsoDate(prevEnd));

  const activeCampaigns = matchingCampaigns.filter((c) => c.status === "active");
  const activeBrandIds = new Set(activeCampaigns.map((c) => c.brandId).filter(Boolean) as string[]);

  const spendByCampaign = new Map<string, number>();
  const spendByBrand = new Map<string, number>();
  const previousSpendByBrand = new Map<string, number>();
  for (const r of currentSpend) {
    spendByCampaign.set(r.campaignId, Number(((spendByCampaign.get(r.campaignId) ?? 0) + r.amount).toFixed(2)));
    spendByBrand.set(r.brandId, Number(((spendByBrand.get(r.brandId) ?? 0) + r.amount).toFixed(2)));
  }
  for (const r of previousSpend) {
    previousSpendByBrand.set(r.brandId, Number(((previousSpendByBrand.get(r.brandId) ?? 0) + r.amount).toFixed(2)));
  }

  const totalSpending = sumAmounts(currentSpend);
  const previousTotalSpending = sumAmounts(previousSpend);

  // Time series
  const buckets = buildBuckets(filters.start, filters.end);
  const timeSeries: WebTimeSeriesPoint[] = buckets.map((bucket) => {
    const inBucket = currentSpend.filter((r) => {
      const d = new Date(`${r.spendDate}T00:00:00`);
      return d.getTime() >= bucket.start.getTime() && d.getTime() <= bucket.end.getTime();
    });
    const byBrand = new Map<string, number>();
    for (const r of inBucket) byBrand.set(r.brandId, Number(((byBrand.get(r.brandId) ?? 0) + r.amount).toFixed(2)));
    return {
      key: bucket.key, label: bucket.label, total: sumAmounts(inBucket),
      brands: [...byBrand.entries()].map(([bid, val]) => {
        const b = brandsById.get(bid);
        return { brandId: bid, brandName: b?.name ?? bid, color: b?.color ?? "#7C3AED", value: val };
      }),
    };
  });

  // Brand totals
  type BrandTotalEntry = { brandId: string; brandName: string; color: string; totalSpend: number; percentage: number; previousTotalSpend: number; previousChangePercent: number | null };
  const brandTotals: BrandTotalEntry[] = [...spendByBrand.entries()]
    .map(([bid, total]) => {
      const b = brandsById.get(bid);
      if (!b) return null as BrandTotalEntry | null;
      const prev = previousSpendByBrand.get(bid) ?? 0;
      return { brandId: bid, brandName: b.name, color: b.color, totalSpend: total, percentage: totalSpending > 0 ? Number(((total / totalSpending) * 100).toFixed(2)) : 0, previousTotalSpend: prev, previousChangePercent: safePercentChange(total, prev) };
    })
    .filter((x): x is BrandTotalEntry => x !== null);

  // SOV
  const shareOfVoice: WebSovEntry[] = brandTotals.map((bt) => ({
    brandId: bt.brandId, brandName: bt.brandName, color: bt.color, spend: bt.totalSpend,
    percentage: bt.percentage, activeCampaignCount: activeCampaigns.filter((c) => c.brandId === bt.brandId).length,
  }));

  // Website split
  const spendByWebsite = new Map<string, { spend: number; detections: number; campaigns: Set<string> }>();
  for (const row of filteredDetections) {
    const wId = String(row.website_id);
    const existing = spendByWebsite.get(wId) ?? { spend: 0, detections: 0, campaigns: new Set<string>() };
    existing.spend += Number(row.spend_amount ?? 0);
    existing.detections += 1;
    if (row.campaign_id) existing.campaigns.add(String(row.campaign_id));
    spendByWebsite.set(wId, existing);
  }

  const totalWS = [...spendByWebsite.values()].reduce((s, v) => s + v.spend, 0) || 1;
  const websiteSplit: WebWebsiteSplitEntry[] = websites
    .map((w) => {
      const data = spendByWebsite.get(w.id);
      if (!data || data.spend <= 0) return null;
      return { websiteId: w.id, websiteName: w.name, domain: w.domain, spend: Number(data.spend.toFixed(2)), percentage: Number(((data.spend / totalWS) * 100).toFixed(2)), detectionCount: data.detections, activeCampaignCount: data.campaigns.size };
    })
    .filter(Boolean)
    .sort((a, b) => (b?.spend ?? 0) - (a?.spend ?? 0)) as WebWebsiteSplitEntry[];

  // Active Campaigns
  const campaignItems: WebActiveCampaign[] = activeCampaigns.map((c) => {
    const b = c.brandId ? brandsById.get(c.brandId) : null;
    const linkedWebsites = [...(websiteCampaignMap.get(c.id) ?? new Set<string>())]
      .map((wId) => websitesById.get(wId)).filter(Boolean).map((w) => ({ id: w!.id, name: w!.name, domain: w!.domain }));
    return {
      id: c.id, name: c.name, brandId: c.brandId, brandName: b?.name ?? "Unassigned",
      brandColor: b?.color ?? "#64748B", brandLogo: b?.logoUrl ?? null, status: c.status,
      startDate: c.startDate, endDate: c.endDate, websites: linkedWebsites,
      totalSpend: spendByCampaign.get(c.id) ?? 0,
      screenshotCount: 0, detectionCount: filteredDetections.filter((d: any) => String(d.campaign_id) === c.id).length,
    };
  });
  const sortedCampaigns = [...campaignItems].sort((a, b) => b.totalSpend - a.totalSpend);
  const paginatedCampaigns = sortedCampaigns.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize);

  // Active Brands
  const activeBrandList: WebActiveBrand[] = [...activeBrandIds]
    .map((bid) => {
      const b = brandsById.get(bid);
      if (!b) return null;
      const bc = activeCampaigns.filter((c) => c.brandId === bid);
      const bw = new Set(bc.flatMap((c) => [...(websiteCampaignMap.get(c.id) ?? new Set<string>())]));
      const bd = filteredDetections.filter((d: any) => String(d.brand_id) === bid);
      return { brandId: bid, brandName: b.name, brandColor: b.color, logoUrl: b.logoUrl, activeCampaignCount: bc.length, totalSpend: spendByBrand.get(bid) ?? 0, websiteCount: bw.size, detectionCount: bd.length, status: "Active" as const };
    })
    .filter(Boolean)
    .sort((a, b) => (b?.totalSpend ?? 0) - (a?.totalSpend ?? 0)) as WebActiveBrand[];

  // Scan stats
  const { data: scanRuns } = await client
    .from("web_screenshots")
    .select("status,website_id,captured_at")
    .eq("organization_id", orgId)
    .gte("captured_at", filters.startDate)
    .lte("captured_at", filters.endDate);

  const scanStats = { completed: 0, failed: 0, total: 0, lastScanAt: null as string | null };
  if (scanRuns) {
    const filteredScans = (scanRuns as any[]).filter((scan) => !hasWebsiteScopedFilters || matchingWebsiteIds.has(String(scan.website_id)));
    scanStats.total = filteredScans.length;
    scanStats.completed = filteredScans.filter((r: any) => r.status === "completed").length;
    scanStats.failed = filteredScans.filter((r: any) => r.status === "failed").length;
    scanStats.lastScanAt = filteredScans
      .map((r: any) => (typeof r.captured_at === "string" ? r.captured_at : null))
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;
  }

  return {
    filters,
    summary: { title: "Web", description: "Real-time Web advertising monitoring across Iraqi news websites.", currency, rangeLabel: formatRangeLabel(filters.start, filters.end), activeFilterCount: filters.activeFilterCount },
    filterOptions: {
      brands: brands.filter((b) => activeBrandIds.has(b.id)).map((b) => ({ id: b.id, name: b.name, color: b.color, logoUrl: b.logoUrl })),
      campaigns: matchingCampaigns.map((c) => { const b = c.brandId ? brandsById.get(c.brandId) : null; return { id: c.id, name: c.name, brandId: c.brandId, brandName: b?.name ?? "Unassigned", status: c.status }; }),
      websites: websites.map((w) => ({ id: w.id, name: w.name, domain: w.domain, logoUrl: w.logoUrl, language: w.language, category: w.category })),
      languages: [...new Set(websites.map((w) => w.language))].sort(),
      adFormats: [...new Set(filteredDetections.map((row: any) => String(row.ad_format ?? "")).filter(Boolean))],
      pageTypes: [...new Set(websites.map((w) => w.category).filter(Boolean))].sort(),
      statuses: [...new Set(filteredDetections.map((row: any) => String(row.review_status ?? "")).filter(Boolean))],
      presets: [{ id: "last7", label: "Last 7 Days" }, { id: "last30", label: "Last 30 Days" }, { id: "last90", label: "Last 90 Days" }, { id: "thisMonth", label: "This Month" }, { id: "previousMonth", label: "Previous Month" }, { id: "custom", label: "Custom Range" }],
    },
    kpis: {
      activeBrands: { value: activeBrandIds.size, previousValue: 0, changePercent: null, description: "Unique brands with active Web campaigns.", trend: buckets.map((b) => ({ key: b.key, label: b.label, value: 0 })) },
      activeCampaigns: { value: activeCampaigns.length, previousValue: 0, changePercent: null, description: "Unique active Web campaigns, deduplicated across websites.", trend: buckets.map((b) => ({ key: b.key, label: b.label, value: 0 })) },
      totalSpending: { value: totalSpending, previousValue: previousTotalSpending, changePercent: safePercentChange(totalSpending, previousTotalSpending), description: "Total Web advertising spend.", trend: timeSeries.map((p) => ({ key: p.key, label: p.label, value: p.total })) },
    },
    spending: { timeSeries, totalsByBrand: brandTotals, total: totalSpending, currency },
    shareOfVoice, websiteSplit,
    activeCampaigns: { items: paginatedCampaigns, total: sortedCampaigns.length, page: filters.page, pageSize: filters.pageSize, hasMore: filters.page * filters.pageSize < sortedCampaigns.length },
    activeBrands: activeBrandList,
    recentScans: scanStats,
    states: { isEmpty: totalSpending === 0 && activeCampaigns.length === 0 && activeBrandIds.size === 0, emptyReason: totalSpending === 0 && activeCampaigns.length === 0 && activeBrandIds.size === 0 ? "No Web spending data is available for the selected filters." : null },
  };
}

// ────────────────── Detections ──────────────────

export async function getWebDetections(rawFilters?: Partial<WebFilters> & { search?: string }) {
  const client = getOptionalSupabaseAdminClient();
  if (!client) throw new Error("Supabase admin client is not configured.");
  const filters = normalizeWebFilters(rawFilters);
  const searchTerm = typeof (rawFilters as { search?: unknown } | undefined)?.search === "string"
    ? (rawFilters as { search?: string }).search?.trim().toLowerCase() ?? ""
    : "";
  const orgId = await resolveOrganizationId();
  const { data: websites } = await client
    .from("websites")
    .select("id,primary_language,category")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  const hasWebsiteScopedFilters =
    filters.websiteIds.length > 0 ||
    filters.languages.length > 0 ||
    filters.pageTypes.length > 0;
  const matchingWebsiteIds = new Set(
    ((websites ?? []) as any[])
      .filter((website: any) => {
        if (filters.websiteIds.length > 0 && !filters.websiteIds.includes(String(website.id))) return false;
        if (filters.languages.length > 0 && !filters.languages.includes(String(website.primary_language ?? "Arabic"))) return false;
        if (filters.pageTypes.length > 0 && !filters.pageTypes.includes(String(website.category ?? "News"))) return false;
        return true;
      })
      .map((website: any) => String(website.id)),
  );

    // Build count query
  let countQuery = client
    .from("web_ad_detections")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("detected_at", filters.startDate)
    .lte("detected_at", filters.endDate);

  if (filters.brandIds.length > 0) countQuery = countQuery.in("brand_id", filters.brandIds);
  if (filters.campaignIds.length > 0) countQuery = countQuery.in("campaign_id", filters.campaignIds);
  if (hasWebsiteScopedFilters) countQuery = countQuery.in("website_id", [...matchingWebsiteIds]);
  if (filters.adFormats.length > 0) countQuery = countQuery.in("ad_format", filters.adFormats);
  if (filters.statuses.length > 0) countQuery = countQuery.in("review_status", filters.statuses);

  // Build data query
  let dataQuery = client
    .from("web_ad_detections")
    .select("*")
    .eq("organization_id", orgId)
    .gte("detected_at", filters.startDate)
    .lte("detected_at", filters.endDate);

  if (filters.brandIds.length > 0) dataQuery = dataQuery.in("brand_id", filters.brandIds);
  if (filters.campaignIds.length > 0) dataQuery = dataQuery.in("campaign_id", filters.campaignIds);
  if (hasWebsiteScopedFilters) dataQuery = dataQuery.in("website_id", [...matchingWebsiteIds]);
  if (filters.adFormats.length > 0) dataQuery = dataQuery.in("ad_format", filters.adFormats);
  if (filters.statuses.length > 0) dataQuery = dataQuery.in("review_status", filters.statuses);

  const orderedQuery = dataQuery.order(filters.sortBy, { ascending: filters.sortDirection === "asc" });
  const { count: totalCount } = searchTerm ? { count: 0 } : await countQuery;
  const { data: rows } = searchTerm
    ? await orderedQuery
    : await orderedQuery.range((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize - 1);

  const brandIds = [...new Set((rows ?? []).map((r: any) => r.brand_id).filter(Boolean))];
  const websiteIds = [...new Set((rows ?? []).map((r: any) => r.website_id).filter(Boolean))];
  const campaignIds = [...new Set((rows ?? []).map((r: any) => r.campaign_id).filter(Boolean))];
  const screenshotIds = [...new Set((rows ?? []).map((r: any) => r.screenshot_id).filter(Boolean))];

  const [brandsRes, websitesRes, campaignsRes, screenshotsRes] = await Promise.all([
    brandIds.length > 0 ? client.from("brands").select("id,name,color").in("id", brandIds) : { data: [] },
    websiteIds.length > 0 ? client.from("websites").select("id,name,domain").in("id", websiteIds) : { data: [] },
    campaignIds.length > 0 ? client.from("campaigns").select("id,name").in("id", campaignIds) : { data: [] },
    screenshotIds.length > 0
      ? client.from("web_screenshots").select("id,website_id,screenshot_url,page_url,captured_at").in("id", screenshotIds)
      : (rows ?? []).length > 0
        ? client.from("web_screenshots").select("id,website_id,screenshot_url,page_url,captured_at").eq("organization_id", orgId).limit(50)
        : { data: [] },
  ]);

  const brandMap = new Map((brandsRes.data ?? []).map((r: any) => [String(r.id), r]));
  const websiteMap = new Map((websitesRes.data ?? []).map((r: any) => [String(r.id), r]));
  const campaignMap = new Map((campaignsRes.data ?? []).map((r: any) => [String(r.id), r]));
  const screenshotMap = new Map<string, any>();
  const screenshotIdMap = new Map<string, any>();
  for (const s of (screenshotsRes.data ?? []) as any[]) {
    screenshotMap.set(s.website_id, s);
    screenshotIdMap.set(String(s.id), s);
  }

  let detections: WebDetection[] = ((rows ?? []) as any[]).map((r: any) => {
    const dt = new Date(r.detected_at);
    const ws = websiteMap.get(String(r.website_id));
    const br = r.brand_id ? brandMap.get(String(r.brand_id)) : null;
    const ca = r.campaign_id ? campaignMap.get(String(r.campaign_id)) : null;
    const ss = r.screenshot_id ? screenshotIdMap.get(String(r.screenshot_id)) : screenshotMap.get(String(r.website_id));
    return {
      id: String(r.id), websiteId: String(r.website_id), websiteName: ws?.name ?? "Unknown",
      domain: ws?.domain ?? "", pageUrl: r.page_url ? String(r.page_url) : null,
      capturedAt: String(r.detected_at), date: formatIsoDate(dt),
      time: dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
      brandName: br?.name ?? null, brandColor: br?.color ?? null, campaignName: ca?.name ?? null,
      adFormat: r.ad_format ? String(r.ad_format) : null, position: r.position ? String(r.position) : null,
      destinationUrl: r.destination_url ? String(r.destination_url) : null,
      confidenceScore: Number(r.confidence_score ?? 0), reviewStatus: String(r.review_status ?? "pending"),
      spendAmount: Number(r.spend_amount ?? 0), currency: String(r.currency ?? "USD"),
      size: inferWebDetectionSize(r as Record<string, unknown>),
      screenshotUrl: ss?.screenshot_url ? String(ss.screenshot_url) : null,
    };
  });

  if (searchTerm) {
    detections = detections.filter((d) =>
      [
        d.websiteName,
        d.domain,
        d.pageUrl,
        d.brandName,
        d.campaignName,
        d.adFormat,
        d.position,
        d.reviewStatus,
        d.destinationUrl,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchTerm)),
    );
  }

  const total = searchTerm ? detections.length : (totalCount ?? 0);
  const paginatedItems = searchTerm
    ? detections.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize)
    : detections;

  return { items: paginatedItems, total, page: filters.page, pageSize: filters.pageSize, hasMore: (filters.page * filters.pageSize) < total };
}
