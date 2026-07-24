import { getSocialPortfolioSummary, listSocialConnections } from "@/lib/social-data";
import { getWebAdvertisingAnalytics, listWebAdvertisingAds, listWebAdvertisingWebsites } from "@/lib/web-ad-data";
import { listOohAssets } from "@/lib/ooh/ooh-data";
import { getOptionalSupabaseAdminClient } from "@/lib/supabase/server";

type GenericRow = Record<string, unknown>;

type BrandProfile = {
  id: string;
  name: string;
  category: string;
  group: "portfolio" | "competitor";
  domains: string[];
  handles: string[];
  keywordCount: number;
  touchpoints: number;
  shareOfVoice: number;
  momentum: number;
  notes: string;
  isPreview: boolean;
};

type CampaignProfile = {
  id: string;
  name: string;
  brand: string;
  status: string;
  market: string;
  objective: string;
  channels: string[];
  startDate: string;
  endDate: string;
  shareOfVoice: number;
  touchpoints: number;
  estimatedReach: number;
  monitoringScore: number;
  notes: string;
  isPreview: boolean;
};

type ReportProfile = {
  id: string;
  title: string;
  campaign: string;
  status: string;
  cadence: string;
  lastGeneratedAt: string;
  coverageLabel: string;
  formats: string[];
  highlights: string[];
};

type ProductProfile = {
  id: string;
  brand: string;
  name: string;
  category: string;
  format: "bottle" | "can";
  color: string;
  accent: string;
  volumeLabel: string;
  channels: string[];
  touchpoints: number;
  shareOfVoice: number;
  notes: string;
  imageUrl: string;
  isPreview: boolean;
};

type CreativeProfile = {
  id: string;
  brand: string;
  product: string;
  campaign: string;
  name: string;
  mediaType: string;
  aspectRatio: string;
  durationLabel: string;
  approvalState: "approved" | "pending" | "review" | "active";
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  tags: string[];
  thumbnailUrl: string;
  notes: string;
  isPreview: boolean;
};

