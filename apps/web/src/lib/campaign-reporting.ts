import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";

import { isBeverageScopedBrand } from "@/lib/beverage-scope";
import { getOptionalSupabaseAdminClient } from "@/lib/supabase/server";

const ORGANIZATION_SLUG = "coca_cola_iraq";
export const CAMPAIGN_REPORT_WINDOW_START = "2024-07-25";
export const CAMPAIGN_REPORT_WINDOW_END = "2026-07-25";

type GenericRow = Record<string, unknown>;

type CampaignRow = {
  id: string;
  brandId: string | null;
  name: string;
  status: string;
  market: string;
  objective: string;
  startDate: string | null;
  endDate: string | null;
  budgetAmount: number | null;
  budgetCurrency: string | null;
  mediaTypes: string[];
  medium: string | null;
};

type BrandRow = {
  id: string;
  name: string;
  slug: string | null;
  category: string;
  color: string;
  logoUrl: string | null;
  isActive: boolean;
};

type PlatformRow = {
  id: string;
  name: string;
  slug: string;
  color: string;
};

type BrandSpendSummary = {
  brandId: string;
  totalTrackedSpend: number;
  totalBudget: number;
  totalCampaigns: number;
  liveCampaigns: number;
  lastActivityDate: string | null;
  primaryPlatforms: string[];
  latestCampaignName: string | null;
};

export type CampaignWorkspaceItem = {
  id: string;
  name: string;
  brandId: string | null;
  brandName: string;
  brandColor: string;
  market: string;
  objective: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  platformNames: string[];
  trackedSpend: number;
  budgetAmount: number | null;
  currency: string;
  isLive: boolean;
};

export type BrandReportItem = {
  brandId: string;
  brandName: string;
  brandSlug: string | null;
  category: string;
  color: string;
  logoUrl: string | null;
  isActive: boolean;
  summary: BrandSpendSummary;
  campaigns: CampaignWorkspaceItem[];
};

export type CampaignReportingData = {
  generatedAt: string;
  currency: string;
  campaigns: CampaignWorkspaceItem[];
  brandReports: BrandReportItem[];
  summary: {
    totalCampaigns: number;
    liveCampaigns: number;
    totalBrands: number;
    totalTrackedSpend: number;
  };
};

