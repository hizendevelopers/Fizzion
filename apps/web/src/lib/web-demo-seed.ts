import {
  OVERVIEW_DEMO_BRANDS,
  OVERVIEW_DEMO_SEED_END,
  OVERVIEW_DEMO_SEED_START,
  type OverviewDemoBrandSpec,
} from "@/lib/overview-demo-seed";

export type WebDemoWebsiteSpec = {
  name: string;
  domain: string;
  homepageUrl: string;
  language: string;
  category: string;
};

export type WebDemoCampaignSpec = {
  brandName: string;
  name: string;
  startDate: string;
  endDate: string | null;
  status: "active" | "completed" | "scheduled";
  budgetAmount: number;
  budgetCurrency: "USD";
  objective: string;
  websiteDomains: string[];
};

export type WebDemoSpendSeed = {
  brandName: string;
  campaignName: string;
  spendDate: string;
  amount: number;
  currency: "USD";
};

export type WebDemoScreenshotSeed = {
  websiteDomain: string;
  pageUrl: string;
  screenshotUrl: string | null;
  capturedAt: string;
  viewportWidth: number;
  viewportHeight: number;
  status: "completed" | "failed";
  failureReason: string | null;
  checksum: string;
};

export type WebDemoDetectionSeed = {
  websiteDomain: string;
  campaignName: string;
  brandName: string;
  adFormat: string;
  position: string;
  destinationUrl: string;
  confidenceScore: number;
  reviewStatus: "confirmed" | "pending";
  spendAmount: number;
  currency: "USD";
  detectedAt: string;
};

const DAY_MS = 86_400_000;

export const WEB_DEMO_WEBSITES: WebDemoWebsiteSpec[] = [
  { name: "Al Sumaria", domain: "alsumaria.tv", homepageUrl: "https://www.alsumaria.tv", language: "Arabic", category: "News" },
  { name: "Rudaw", domain: "rudaw.net", homepageUrl: "https://www.rudaw.net/english", language: "Kurdish", category: "News" },
  { name: "Shafaq News", domain: "shafaq.com", homepageUrl: "https://www.shafaq.com/en", language: "Arabic", category: "News" },
  { name: "Baghdad Today", domain: "baghdadtoday.news", homepageUrl: "https://baghdadtoday.news", language: "Arabic", category: "News" },
  { name: "Iraqi News Agency", domain: "ina.iq", homepageUrl: "https://ina.iq/eng", language: "Arabic", category: "News" },
  { name: "NRT", domain: "nrttv.com", homepageUrl: "https://www.nrttv.com", language: "Kurdish", category: "News" },
  { name: "BasNews", domain: "basnews.com", homepageUrl: "https://www.basnews.com/en", language: "Kurdish", category: "News" },
  { name: "964media", domain: "964media.com", homepageUrl: "https://www.964media.com", language: "Arabic", category: "News" },
  { name: "Iraq Business News", domain: "iraq-businessnews.com", homepageUrl: "https://iraq-businessnews.com", language: "English", category: "Business" },
  { name: "Al Forat News", domain: "alforatnews.iq", homepageUrl: "https://alforatnews.iq", language: "Arabic", category: "News" },
];

const WEB_OBJECTIVES: Record<string, string[]> = {
  Beverages: [
    "Drive homepage reach during seasonal refreshment demand.",
    "Expand premium display share across Iraqi publisher inventory.",
    "Keep family-audience visibility high across trusted news destinations.",
  ],
  Telecom: [
    "Grow prepaid recharge and bundle consideration on high-reach publishers.",
    "Boost broadband awareness with sustained homepage presence.",
    "Win competitive share across high-frequency web inventory.",
  ],
  Technology: [
    "Support device launches through premium homepage takeovers.",
    "Reach intent-rich readers with display and native placements.",
    "Sustain upgrade visibility around retail shopping windows.",
  ],
  Automotive: [
    "Keep new-model launches visible on high-trust editorial pages.",
    "Drive dealer consideration with broad-format web placements.",
    "Maintain awareness during travel and family browsing periods.",
  ],
  FMCG: [
    "Increase household demand with broad publisher frequency.",
    "Protect category share during value-led promotional windows.",
    "Stay visible in everyday shopping and pantry moments.",
  ],
  Delivery: [
    "Win meal-time and evening browsing with tactical web placements.",
    "Boost app consideration with always-on value messaging.",
    "Increase order frequency using responsive publisher inventory.",
  ],
  Retail: [
    "Promote seasonal basket-building and value-driven shopping.",
    "Capture school and family shopping demand with wide homepage coverage.",
    "Drive store traffic during key discount periods.",
  ],
  "Financial Services": [
    "Increase trusted payment-brand visibility across business and news sites.",
    "Grow digital spend consideration with premium placements.",
    "Reinforce card usage during commerce-heavy periods.",
  ],
};