function rowString(row: GenericRow, key: string, fallback = "") {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function rowNullableString(row: GenericRow, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function rowArray(row: GenericRow, key: string) {
  const value = row[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asDateLabel(value: string | null | undefined) {
  if (!value) return "Awaiting schedule";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Awaiting schedule" : parsed.toISOString().slice(0, 10);
}

function buildRecentLabels(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return date.toISOString().slice(5, 10);
  });
}

function buildSparseTrend(values: number[], labels: string[]) {
  return labels.map((label, index) => ({
    label,
    value: values[index] ?? 0,
  }));
}

function colorForBrand(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("coca")) return { color: "#F40009", accent: "#7f0b11" };
  if (normalized.includes("sprite") || normalized.includes("7up")) return { color: "#1FAF4B", accent: "#0B5D2E" };
  if (normalized.includes("pepsi")) return { color: "#005CB9", accent: "#C8142F" };
  if (normalized.includes("mirinda") || normalized.includes("fanta")) return { color: "#FF8A00", accent: "#A24500" };
  return { color: "#8b5cf6", accent: "#4c1d95" };
}

export async function getMonitoringDashboardData() {
  const supabase = getOptionalSupabaseAdminClient();
  const recentLabels = buildRecentLabels(14);

  const [socialSummary, socialConnections, webAnalytics, websites, webAds, oohAssets, campaignsRes, brandsRes, tvOccurrencesRes] = await Promise.all([
    getSocialPortfolioSummary(),
    listSocialConnections(),
    getWebAdvertisingAnalytics(),
    listWebAdvertisingWebsites(),
    listWebAdvertisingAds(),
    listOohAssets({ limit: 500, page: 1 }),
    supabase
      ? supabase.from("campaigns").select("id,name,status,market,objective,start_date,end_date,brand_id,media_types,created_at").order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      ? supabase.from("brands").select("id,name,category,competitor_group,website_domains,social_handles,ocr_keywords,is_dummy_brand").order("name", { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase
      ? supabase
          .from("tv_ad_occurrences")
          .select("id,started_at,brand_name,campaign_name,review_status")
          .neq("first_detection_method", "sandbox_fixture")
          .order("started_at", { ascending: false })
          .limit(250)
      : Promise.resolve({ data: [] }),
  ]);

  const campaignRows = ((campaignsRes.data ?? []) as GenericRow[]);
  const brandRows = ((brandsRes.data ?? []) as GenericRow[]).filter((row) => !Boolean(row["is_dummy_brand"]));
  const tvRows = ((tvOccurrencesRes.data ?? []) as GenericRow[]);

  const validBrands = brandRows.map((row) => rowString(row, "name")).filter(Boolean);
  const validBrandSet = new Set(validBrands.map((name) => name.toLowerCase()));

  const touchpointsByBrand = new Map<string, number>();

  for (const row of tvRows) {
    const brand = rowString(row, "brand_name");
    if (!brand) continue;
    touchpointsByBrand.set(brand, (touchpointsByBrand.get(brand) ?? 0) + 1);
  }

  for (const ad of webAds) {
    if (!ad.brandName) continue;
    touchpointsByBrand.set(ad.brandName, (touchpointsByBrand.get(ad.brandName) ?? 0) + 1);
  }

  for (const asset of oohAssets.items) {
    if (!asset.brandName) continue;
    touchpointsByBrand.set(asset.brandName, (touchpointsByBrand.get(asset.brandName) ?? 0) + 1);
  }

  for (const connection of socialConnections) {
    const matchedBrand = validBrands.find((brand) => connection.accountName.toLowerCase().includes(brand.toLowerCase()));
    if (!matchedBrand) continue;
    touchpointsByBrand.set(matchedBrand, (touchpointsByBrand.get(matchedBrand) ?? 0) + Math.max(connection.contentCount ?? 0, 1));
  }

  const totalBrandTouchpoints = Math.max([...touchpointsByBrand.values()].reduce((sum, value) => sum + value, 0), 1);

  const brandProfiles: BrandProfile[] = brandRows.map((row) => {
    const name = rowString(row, "name");
    const competitorGroup = rowString(row, "competitor_group").toLowerCase();
    const handlesObject = row["social_handles"];
    const handles =
      handlesObject && typeof handlesObject === "object"
        ? Object.values(handlesObject as Record<string, unknown>).filter((value): value is string => typeof value === "string")
        : [];
    const touchpoints = touchpointsByBrand.get(name) ?? 0;

    const group: BrandProfile["group"] = competitorGroup.includes("competitor") ? "competitor" : "portfolio";

    return {
      id: rowString(row, "id"),
      name,
      category: rowString(row, "category", "Uncategorized"),
      group,
      domains: rowArray(row, "website_domains"),
      handles,
      keywordCount: rowArray(row, "ocr_keywords").length,
      touchpoints,
      shareOfVoice: touchpoints / totalBrandTouchpoints,
      momentum: 0,
      notes: "Workspace-backed profile",
      isPreview: false,
    };
  }).filter((brand) => brand.touchpoints > 0 || brand.domains.length > 0 || brand.handles.length > 0 || brand.keywordCount > 0);

  const brandLookup = new Map(brandProfiles.map((brand) => [brand.id, brand]));
  const brandNameLookup = new Map(brandProfiles.map((brand) => [brand.name.toLowerCase(), brand]));

  const campaignTouchpoints = new Map<string, number>();
  for (const row of tvRows) {
    const campaign = rowString(row, "campaign_name");
    if (!campaign) continue;
    campaignTouchpoints.set(campaign.toLowerCase(), (campaignTouchpoints.get(campaign.toLowerCase()) ?? 0) + 1);
  }
  for (const ad of webAds) {
    if (!ad.campaignName) continue;
    campaignTouchpoints.set(ad.campaignName.toLowerCase(), (campaignTouchpoints.get(ad.campaignName.toLowerCase()) ?? 0) + 1);
  }
  for (const asset of oohAssets.items) {
    if (!asset.campaignName) continue;
    campaignTouchpoints.set(asset.campaignName.toLowerCase(), (campaignTouchpoints.get(asset.campaignName.toLowerCase()) ?? 0) + 1);
  }

  const campaigns: CampaignProfile[] = campaignRows.map((row) => {
    const name = rowString(row, "name");
    const brand = brandLookup.get(rowString(row, "brand_id"))?.name ?? "Unassigned";
    const touchpoints = campaignTouchpoints.get(name.toLowerCase()) ?? 0;
    const channels = rowArray(row, "media_types");
    const estimatedReach = brand !== "Unassigned"
      ? Math.round((brandNameLookup.get(brand.toLowerCase())?.shareOfVoice ?? 0) * socialSummary.totalReach)
      : 0;

    return {
      id: rowString(row, "id"),
      name,
      brand,
      status: rowString(row, "status", "unknown"),
      market: rowString(row, "market", "Unspecified"),
      objective: rowString(row, "objective", "No objective provided."),
      channels,
      startDate: asDateLabel(rowNullableString(row, "start_date")),
      endDate: asDateLabel(rowNullableString(row, "end_date")),
      shareOfVoice: touchpoints / totalBrandTouchpoints,
      touchpoints,
      estimatedReach,
      monitoringScore: Math.min(100, touchpoints > 0 ? 60 + Math.round(touchpoints * 2) : 0),
      notes: "Workspace-backed campaign record",
      isPreview: false,
    };
  }).filter((campaign) => campaign.brand !== "Unassigned" || campaign.touchpoints > 0);

  const reports: ReportProfile[] = campaigns.map((campaign) => ({
    id: `report-${campaign.id}`,
    title: `${campaign.name} Report`,
    campaign: campaign.name,
    status: campaign.status === "active" ? "ready" : "scheduled",
    cadence: "On demand",
    lastGeneratedAt: new Date().toISOString(),
    coverageLabel: campaign.channels.length > 0 ? `${campaign.channels.join(" + ")} coverage` : "Coverage not configured",
    formats: ["PDF", "CSV"],
    highlights: [
      `${campaign.touchpoints} monitored touchpoints`,
      `${campaign.estimatedReach.toLocaleString()} reported reach`,
      `${Math.round(campaign.shareOfVoice * 100)}% SOV`,
    ],
  }));

  const portfolioBrands = brandProfiles.filter((brand) => brand.group === "portfolio");
  const competitorBrands = brandProfiles.filter((brand) => brand.group === "competitor");

  const products: ProductProfile[] = [];
  const creatives: CreativeProfile[] = [];

  const totalTouchpoints =
    socialSummary.totalPublishedContent +
    webAnalytics.adsDetected +
    oohAssets.items.length +
    tvRows.length;

  const cokeBrand = brandProfiles.find((brand) => brand.name.toLowerCase().includes("coca-cola"));
  const cokeShareOfVoice = cokeBrand?.shareOfVoice ?? 0;

  const tvByDay = new Map<string, number>();
  for (const row of tvRows) {
    const startedAt = rowNullableString(row, "started_at");
    if (!startedAt) continue;
    const key = startedAt.slice(5, 10);
    tvByDay.set(key, (tvByDay.get(key) ?? 0) + 1);
  }

  const webAverage = webAnalytics.adsDetected > 0 ? Math.max(1, Math.round(webAnalytics.adsDetected / 14)) : 0;
  const socialAverage = socialSummary.totalPublishedContent > 0 ? Math.max(1, Math.round(socialSummary.totalPublishedContent / 14)) : 0;

  return {
    summary: {
      campaignCount: campaigns.length,
      activeCampaigns: campaigns.filter((campaign) => campaign.status === "active").length,
      reportCount: reports.length,
      competitorCount: competitorBrands.length,
      totalTouchpoints,
      socialAccounts: socialConnections.length,
      webSources: websites.length,
      tvOccurrences: tvRows.length,
      oohAssets: oohAssets.items.length,
      totalReach: socialSummary.totalReach,
      totalEngagements: socialSummary.totalEngagements,
      totalWebAds: webAnalytics.adsDetected,
      cokeShareOfVoice,
      lastRefreshLabel: new Date().toISOString(),
    },
    campaigns,
    reports,
    brands: brandProfiles,
    trendSeries: {
      campaignPressure: buildSparseTrend(
        recentLabels.map((label) => (tvByDay.get(label) ?? 0) + webAverage + socialAverage),
        recentLabels,
      ),
      competitorWatch: buildSparseTrend(
        recentLabels.map((_, index) => (competitorBrands.length > 0 ? competitorBrands.length + (index % 3) : 0)),
        recentLabels,
      ),
      reportOutput: buildSparseTrend(
        recentLabels.map((_, index) => (reports.length > 0 && index >= recentLabels.length - Math.min(reports.length, 4) ? 1 : 0)),
        recentLabels,
      ),
      sovShift: buildSparseTrend(
        recentLabels.map(() => Math.round(cokeShareOfVoice * 100)),
        recentLabels,
      ),
    },
    distributions: {
      campaignChannels: [
        { label: "TV", value: tvRows.length, note: "TV occurrence monitoring" },
        { label: "Social", value: socialSummary.totalPublishedContent, note: "Connected social content" },
        { label: "Web", value: webAnalytics.adsDetected, note: "Verified web ad occurrences" },
        { label: "OOH", value: oohAssets.items.length, note: "OOH asset records" },
      ].filter((item) => item.value > 0),
      brandTouchpoints: brandProfiles
        .map((brand) => ({
          label: brand.name,
          value: brand.touchpoints,
          note: `${brand.group === "portfolio" ? "Portfolio" : "Competitor"} · ${brand.category}`,
          color: colorForBrand(brand.name).color,
        }))
        .filter((item) => item.value > 0),
      reportCoverage: reports.map((report) => ({
        label: report.campaign,
        value: report.formats.length,
        note: report.coverageLabel,
      })),
      competitorSov: competitorBrands
        .filter((brand) => brand.touchpoints > 0)
        .map((brand) => ({
          label: brand.name,
          share: brand.touchpoints / totalBrandTouchpoints,
          note: brand.notes,
          valueLabel: `${brand.touchpoints} touchpoints`,
          color: colorForBrand(brand.name).color,
        })),
    },
    portfolioBrands,
    competitorBrands,
    products,
    creatives,
  };
}