function rowString(row: GenericRow, key: string, fallback = "") {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function rowNullableString(row: GenericRow, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function rowBoolean(row: GenericRow, key: string, fallback = false) {
  const value = row[key];
  return typeof value === "boolean" ? value : fallback;
}

function rowNumber(row: GenericRow, key: string) {
  const value = row[key];
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function rowArray(row: GenericRow, key: string) {
  const value = row[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toDateValue(value: string | null) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateLabel(value: string | null) {
  if (!value) return "Ongoing";
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return "Ongoing";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export function isCampaignRelevantToWindow(campaign: {
  startDate: string | null;
  endDate: string | null;
  status: string;
}, windowStart = CAMPAIGN_REPORT_WINDOW_START, windowEnd = CAMPAIGN_REPORT_WINDOW_END) {
  const normalizedStatus = campaign.status.toLowerCase();
  if (normalizedStatus === "active") return true;

  const start = toDateValue(campaign.startDate);
  const end = toDateValue(campaign.endDate) ?? toDateValue(windowEnd);
  const rangeStart = toDateValue(windowStart);
  const rangeEnd = toDateValue(windowEnd);

  if (!rangeStart || !rangeEnd) return false;
  if (!start && !end) return false;

  const effectiveStart = start ?? rangeStart;
  const effectiveEnd = end ?? rangeEnd;

  return effectiveStart.getTime() <= rangeEnd.getTime() && effectiveEnd.getTime() >= rangeStart.getTime();
}

function isCampaignLive(campaign: Pick<CampaignRow, "status" | "startDate" | "endDate">, today = CAMPAIGN_REPORT_WINDOW_END) {
  if (campaign.status.toLowerCase() === "active") return true;
  const start = toDateValue(campaign.startDate);
  const end = toDateValue(campaign.endDate);
  const current = toDateValue(today);
  if (!current || !start) return false;
  return start.getTime() <= current.getTime() && (!end || end.getTime() >= current.getTime());
}

function sortCampaigns(left: CampaignWorkspaceItem, right: CampaignWorkspaceItem) {
  if (left.isLive !== right.isLive) return left.isLive ? -1 : 1;
  if (left.trackedSpend !== right.trackedSpend) return right.trackedSpend - left.trackedSpend;
  const leftStart = left.startDate ?? "";
  const rightStart = right.startDate ?? "";
  if (leftStart !== rightStart) return rightStart.localeCompare(leftStart);
  return left.name.localeCompare(right.name);
}

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function dedupeStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export async function getCampaignReportingData(): Promise<CampaignReportingData> {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return {
      generatedAt: new Date().toISOString(),
      currency: "USD",
      campaigns: [],
      brandReports: [],
      summary: {
        totalCampaigns: 0,
        liveCampaigns: 0,
        totalBrands: 0,
        totalTrackedSpend: 0,
      },
    };
  }

  const organizationRes = await supabase.from("organizations").select("id").eq("slug", ORGANIZATION_SLUG).maybeSingle();
  if (organizationRes.error) throw organizationRes.error;
  const organizationId = organizationRes.data?.id ? String(organizationRes.data.id) : null;

  if (!organizationId) {
    return {
      generatedAt: new Date().toISOString(),
      currency: "USD",
      campaigns: [],
      brandReports: [],
      summary: {
        totalCampaigns: 0,
        liveCampaigns: 0,
        totalBrands: 0,
        totalTrackedSpend: 0,
      },
    };
  }

  const [
    brandsRes,
    campaignsRes,
    platformsRes,
    campaignPlatformsRes,
    spendRes,
    tvSpendRes,
  ] = await Promise.all([
    supabase
      .from("brands")
      .select("id,name,slug,category,color,logo_url,is_active")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    supabase
      .from("campaigns")
      .select("id,brand_id,name,status,market,objective,start_date,end_date,budget_amount,budget_currency,media_types,medium")
      .eq("organization_id", organizationId)
      .order("start_date", { ascending: false }),
    supabase
      .from("platforms")
      .select("id,name,slug,color")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    supabase
      .from("campaign_platforms")
      .select("campaign_id,platform_id")
      .eq("organization_id", organizationId),
    supabase
      .from("spend_records")
      .select("brand_id,campaign_id,platform_id,spend_date,amount,currency")
      .eq("organization_id", organizationId)
      .gte("spend_date", CAMPAIGN_REPORT_WINDOW_START)
      .lte("spend_date", CAMPAIGN_REPORT_WINDOW_END),
    supabase
      .from("tv_ad_detections")
      .select("campaign_id,cost,detected_at")
      .eq("organization_id", organizationId)
      .gte("detected_at", `${CAMPAIGN_REPORT_WINDOW_START}T00:00:00+00`)
      .lte("detected_at", `${CAMPAIGN_REPORT_WINDOW_END}T23:59:59+00`),
  ]);

  if (brandsRes.error) throw brandsRes.error;
  if (campaignsRes.error) throw campaignsRes.error;
  if (platformsRes.error) throw platformsRes.error;
  if (campaignPlatformsRes.error) throw campaignPlatformsRes.error;
  if (spendRes.error) throw spendRes.error;
  if (tvSpendRes.error) throw tvSpendRes.error;

  const brands = ((brandsRes.data ?? []) as GenericRow[])
    .map<BrandRow>((row) => ({
      id: rowString(row, "id"),
      name: rowString(row, "name", "Unknown brand"),
      slug: rowNullableString(row, "slug"),
      category: rowString(row, "category", "Uncategorized"),
      color: rowString(row, "color", "#D0D5DD"),
      logoUrl: rowNullableString(row, "logo_url"),
      isActive: rowBoolean(row, "is_active", true),
    }))
    .filter((brand) =>
      isBeverageScopedBrand({
        name: brand.name,
        slug: brand.slug,
        category: brand.category,
      }),
    );
  const allowedBrandIds = new Set(brands.map((brand) => brand.id));

  const campaigns = ((campaignsRes.data ?? []) as GenericRow[]).map<CampaignRow>((row) => ({
    id: rowString(row, "id"),
    brandId: rowNullableString(row, "brand_id"),
    name: rowString(row, "name", "Untitled campaign"),
    status: rowString(row, "status", "draft"),
    market: rowString(row, "market", "Iraq"),
    objective: rowString(row, "objective", "No objective provided."),
    startDate: rowNullableString(row, "start_date"),
    endDate: rowNullableString(row, "end_date"),
    budgetAmount: rowNumber(row, "budget_amount"),
    budgetCurrency: rowNullableString(row, "budget_currency"),
    mediaTypes: rowArray(row, "media_types"),
    medium: rowNullableString(row, "medium"),
  })).filter((campaign) => campaign.brandId && allowedBrandIds.has(campaign.brandId) && isCampaignRelevantToWindow(campaign));
  const allowedCampaignIds = new Set(campaigns.map((campaign) => campaign.id));

  const platforms = ((platformsRes.data ?? []) as GenericRow[]).map<PlatformRow>((row) => ({
    id: rowString(row, "id"),
    name: rowString(row, "name"),
    slug: rowString(row, "slug"),
    color: rowString(row, "color", "#CBD5E1"),
  }));

  const platformById = new Map(platforms.map((platform) => [platform.id, platform]));
  const platformBySlug = new Map(platforms.map((platform) => [platform.slug, platform]));
  const brandById = new Map(brands.map((brand) => [brand.id, brand]));

  const campaignPlatformMap = new Map<string, string[]>();
  for (const row of (campaignPlatformsRes.data ?? []) as GenericRow[]) {
    const campaignId = rowString(row, "campaign_id");
    const platformId = rowString(row, "platform_id");
    if (!campaignId || !platformId) continue;
    const current = campaignPlatformMap.get(campaignId) ?? [];
    current.push(platformId);
    campaignPlatformMap.set(campaignId, current);
  }

  const spendByCampaign = new Map<string, number>();
  const spendByBrand = new Map<string, number>();
  let resolvedCurrency = "USD";

  for (const row of (spendRes.data ?? []) as GenericRow[]) {
    const campaignId = rowString(row, "campaign_id");
    const brandId = rowString(row, "brand_id");
    if (!allowedBrandIds.has(brandId) || !allowedCampaignIds.has(campaignId)) continue;
    const amount = rowNumber(row, "amount") ?? 0;
    const currency = rowString(row, "currency", "USD");
    resolvedCurrency = currency || resolvedCurrency;
    if (campaignId) {
      spendByCampaign.set(campaignId, roundMoney((spendByCampaign.get(campaignId) ?? 0) + amount));
    }
    if (brandId) {
      spendByBrand.set(brandId, roundMoney((spendByBrand.get(brandId) ?? 0) + amount));
    }
  }

  for (const row of (tvSpendRes.data ?? []) as GenericRow[]) {
    const campaignId = rowString(row, "campaign_id");
    const cost = rowNumber(row, "cost") ?? 0;
    if (!campaignId || !allowedCampaignIds.has(campaignId)) continue;
    spendByCampaign.set(campaignId, roundMoney((spendByCampaign.get(campaignId) ?? 0) + cost));
    const campaign = campaigns.find((item) => item.id === campaignId);
    if (campaign?.brandId) {
      spendByBrand.set(campaign.brandId, roundMoney((spendByBrand.get(campaign.brandId) ?? 0) + cost));
    }
  }

  const campaignItems = campaigns.map<CampaignWorkspaceItem>((campaign) => {
    const brand = campaign.brandId ? brandById.get(campaign.brandId) : null;
    const mappedPlatforms = (campaignPlatformMap.get(campaign.id) ?? [])
      .map((platformId) => platformById.get(platformId)?.name ?? null)
      .filter((platformName): platformName is string => Boolean(platformName));
    const mediaTypePlatforms = campaign.mediaTypes
      .map((slug) => platformBySlug.get(slug)?.name ?? slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()))
      .filter(Boolean);
    const mediumPlatform =
      campaign.medium && !campaign.mediaTypes.includes(campaign.medium)
        ? campaign.medium.toUpperCase()
        : null;

    return {
      id: campaign.id,
      name: campaign.name,
      brandId: campaign.brandId,
      brandName: brand?.name ?? "Unassigned",
      brandColor: brand?.color ?? "#D0D5DD",
      market: campaign.market,
      objective: campaign.objective,
      status: campaign.status,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      platformNames: dedupeStrings([
        ...mappedPlatforms,
        ...mediaTypePlatforms,
        ...(mediumPlatform ? [mediumPlatform] : []),
      ]),
      trackedSpend: spendByCampaign.get(campaign.id) ?? 0,
      budgetAmount: campaign.budgetAmount,
      currency: campaign.budgetCurrency ?? resolvedCurrency,
      isLive: isCampaignLive(campaign),
    };
  }).sort(sortCampaigns);

  const campaignsByBrand = new Map<string, CampaignWorkspaceItem[]>();
  for (const campaign of campaignItems) {
    if (!campaign.brandId) continue;
    const current = campaignsByBrand.get(campaign.brandId) ?? [];
    current.push(campaign);
    campaignsByBrand.set(campaign.brandId, current);
  }

  const brandReports = brands
    .map<BrandReportItem>((brand) => {
      const brandCampaigns = campaignsByBrand.get(brand.id) ?? [];
      const trackedSpend = spendByBrand.get(brand.id) ?? brandCampaigns.reduce((sum, item) => sum + item.trackedSpend, 0);
      const totalBudget = brandCampaigns.reduce((sum, item) => sum + (item.budgetAmount ?? 0), 0);
      const liveCampaigns = brandCampaigns.filter((item) => item.isLive).length;
      const latestCampaign = brandCampaigns[0] ?? null;
      const primaryPlatforms = dedupeStrings(brandCampaigns.flatMap((item) => item.platformNames)).slice(0, 6);

      return {
        brandId: brand.id,
        brandName: brand.name,
        brandSlug: brand.slug,
        category: brand.category,
        color: brand.color,
        logoUrl: brand.logoUrl,
        isActive: brand.isActive,
        summary: {
          brandId: brand.id,
          totalTrackedSpend: roundMoney(trackedSpend),
          totalBudget: roundMoney(totalBudget),
          totalCampaigns: brandCampaigns.length,
          liveCampaigns,
          lastActivityDate: latestCampaign?.endDate ?? latestCampaign?.startDate ?? null,
          primaryPlatforms,
          latestCampaignName: latestCampaign?.name ?? null,
        },
        campaigns: brandCampaigns,
      };
    })
    .filter((item) => item.summary.totalCampaigns > 0)
    .sort((left, right) => {
      if (left.summary.liveCampaigns !== right.summary.liveCampaigns) return right.summary.liveCampaigns - left.summary.liveCampaigns;
      if (left.summary.totalTrackedSpend !== right.summary.totalTrackedSpend) return right.summary.totalTrackedSpend - left.summary.totalTrackedSpend;
      return left.brandName.localeCompare(right.brandName);
    });

  return {
    generatedAt: new Date().toISOString(),
    currency: resolvedCurrency,
    campaigns: campaignItems,
    brandReports,
    summary: {
      totalCampaigns: campaignItems.length,
      liveCampaigns: campaignItems.filter((campaign) => campaign.isLive).length,
      totalBrands: brandReports.length,
      totalTrackedSpend: roundMoney(campaignItems.reduce((sum, campaign) => sum + campaign.trackedSpend, 0)),
    },
  };
}

function drawPdfLine(page: ReturnType<PDFDocument["addPage"]>, text: string, y: number, bold: boolean, fontRegular: Awaited<ReturnType<PDFDocument["embedFont"]>>, fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>) {
  page.drawText(text, {
    x: 40,
    y,
    size: 10.5,
    font: bold ? fontBold : fontRegular,
    color: rgb(0.16, 0.16, 0.18),
  });
}

export async function buildBrandReportExport(brandId: string, format: "pdf" | "xlsx") {
  const data = await getCampaignReportingData();
  const brand = data.brandReports.find((entry) => entry.brandId === brandId);

  if (!brand) {
    throw new Error("Brand report not found.");
  }

  if (format === "xlsx") {
    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.json_to_sheet([
      {
        Brand: brand.brandName,
        Category: brand.category,
        "Live campaigns": brand.summary.liveCampaigns,
        "Total campaigns": brand.summary.totalCampaigns,
        "Tracked spend": brand.summary.totalTrackedSpend,
        "Budget total": brand.summary.totalBudget,
        "Primary platforms": brand.summary.primaryPlatforms.join(", "),
        "Latest campaign": brand.summary.latestCampaignName ?? "None",
      },
    ]);
    const campaignsSheet = XLSX.utils.json_to_sheet(
      brand.campaigns.map((campaign) => ({
        Campaign: campaign.name,
        Status: campaign.status,
        Live: campaign.isLive ? "Yes" : "No",
        Market: campaign.market,
        Platforms: campaign.platformNames.join(", "),
        "Tracked spend": campaign.trackedSpend,
        Budget: campaign.budgetAmount ?? "",
        "Start date": campaign.startDate ?? "",
        "End date": campaign.endDate ?? "",
        Objective: campaign.objective,
      })),
    );

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    XLSX.utils.book_append_sheet(workbook, campaignsSheet, "Campaigns");

    return {
      fileName: `${brand.brandSlug ?? brand.brandName.toLowerCase().replace(/\s+/g, "-")}-report.xlsx`,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      body: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer,
    };
  }

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  let cursorY = 744;

  page.drawText(`${brand.brandName} Brand Report`, {
    x: 40,
    y: cursorY,
    size: 22,
    font: bold,
    color: rgb(0.11, 0.11, 0.13),
  });
  cursorY -= 26;
  page.drawText(`Generated ${new Date(data.generatedAt).toLocaleString("en-US")}`, {
    x: 40,
    y: cursorY,
    size: 10,
    font: regular,
    color: rgb(0.44, 0.44, 0.48),
  });
  cursorY -= 34;

  const summaryLines = [
    `Category: ${brand.category}`,
    `Live campaigns: ${brand.summary.liveCampaigns}`,
    `Total campaigns: ${brand.summary.totalCampaigns}`,
    `Tracked spend: ${formatCurrency(brand.summary.totalTrackedSpend, data.currency)}`,
    `Budget total: ${formatCurrency(brand.summary.totalBudget, data.currency)}`,
    `Primary platforms: ${brand.summary.primaryPlatforms.join(", ") || "None recorded"}`,
  ];

  page.drawRectangle({
    x: 36,
    y: cursorY - 92,
    width: 540,
    height: 104,
    borderColor: rgb(0.91, 0.88, 0.84),
    borderWidth: 1,
    color: rgb(0.99, 0.97, 0.95),
  });

  let summaryY = cursorY - 14;
  for (const line of summaryLines) {
    drawPdfLine(page, line, summaryY, false, regular, bold);
    summaryY -= 15;
  }

  cursorY -= 126;
  drawPdfLine(page, "Campaign listing", cursorY, true, regular, bold);
  cursorY -= 20;

  for (const campaign of brand.campaigns) {
    if (cursorY < 110) {
      page = pdf.addPage([612, 792]);
      cursorY = 744;
    }

    page.drawRectangle({
      x: 36,
      y: cursorY - 54,
      width: 540,
      height: 60,
      borderColor: rgb(0.91, 0.88, 0.84),
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });
    drawPdfLine(page, `${campaign.name} (${campaign.status})`, cursorY - 14, true, regular, bold);
    drawPdfLine(
      page,
      `${campaign.platformNames.join(", ") || "No mapped platforms"} • ${formatDateLabel(campaign.startDate)} to ${formatDateLabel(campaign.endDate)}`,
      cursorY - 30,
      false,
      regular,
      bold,
    );
    drawPdfLine(
      page,
      `Tracked spend ${formatCurrency(campaign.trackedSpend, data.currency)} • Budget ${formatCurrency(campaign.budgetAmount ?? 0, campaign.currency)}`,
      cursorY - 46,
      false,
      regular,
      bold,
    );
    cursorY -= 72;
  }

  return {
    fileName: `${brand.brandSlug ?? brand.brandName.toLowerCase().replace(/\s+/g, "-")}-report.pdf`,
    contentType: "application/pdf",
    body: Buffer.from(await pdf.save()),
  };
}