const WEB_TEMPLATES: Record<string, string[]> = {
  Beverages: ["Web Refresh", "Homepage Takeover", "Digital Lift"],
  Telecom: ["Data Pulse", "Always On", "Connect Daily"],
  Technology: ["Premium Web Launch", "Upgrade Wave", "Smart Screen Reach"],
  Automotive: ["Drive the Web", "Digital Showroom", "Launch Visibility"],
  FMCG: ["Value Reach", "Family Routine", "Daily Basket"],
  Delivery: ["Cravings Online", "Click to Order", "Dinner Rush"],
  Retail: ["Shopping Push", "Retail Reach", "Seasonal Savings"],
  "Financial Services": ["Checkout Confidence", "Spend More", "Card Visibility"],
};

const AD_FORMATS = ["Leaderboard", "MPU", "Skyscraper", "Billboard", "Native"];
const POSITIONS = ["Top of page", "Sidebar", "Mid article", "Sticky footer", "Section rail"];

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function formatIsoDate(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * DAY_MS);
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function hash(input: string): number {
  let current = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    current ^= input.charCodeAt(index);
    current = Math.imul(current, 16777619);
  }

  return current >>> 0;
}

function unit(input: string): number {
  return hash(input) / 4294967295;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getSeasonalMultiplier(date: Date, category: string) {
  const iso = formatIsoDate(date);
  let multiplier = 1;

  if (
    (iso >= "2025-02-28" && iso <= "2025-03-29") ||
    (iso >= "2026-02-18" && iso <= "2026-03-19")
  ) {
    multiplier *= 1.36;
  } else if (
    (iso >= "2025-03-30" && iso <= "2025-04-05") ||
    (iso >= "2026-03-20" && iso <= "2026-03-27")
  ) {
    multiplier *= 1.18;
  }

  const month = date.getMonth() + 1;
  if ([6, 7, 8].includes(month) && category === "Beverages") multiplier *= 1.18;
  if ([8, 9].includes(month) && ["Technology", "Retail", "Telecom"].includes(category)) multiplier *= 1.12;
  if ([11, 12].includes(month) && ["Automotive", "Retail", "Financial Services"].includes(category)) multiplier *= 1.14;
  if (month === 1) multiplier *= 0.88;

  return multiplier;
}

function getWeekpartMultiplier(date: Date, category: string) {
  const day = date.getDay();
  const isWeekend = day === 5 || day === 6;
  if (!isWeekend) return 1;
  if (["Beverages", "Delivery", "Retail"].includes(category)) return 1.08;
  if (["Financial Services", "Technology"].includes(category)) return 0.94;
  return 1;
}

function pickWebsiteDomains(brandIndex: number, slot: number): string[] {
  const rotation = (brandIndex * 2 + slot) % WEB_DEMO_WEBSITES.length;
  const targetCount = slot === 0 ? 2 : slot === 1 ? 3 : 4;
  const picked = new Set<string>();
  for (let index = 0; index < targetCount; index += 1) {
    picked.add(WEB_DEMO_WEBSITES[(rotation + index * 2) % WEB_DEMO_WEBSITES.length]!.domain);
  }
  return [...picked];
}

function buildCampaignName(brand: OverviewDemoBrandSpec, brandIndex: number, slot: number) {
  const templates = WEB_TEMPLATES[brand.category] ?? WEB_TEMPLATES.FMCG;
  const template = templates[(brandIndex + slot) % templates.length] ?? templates[0]!;
  return `${brand.name} ${template}`;
}

export function buildWebDemoCampaigns(currentDate = OVERVIEW_DEMO_SEED_END): WebDemoCampaignSpec[] {
  const today = parseIsoDate(currentDate);
  const campaigns: WebDemoCampaignSpec[] = [];

  OVERVIEW_DEMO_BRANDS.forEach((brand, brandIndex) => {
    for (const slot of [0, 1] as const) {
      const startBase = slot === 0 ? parseIsoDate("2024-08-01") : parseIsoDate("2025-04-01");
      const start = addDays(startBase, (brandIndex * (slot === 0 ? 17 : 23)) % (slot === 0 ? 280 : 340));
      const duration = (slot === 0 ? 120 : 170) + ((brandIndex * 13) % 60);
      let end = addDays(start, duration);
      let status: WebDemoCampaignSpec["status"] = "completed";

      if (slot === 1 && brand.isActive && brandIndex % 5 !== 0) {
        status = "active";
        end = addDays(today, 30 + (brandIndex % 4) * 18);
      }

      campaigns.push({
        brandName: brand.name,
        name: buildCampaignName(brand, brandIndex, slot),
        startDate: formatIsoDate(start),
        endDate: status === "active" && brandIndex % 3 === 0 ? null : formatIsoDate(end),
        status,
        budgetAmount: roundMoney(75_000 + brandIndex * 4_200 + slot * 18_000),
        budgetCurrency: "USD",
        objective: (WEB_OBJECTIVES[brand.category] ?? WEB_OBJECTIVES.FMCG)[slot % 3] ?? WEB_OBJECTIVES.FMCG[0]!,
        websiteDomains: pickWebsiteDomains(brandIndex, slot),
      });
    }
  });

  return campaigns.slice(0, 44);
}

export function buildWebDemoSpendSeeds(campaigns = buildWebDemoCampaigns()): WebDemoSpendSeed[] {
  const seedStart = parseIsoDate(OVERVIEW_DEMO_SEED_START);
  const seedEnd = parseIsoDate(OVERVIEW_DEMO_SEED_END);
  const brandByName = new Map(OVERVIEW_DEMO_BRANDS.map((brand) => [brand.name, brand]));
  const rows: WebDemoSpendSeed[] = [];

  for (const campaign of campaigns) {
    const brand = brandByName.get(campaign.brandName);
    if (!brand) continue;

    const start = parseIsoDate(campaign.startDate);
    const rawEnd = campaign.endDate ? parseIsoDate(campaign.endDate) : seedEnd;
    const effectiveStart = start.getTime() < seedStart.getTime() ? seedStart : start;
    const effectiveEnd = rawEnd.getTime() > seedEnd.getTime() ? seedEnd : rawEnd;
    if (effectiveStart.getTime() > effectiveEnd.getTime()) continue;

    const baseDaily = 220 + (hash(campaign.name) % 260);
    for (let cursor = new Date(effectiveStart.getTime()); cursor.getTime() <= effectiveEnd.getTime(); cursor = addDays(cursor, 1)) {
      const dateKey = formatIsoDate(cursor);
      const activity = clamp(0.26 + (getSeasonalMultiplier(cursor, brand.category) - 1) * 0.2 + (campaign.status === "active" ? 0.08 : 0), 0.18, 0.72);
      if (unit(`${campaign.name}:${dateKey}:activity`) > activity) continue;

      const amount =
        baseDaily *
        getSeasonalMultiplier(cursor, brand.category) *
        getWeekpartMultiplier(cursor, brand.category) *
        (0.86 + unit(`${campaign.name}:${dateKey}:variance`) * 0.35) *
        (1 + (campaign.websiteDomains.length - 2) * 0.07);

      rows.push({
        brandName: campaign.brandName,
        campaignName: campaign.name,
        spendDate: dateKey,
        amount: roundMoney(amount),
        currency: "USD",
      });
    }
  }

  return rows;
}

export function buildWebDemoScreenshotSeeds(): WebDemoScreenshotSeed[] {
  const seedStart = parseIsoDate(OVERVIEW_DEMO_SEED_START);
  const seedEnd = parseIsoDate(OVERVIEW_DEMO_SEED_END);
  const rows: WebDemoScreenshotSeed[] = [];

  for (const [websiteIndex, website] of WEB_DEMO_WEBSITES.entries()) {
    for (let cursor = new Date(seedStart.getTime()); cursor.getTime() <= seedEnd.getTime(); cursor = addDays(cursor, 3)) {
      const dateKey = formatIsoDate(cursor);
      const failed = unit(`${website.domain}:${dateKey}:scan`) < 0.07;
      const sectionPath = websiteIndex % 4 === 0 ? "/business" : websiteIndex % 3 === 0 ? "/sport" : "/news";
      rows.push({
        websiteDomain: website.domain,
        pageUrl: `${website.homepageUrl}${sectionPath}`,
        screenshotUrl: failed ? null : `/demo/web/screenshots/${website.domain}/${dateKey}.jpg`,
        capturedAt: `${dateKey}T0${(websiteIndex % 4) + 6}:1${websiteIndex % 6}:00Z`,
        viewportWidth: 1440,
        viewportHeight: 900,
        status: failed ? "failed" : "completed",
        failureReason: failed ? "Connection timeout during scheduled scan." : null,
        checksum: `web-demo:${website.domain}:${dateKey}`,
      });
    }
  }

  return rows;
}

export function buildWebDemoDetectionSeeds(campaigns = buildWebDemoCampaigns()): WebDemoDetectionSeed[] {
  const seedStart = parseIsoDate(OVERVIEW_DEMO_SEED_START);
  const seedEnd = parseIsoDate(OVERVIEW_DEMO_SEED_END);
  const brandByName = new Map(OVERVIEW_DEMO_BRANDS.map((brand) => [brand.name, brand]));
  const rows: WebDemoDetectionSeed[] = [];

  for (const campaign of campaigns) {
    const brand = brandByName.get(campaign.brandName);
    if (!brand) continue;

    const start = parseIsoDate(campaign.startDate);
    const rawEnd = campaign.endDate ? parseIsoDate(campaign.endDate) : seedEnd;
    const effectiveStart = start.getTime() < seedStart.getTime() ? seedStart : start;
    const effectiveEnd = rawEnd.getTime() > seedEnd.getTime() ? seedEnd : rawEnd;
    if (effectiveStart.getTime() > effectiveEnd.getTime()) continue;

    for (const websiteDomain of campaign.websiteDomains) {
      for (let cursor = new Date(effectiveStart.getTime()); cursor.getTime() <= effectiveEnd.getTime(); cursor = addDays(cursor, 1)) {
        const dateKey = formatIsoDate(cursor);
        const seasonal = getSeasonalMultiplier(cursor, brand.category);
        const probability = clamp(0.035 + (seasonal - 1) * 0.06 + (campaign.status === "active" ? 0.015 : 0), 0.02, 0.16);
        if (unit(`${campaign.name}:${websiteDomain}:${dateKey}:detect`) > probability) continue;

        const adFormat = AD_FORMATS[hash(`${campaign.name}:${websiteDomain}:${dateKey}:format`) % AD_FORMATS.length]!;
        const position = POSITIONS[hash(`${campaign.name}:${websiteDomain}:${dateKey}:position`) % POSITIONS.length]!;
        const hour = 5 + (hash(`${campaign.name}:${websiteDomain}:${dateKey}:hour`) % 17);
        const minute = hash(`${campaign.name}:${websiteDomain}:${dateKey}:minute`) % 60;
        const spendAmount = roundMoney((38 + (hash(`${campaign.name}:${websiteDomain}:${dateKey}:cpm`) % 70)) * seasonal * (adFormat === "Billboard" ? 1.32 : adFormat === "Native" ? 0.92 : 1));
        rows.push({
          websiteDomain,
          campaignName: campaign.name,
          brandName: campaign.brandName,
          adFormat,
          position,
          destinationUrl: `https://demo.fizzion/${brand.slug}/${campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          confidenceScore: Number((0.81 + unit(`${campaign.name}:${websiteDomain}:${dateKey}:confidence`) * 0.18).toFixed(2)),
          reviewStatus: unit(`${campaign.name}:${websiteDomain}:${dateKey}:review`) > 0.14 ? "confirmed" : "pending",
          spendAmount,
          currency: "USD",
          detectedAt: `${dateKey}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`,
        });
      }
    }
  }

  return rows;
}
