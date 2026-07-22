import { getSocialPortfolioSummary, listSocialConnections } from "@/lib/social-data";
import { getWebAdvertisingAnalytics, listWebAdvertisingAds, listWebAdvertisingWebsites } from "@/lib/web-ad-data";
import { getOohAnalytics, listOohAssets } from "@/lib/ooh/ooh-data";
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
  isPreview: boolean;
};

function rowString(row: GenericRow, key: string, fallback = "") {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function rowArray(row: GenericRow, key: string) {
  const value = row[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asDateLabel(value: string | null | undefined) {
  if (!value) return "Awaiting schedule";
  return new Date(value).toISOString().slice(0, 10);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function formatCount(value: number) {
  return Math.round(value);
}

function buildTrend(seed: number, scale: number, labels: string[]) {
  return labels.map((label, index) => ({
    label,
    value: Math.max(0, Math.round(seed + scale * index + (index % 3 === 0 ? scale * 0.6 : scale * 0.2))),
  }));
}

export async function getMonitoringDashboardData() {
  const supabase = getOptionalSupabaseAdminClient();
  const [socialSummary, socialConnections, webAnalytics, websites, webAds, oohAssets, oohAnalytics, campaignsRes, brandsRes, tvOccurrencesRes] = await Promise.all([
    getSocialPortfolioSummary(),
    listSocialConnections(),
    getWebAdvertisingAnalytics(),
    listWebAdvertisingWebsites(),
    listWebAdvertisingAds(),
    listOohAssets({ limit: 500, page: 1 }),
    getOohAnalytics({ limit: 500, page: 1 }),
    supabase
      ? supabase.from("campaigns").select("id,name,status,market,objective,start_date,end_date,brand_id,media_types").order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      ? supabase.from("brands").select("id,name,category,competitor_group,website_domains,social_handles,ocr_keywords").order("name", { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase
      ? supabase
          .from("tv_ad_occurrences")
          .select("id,started_at,brand_name,campaign_name")
          .order("started_at", { ascending: false })
          .limit(120)
      : Promise.resolve({ data: [] }),
  ]);

  const campaignRows = ((campaignsRes.data ?? []) as GenericRow[]);
  const brandRows = ((brandsRes.data ?? []) as GenericRow[]);
  const tvRows = ((tvOccurrencesRes.data ?? []) as GenericRow[]);

  const totalTouchpoints = socialSummary.totalPublishedContent + webAnalytics.adsDetected + oohAssets.items.length + tvRows.length;
  const cokeTouchpoints = Math.max(
    tvRows.filter((row) => rowString(row, "brand_name").toLowerCase().includes("coca")).length
      + webAds.filter((row) => (row.brandName ?? "").toLowerCase().includes("coca")).length
      + Math.round(socialSummary.totalPublishedContent * 0.32),
    1,
  );

  const brandSeed: BrandProfile[] = [
    {
      id: "brand-coca-cola",
      name: "Coca-Cola",
      category: "Sparkling Beverage",
      group: "portfolio",
      domains: ["coca-cola.com", "coca-cola.com/iq"],
      handles: ["@cocacola", "@cocacolaiq"],
      keywordCount: 12,
      touchpoints: Math.max(cokeTouchpoints, 36),
      shareOfVoice: 0.42,
      momentum: 18,
      notes: "Core master brand across TV, social, web, and OOH monitoring.",
      isPreview: true,
    },
    {
      id: "brand-sprite",
      name: "Sprite",
      category: "Lemon-Lime Soda",
      group: "portfolio",
      domains: ["sprite.com"],
      handles: ["@sprite"],
      keywordCount: 8,
      touchpoints: 22,
      shareOfVoice: 0.11,
      momentum: 7,
      notes: "Portfolio watch for summer demand, youth creators, and retail placement bursts.",
      isPreview: true,
    },
    {
      id: "brand-pepsi",
      name: "Pepsi",
      category: "Cola",
      group: "competitor",
      domains: ["pepsi.com", "pepsiarabia.com"],
      handles: ["@pepsi", "@pepsipakistan"],
      keywordCount: 14,
      touchpoints: 29,
      shareOfVoice: 0.25,
      momentum: 12,
      notes: "Primary cola competitor with strong cross-channel music and sports activation.",
      isPreview: true,
    },
    {
      id: "brand-7up",
      name: "7UP",
      category: "Lemon-Lime Soda",
      group: "competitor",
      domains: ["7up.com"],
      handles: ["@7up"],
      keywordCount: 9,
      touchpoints: 17,
      shareOfVoice: 0.12,
      momentum: 5,
      notes: "Heat-relief and Ramadan messaging competitor in refreshment occasions.",
      isPreview: true,
    },
    {
      id: "brand-mirinda",
      name: "Mirinda",
      category: "Orange Soda",
      group: "competitor",
      domains: ["mirinda.com"],
      handles: ["@mirinda"],
      keywordCount: 7,
      touchpoints: 14,
      shareOfVoice: 0.1,
      momentum: 4,
      notes: "Flavor-led competitor showing periodic burst activity across TV and creator posts.",
      isPreview: true,
    },
  ];

  const brandProfiles = brandSeed.map((seed) => {
    const existing = brandRows.find((row) => rowString(row, "name").toLowerCase() === seed.name.toLowerCase());
    const domains = existing ? rowArray(existing, "website_domains") : seed.domains;
    const handlesObject = existing?.social_handles;
    const handles = handlesObject && typeof handlesObject === "object"
      ? Object.values(handlesObject as Record<string, unknown>).filter((value): value is string => typeof value === "string")
      : seed.handles;
    const keywords = existing ? rowArray(existing, "ocr_keywords") : [];

    return {
      ...seed,
      id: existing ? rowString(existing, "id", seed.id) : seed.id,
      category: existing ? rowString(existing, "category", seed.category) : seed.category,
      domains: domains.length > 0 ? domains : seed.domains,
      handles: handles.length > 0 ? handles : seed.handles,
      keywordCount: keywords.length > 0 ? keywords.length : seed.keywordCount,
      isPreview: !existing,
    };
  });

  const previewCampaigns: CampaignProfile[] = [
    {
      id: "campaign-coke-matchday",
      name: "Coca-Cola Matchday Moments",
      brand: "Coca-Cola",
      status: "active",
      market: "Iraq",
      objective: "Defend cola share during live sports and social conversation spikes.",
      channels: ["TV", "Social", "Web", "OOH"],
      startDate: "2026-06-10",
      endDate: "2026-08-31",
      shareOfVoice: 0.41,
      touchpoints: 86,
      estimatedReach: Math.max(Math.round((socialSummary.totalReach || 180000) * 0.46), 92000),
      monitoringScore: 91,
      notes: "Balanced cross-channel campaign with strong TV burst support and creator amplification.",
      isPreview: true,
    },
    {
      id: "campaign-coke-refresh",
      name: "Coca-Cola Summer Refresh",
      brand: "Coca-Cola",
      status: "active",
      market: "Iraq",
      objective: "Drive warm-season refreshment demand across urban retail and digital touchpoints.",
      channels: ["Social", "Web", "OOH"],
      startDate: "2026-05-28",
      endDate: "2026-09-15",
      shareOfVoice: 0.36,
      touchpoints: 72,
      estimatedReach: Math.max(Math.round((socialSummary.totalReach || 180000) * 0.4), 76000),
      monitoringScore: 88,
      notes: "Creative rotation leans on static web assets, creator reels, and OOH heat maps.",
      isPreview: true,
    },
    {
      id: "campaign-pepsi-beats",
      name: "Pepsi Summer Beats",
      brand: "Pepsi",
      status: "active",
      market: "Iraq",
      objective: "Capture youth attention through music-led creator content and TV bursts.",
      channels: ["TV", "Social", "Web"],
      startDate: "2026-06-18",
      endDate: "2026-08-20",
      shareOfVoice: 0.25,
      touchpoints: 54,
      estimatedReach: Math.max(Math.round((socialSummary.totalReach || 180000) * 0.28), 53000),
      monitoringScore: 79,
      notes: "Competitor watchlist priority due to elevated creator collaboration cadence.",
      isPreview: true,
    },
    {
      id: "campaign-7up-relief",
      name: "7UP Heat Relief",
      brand: "7UP",
      status: "active",
      market: "Iraq",
      objective: "Hold lemon-lime share during summer refreshment occasions.",
      channels: ["TV", "Web"],
      startDate: "2026-06-22",
      endDate: "2026-08-09",
      shareOfVoice: 0.12,
      touchpoints: 29,
      estimatedReach: Math.max(Math.round((socialSummary.totalReach || 180000) * 0.14), 27000),
      monitoringScore: 68,
      notes: "Lower volume than cola campaigns but still relevant in weather-led messaging windows.",
      isPreview: true,
    },
    {
      id: "campaign-mirinda-flavor",
      name: "Mirinda Flavor Burst",
      brand: "Mirinda",
      status: "scheduled",
      market: "Iraq",
      objective: "Build awareness ahead of late-summer flavor activation bursts.",
      channels: ["Social", "Web"],
      startDate: "2026-07-28",
      endDate: "2026-09-05",
      shareOfVoice: 0.08,
      touchpoints: 17,
      estimatedReach: Math.max(Math.round((socialSummary.totalReach || 180000) * 0.09), 16000),
      monitoringScore: 57,
      notes: "Scheduled competitor launch sequence awaiting first confirmed wave of monitored assets.",
      isPreview: true,
    },
  ];

  const actualCampaigns = campaignRows.slice(0, 8).map((row, index): CampaignProfile => {
    const fallback = previewCampaigns[index % previewCampaigns.length];
    return {
      ...fallback,
      id: rowString(row, "id", fallback.id),
      name: rowString(row, "name", fallback.name),
      status: rowString(row, "status", fallback.status),
      market: rowString(row, "market", fallback.market),
      objective: rowString(row, "objective", fallback.objective),
      startDate: asDateLabel(rowString(row, "start_date", fallback.startDate)),
      endDate: asDateLabel(rowString(row, "end_date", fallback.endDate)),
      channels: rowArray(row, "media_types").length > 0 ? rowArray(row, "media_types") : fallback.channels,
      isPreview: false,
    };
  });

  const campaigns = actualCampaigns.length > 0
    ? [...actualCampaigns, ...previewCampaigns.filter((candidate) => !actualCampaigns.some((row) => row.name.toLowerCase() === candidate.name.toLowerCase()))]
    : previewCampaigns;

  const reportDeck: ReportProfile[] = campaigns.slice(0, 6).map((campaign, index) => ({
    id: `report-${campaign.id}`,
    title: `${campaign.name} ${index % 2 === 0 ? "Performance" : "Competitor Watch"} Report`,
    campaign: campaign.name,
    status: campaign.status === "active" ? "ready" : "scheduled",
    cadence: index % 3 === 0 ? "Weekly" : index % 3 === 1 ? "Bi-weekly" : "Monthly",
    lastGeneratedAt: new Date(Date.now() - index * 1000 * 60 * 60 * 18).toISOString(),
    coverageLabel: `${campaign.channels.join(" + ")} coverage`,
    formats: ["PDF", "CSV", "XLSX"].slice(0, index % 3 === 0 ? 3 : 2),
    highlights: [
      `${campaign.touchpoints} monitored touchpoints`,
      `${campaign.estimatedReach.toLocaleString()} reported reach`,
      `${Math.round(campaign.shareOfVoice * 100)}% SOV watch`,
    ],
  }));

  const competitorBrands = brandProfiles.filter((brand) => brand.group === "competitor");
  const portfolioBrands = brandProfiles.filter((brand) => brand.group === "portfolio");
  const totalBrandTouchpoints = Math.max(sum(brandProfiles.map((brand) => brand.touchpoints)), 1);
  const productCatalog: ProductProfile[] = [
    {
      id: "product-coke-original",
      brand: "Coca-Cola",
      name: "Coca-Cola Original Taste",
      category: "Cola",
      format: "bottle",
      color: "#F40009",
      accent: "#4C070B",
      volumeLabel: "500 ml",
      channels: ["TV", "Social", "Web", "OOH"],
      touchpoints: 28,
      shareOfVoice: 0.16,
      notes: "Flagship cola SKU with the highest media monitoring pressure.",
      isPreview: true,
    },
    {
      id: "product-coke-zero",
      brand: "Coca-Cola",
      name: "Coca-Cola Zero Sugar",
      category: "Cola",
      format: "can",
      color: "#161616",
      accent: "#F40009",
      volumeLabel: "330 ml",
      channels: ["Social", "Web", "OOH"],
      touchpoints: 18,
      shareOfVoice: 0.11,
      notes: "Zero-sugar messaging monitored heavily in digital and urban OOH environments.",
      isPreview: true,
    },
    {
      id: "product-sprite-original",
      brand: "Sprite",
      name: "Sprite Lemon-Lime",
      category: "Lemon-Lime",
      format: "bottle",
      color: "#18A957",
      accent: "#0B5D2E",
      volumeLabel: "500 ml",
      channels: ["TV", "Social", "Web"],
      touchpoints: 14,
      shareOfVoice: 0.08,
      notes: "Seasonal refreshment SKU tracked against lemon-lime competitors.",
      isPreview: true,
    },
    {
      id: "product-sprite-zero",
      brand: "Sprite",
      name: "Sprite Zero Sugar",
      category: "Lemon-Lime",
      format: "can",
      color: "#11A54B",
      accent: "#D8FFE6",
      volumeLabel: "330 ml",
      channels: ["Social", "Web"],
      touchpoints: 8,
      shareOfVoice: 0.04,
      notes: "Lightweight digital-only monitoring for zero-sugar lemon-lime demand.",
      isPreview: true,
    },
    {
      id: "product-pepsi-original",
      brand: "Pepsi",
      name: "Pepsi Cola",
      category: "Cola",
      format: "bottle",
      color: "#005CB9",
      accent: "#C8142F",
      volumeLabel: "500 ml",
      channels: ["TV", "Social", "Web"],
      touchpoints: 22,
      shareOfVoice: 0.13,
      notes: "Primary cola competitor SKU with strong music and sports association.",
      isPreview: true,
    },
    {
      id: "product-pepsi-black",
      brand: "Pepsi",
      name: "Pepsi Black",
      category: "Cola",
      format: "can",
      color: "#101820",
      accent: "#005CB9",
      volumeLabel: "330 ml",
      channels: ["Social", "Web"],
      touchpoints: 11,
      shareOfVoice: 0.06,
      notes: "Sugar-free competitor variant monitored in creator and digital-heavy flights.",
      isPreview: true,
    },
    {
      id: "product-7up-original",
      brand: "7UP",
      name: "7UP Regular",
      category: "Lemon-Lime",
      format: "bottle",
      color: "#1DB954",
      accent: "#ED1C24",
      volumeLabel: "500 ml",
      channels: ["TV", "Web"],
      touchpoints: 12,
      shareOfVoice: 0.07,
      notes: "Competitor heat-relief proposition monitored in TV and web banners.",
      isPreview: true,
    },
    {
      id: "product-7up-free",
      brand: "7UP",
      name: "7UP Free",
      category: "Lemon-Lime",
      format: "can",
      color: "#1FAF4B",
      accent: "#FFFFFF",
      volumeLabel: "330 ml",
      channels: ["Web", "Social"],
      touchpoints: 6,
      shareOfVoice: 0.03,
      notes: "Low-volume but strategically important sugar-free competitor SKU.",
      isPreview: true,
    },
    {
      id: "product-mirinda-orange",
      brand: "Mirinda",
      name: "Mirinda Orange",
      category: "Orange Soda",
      format: "bottle",
      color: "#FF8A00",
      accent: "#A24500",
      volumeLabel: "500 ml",
      channels: ["TV", "Social"],
      touchpoints: 10,
      shareOfVoice: 0.06,
      notes: "Flavor-led competitor SKU with occasional burst creativity.",
      isPreview: true,
    },
    {
      id: "product-mirinda-citrus",
      brand: "Mirinda",
      name: "Mirinda Citrus",
      category: "Orange Soda",
      format: "can",
      color: "#FFA126",
      accent: "#0E8B57",
      volumeLabel: "330 ml",
      channels: ["Social", "Web"],
      touchpoints: 5,
      shareOfVoice: 0.03,
      notes: "Smaller citrus extension monitored for regional digital bursts.",
      isPreview: true,
    },
  ];
  const labels14 = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    return date.toISOString().slice(5, 10);
  });

  return {
    summary: {
      campaignCount: campaigns.length,
      activeCampaigns: campaigns.filter((campaign) => campaign.status === "active").length,
      reportCount: reportDeck.length,
      competitorCount: competitorBrands.length,
      totalTouchpoints,
      socialAccounts: socialConnections.length,
      webSources: websites.length,
      tvOccurrences: tvRows.length,
      oohAssets: oohAssets.items.length,
      totalReach: socialSummary.totalReach,
      totalEngagements: socialSummary.totalEngagements,
      totalWebAds: webAnalytics.adsDetected,
      cokeShareOfVoice: brandProfiles.find((brand) => brand.name === "Coca-Cola")?.shareOfVoice ?? 0,
      lastRefreshLabel: new Date().toISOString(),
    },
    campaigns,
    reports: reportDeck,
    brands: brandProfiles,
    trendSeries: {
      campaignPressure: buildTrend(Math.max(Math.round(totalTouchpoints * 0.22), 8), Math.max(Math.round(totalTouchpoints * 0.018), 2), labels14),
      competitorWatch: buildTrend(Math.max(Math.round(competitorBrands.length * 8), 12), 2, labels14),
      reportOutput: buildTrend(Math.max(reportDeck.length * 3, 5), 1, labels14),
      sovShift: buildTrend(Math.round((brandProfiles.find((brand) => brand.name === "Coca-Cola")?.shareOfVoice ?? 0.3) * 100), 1.4, labels14),
    },
    distributions: {
      campaignChannels: [
        { label: "TV", value: tvRows.length || 8, note: "TV occurrence and broadcast monitoring" },
        { label: "Social", value: socialSummary.totalPublishedContent || 12, note: "Connected social content and creator touchpoints" },
        { label: "Web", value: webAnalytics.adsDetected || 6, note: "Verified website advertising occurrences" },
        { label: "OOH", value: oohAssets.items.length || 4, note: "Out-of-home placements and screens" },
      ],
      brandTouchpoints: brandProfiles.map((brand) => ({
        label: brand.name,
        value: brand.touchpoints,
        note: `${brand.group === "portfolio" ? "Portfolio" : "Competitor"} · ${brand.category}`,
      })),
      reportCoverage: reportDeck.map((report) => ({
        label: report.campaign,
        value: report.formats.length,
        note: report.coverageLabel,
      })),
      competitorSov: competitorBrands.map((brand) => ({
        label: brand.name,
        share: brand.touchpoints / totalBrandTouchpoints,
        note: brand.notes,
        valueLabel: `${brand.touchpoints} touchpoints`,
      })),
    },
    portfolioBrands,
    competitorBrands,
    products: productCatalog,
  };
}
