export const OVERVIEW_DEMO_SEED_START = "2024-07-25";
export const OVERVIEW_DEMO_SEED_END = "2026-07-25";

export type OverviewDemoBrandSpec = {
  name: string;
  slug: string;
  category: string;
  competitorGroup: string;
  color: string;
  logoUrl: string | null;
  isActive: boolean;
  isDummyBrand: boolean;
};

export type OverviewDemoPlatformSpec = {
  name: string;
  slug: string;
  icon: string;
  color: string;
  isActive: boolean;
};

export type OverviewDemoCampaignSpec = {
  brandName: string;
  name: string;
  startDate: string;
  endDate: string | null;
  status: "active" | "completed" | "scheduled";
  budgetAmount: number;
  budgetCurrency: "USD";
  objective: string;
  platformSlugs: string[];
};

export type OverviewDemoSpendSeed = {
  brandName: string;
  campaignName: string;
  platformSlug: string;
  spendDate: string;
  amount: number;
  currency: "USD";
};

const DAY_MS = 86_400_000;

const CATEGORY_TEMPLATES: Record<string, string[]> = {
  Beverages: [
    "Ramadan Together",
    "Summer Refresh",
    "Match Day",
    "Extra Fizz",
    "Family Moments",
  ],
  Telecom: [
    "Connect More",
    "Unlimited Data",
    "Smart Choice",
    "Weekend Unlimited",
    "Fiber for Families",
  ],
  Technology: [
    "Premium Launch",
    "Smart Living",
    "Back to School",
    "Connect More",
    "Family Entertainment",
  ],
  Automotive: [
    "New Model Launch",
    "Trusted Drive",
    "Weekend Drive",
    "Everyday Confidence",
    "Family SUV",
  ],
  FMCG: [
    "Family Pack",
    "Everyday Savings",
    "Ramadan Essentials",
    "Back to School",
    "Weekend Deal",
  ],
  Delivery: [
    "Prime Time Cravings",
    "Ramadan Offer",
    "Weekend Deal",
    "Everyday Savings",
    "Family Pack",
  ],
  Retail: [
    "Festival Basket",
    "Back to School",
    "Everyday Savings",
    "Holiday Savings",
    "Family Value",
  ],
  "Financial Services": [
    "Smart Payments",
    "Everyday Spend",
    "Premium Launch",
    "Weekend Rewards",
    "Connected Checkout",
  ],
};

const PLATFORM_WEIGHTS: Record<string, number> = {
  meta: 1.04,
  tiktok: 0.9,
  youtube: 1.18,
  "google-ads": 0.86,
  "web-advertising": 0.82,
  ooh: 1.32,
};

const CATEGORY_FACTORS: Record<string, number> = {
  Beverages: 1.18,
  Telecom: 1.15,
  Technology: 1.08,
  Automotive: 1.12,
  FMCG: 0.96,
  Delivery: 0.9,
  Retail: 0.98,
  "Financial Services": 0.92,
};

export const OVERVIEW_DEMO_BRANDS: OverviewDemoBrandSpec[] = [
  { name: "Coca-Cola", slug: "coca-cola", category: "Beverages", competitorGroup: "owned", color: "#F40009", logoUrl: "/assets/brands/coca-cola.svg", isActive: true, isDummyBrand: false },
  { name: "Pepsi", slug: "pepsi", category: "Beverages", competitorGroup: "competitor", color: "#005CB4", logoUrl: "/assets/brands/pepsi.svg", isActive: true, isDummyBrand: true },
  { name: "7UP", slug: "7up", category: "Beverages", competitorGroup: "competitor", color: "#16A34A", logoUrl: null, isActive: true, isDummyBrand: true },
  { name: "Mountain Dew", slug: "mountain-dew", category: "Beverages", competitorGroup: "competitor", color: "#78BE20", logoUrl: null, isActive: true, isDummyBrand: true },
  { name: "Mirinda", slug: "mirinda", category: "Beverages", competitorGroup: "competitor", color: "#F58220", logoUrl: null, isActive: true, isDummyBrand: true },
  { name: "RC Cola", slug: "rc-cola", category: "Beverages", competitorGroup: "competitor", color: "#7A1F2B", logoUrl: null, isActive: false, isDummyBrand: true },
  { name: "Zain Iraq", slug: "zain-iraq", category: "Telecom", competitorGroup: "telecom", color: "#7B2CBF", logoUrl: null, isActive: true, isDummyBrand: true },
  { name: "Asiacell", slug: "asiacell", category: "Telecom", competitorGroup: "telecom", color: "#F59E0B", logoUrl: null, isActive: true, isDummyBrand: true },
  { name: "Korek Telecom", slug: "korek-telecom", category: "Telecom", competitorGroup: "telecom", color: "#B91C1C", logoUrl: null, isActive: true, isDummyBrand: true },
  { name: "Samsung", slug: "samsung", category: "Technology", competitorGroup: "technology", color: "#1428A0", logoUrl: null, isActive: true, isDummyBrand: true },
  { name: "LG", slug: "lg", category: "Technology", competitorGroup: "technology", color: "#A50034", logoUrl: null, isActive: true, isDummyBrand: true },
  { name: "Huawei", slug: "huawei", category: "Technology", competitorGroup: "technology", color: "#CF0A2C", logoUrl: null, isActive: true, isDummyBrand: true },
  { name: "Toyota", slug: "toyota", category: "Automotive", competitorGroup: "automotive", color: "#DC2626", logoUrl: null, isActive: true, isDummyBrand: true },
  { name: "Kia", slug: "kia", category: "Automotive", competitorGroup: "automotive", color: "#9A3412", logoUrl: null, isActive: true, isDummyBrand: true },
  { name: "Hyundai", slug: "hyundai", category: "Automotive", competitorGroup: "automotive", color: "#1D4ED8", logoUrl: null, isActive: true, isDummyBrand: true },
  { name: "Nestle", slug: "nestle", category: "FMCG", competitorGroup: "fmcg", color: "#0F766E", logoUrl: null, isActive: true, isDummyBrand: true },
  { name: "Unilever", slug: "unilever", category: "FMCG", competitorGroup: "fmcg", color: "#1E40AF", logoUrl: null, isActive: true, isDummyBrand: true },
  { name: "Careem", slug: "careem", category: "Delivery", competitorGroup: "delivery", color: "#16A34A", logoUrl: null, isActive: true, isDummyBrand: true },
  { name: "Talabat", slug: "talabat", category: "Delivery", competitorGroup: "delivery", color: "#F97316", logoUrl: null, isActive: true, isDummyBrand: true },
  { name: "Carrefour", slug: "carrefour", category: "Retail", competitorGroup: "retail", color: "#2563EB", logoUrl: null, isActive: true, isDummyBrand: true },
  { name: "Visa", slug: "visa", category: "Financial Services", competitorGroup: "finance", color: "#1A1F71", logoUrl: null, isActive: true, isDummyBrand: true },
  { name: "Mastercard", slug: "mastercard", category: "Financial Services", competitorGroup: "finance", color: "#EB001B", logoUrl: null, isActive: false, isDummyBrand: true },
];

export const OVERVIEW_DEMO_PLATFORMS: OverviewDemoPlatformSpec[] = [
  { name: "Meta", slug: "meta", icon: "social", color: "#1877F2", isActive: true },
  { name: "TikTok", slug: "tiktok", icon: "social", color: "#111111", isActive: true },
  { name: "YouTube", slug: "youtube", icon: "video", color: "#FF0000", isActive: true },
  { name: "Google Ads", slug: "google-ads", icon: "ads", color: "#4285F4", isActive: true },
  { name: "Web Advertising", slug: "web-advertising", icon: "web", color: "#7C3AED", isActive: true },
  { name: "OOH", slug: "ooh", icon: "ooh", color: "#FF8A00", isActive: true },
];

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function stringHash(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededUnit(input: string): number {
  return stringHash(input) / 4294967295;
}

function campaignObjective(category: string, slot: number): string {
  const map: Record<string, string[]> = {
    Beverages: [
      "Drive seasonal refreshment demand across Iraq.",
      "Defend household share during peak meal-time moments.",
      "Grow youth-led brand relevance and reach.",
    ],
    Telecom: [
      "Acquire new data subscribers and boost bundle uptake.",
      "Promote home broadband and always-on connectivity.",
      "Defend high-value recharge moments during seasonal peaks.",
    ],
    Technology: [
      "Support premium device launches and upgrades.",
      "Grow consideration for connected home and mobile products.",
      "Keep high-intent shoppers active across digital touchpoints.",
    ],
    Automotive: [
      "Increase dealer traffic and support vehicle launches.",
      "Grow SUV and family-vehicle consideration.",
      "Defend share during key automotive shopping windows.",
    ],
    FMCG: [
      "Increase household basket size and repeat purchase.",
      "Win value-driven shopping moments in family audiences.",
      "Protect category presence during promotional periods.",
    ],
    Delivery: [
      "Boost app orders during high-frequency meal occasions.",
      "Increase weekend and late-evening order volume.",
      "Grow app usage with tactical value messaging.",
    ],
    Retail: [
      "Increase store traffic during promotional windows.",
      "Capture school-season and household shopping occasions.",
      "Drive basket growth with price-led messaging.",
    ],
    "Financial Services": [
      "Increase everyday digital payment usage.",
      "Grow merchant checkout preference and frequency.",
      "Build trust during premium shopping periods.",
    ],
  };

  const objectives = map[category] ?? map.FMCG;
  return objectives[slot % objectives.length] ?? objectives[0]!;
}

function buildCampaignName(brand: OverviewDemoBrandSpec, slot: number, brandIndex: number): string {
  const templates = CATEGORY_TEMPLATES[brand.category] ?? CATEGORY_TEMPLATES.FMCG;
  const template = templates[(brandIndex + slot) % templates.length] ?? templates[0]!;
  return `${brand.name} ${template}`;
}

function platformMixForCategory(category: string, brandIndex: number, slot: number): string[] {
  const common = ["meta", "youtube"];
  const mixes: Record<string, string[][]> = {
    Beverages: [
      ["meta", "youtube", "ooh"],
      ["meta", "tiktok", "youtube", "web-advertising"],
      ["youtube", "ooh", "google-ads"],
    ],
    Telecom: [
      ["meta", "youtube", "google-ads"],
      ["meta", "tiktok", "web-advertising"],
      ["youtube", "google-ads", "web-advertising"],
    ],
    Technology: [
      ["youtube", "google-ads", "web-advertising"],
      ["meta", "youtube", "google-ads"],
      ["meta", "tiktok", "youtube"],
    ],
    Automotive: [
      ["youtube", "ooh", "google-ads"],
      ["meta", "youtube", "ooh"],
      ["meta", "google-ads", "web-advertising"],
    ],
    FMCG: [
      ["meta", "youtube", "web-advertising"],
      ["meta", "ooh", "web-advertising"],
      ["youtube", "ooh", "google-ads"],
    ],
    Delivery: [
      ["meta", "tiktok", "google-ads"],
      ["meta", "tiktok", "web-advertising"],
      ["youtube", "google-ads", "web-advertising"],
    ],
    Retail: [
      ["meta", "youtube", "google-ads", "web-advertising"],
      ["meta", "ooh", "web-advertising"],
      ["youtube", "google-ads", "ooh"],
    ],
    "Financial Services": [
      ["youtube", "google-ads", "web-advertising"],
      ["meta", "youtube", "google-ads"],
      ["meta", "web-advertising", "google-ads"],
    ],
  };

  const variants = mixes[category] ?? [common];
  return variants[(brandIndex + slot) % variants.length] ?? common;
}

function getSeasonalMultiplier(date: Date, category: string, platformSlug: string): number {
  const iso = formatIsoDate(date);
  let multiplier = 1;

  if (
    (iso >= "2025-02-28" && iso <= "2025-03-29") ||
    (iso >= "2026-02-18" && iso <= "2026-03-19")
  ) {
    multiplier *= 1.42;
  } else if (
    (iso >= "2025-03-30" && iso <= "2025-04-05") ||
    (iso >= "2026-03-20" && iso <= "2026-03-27")
  ) {
    multiplier *= 1.26;
  }

  const month = date.getMonth() + 1;
  if ([6, 7, 8].includes(month) && category === "Beverages") {
    multiplier *= 1.2;
  }
  if ([8, 9].includes(month) && ["Technology", "Retail", "Telecom"].includes(category)) {
    multiplier *= 1.12;
  }
  if ([11, 12].includes(month) && ["Automotive", "Retail", "Financial Services"].includes(category)) {
    multiplier *= 1.17;
  }
  if (month === 1) {
    multiplier *= 0.86;
  }
  if (platformSlug === "ooh" && [11, 12].includes(month)) {
    multiplier *= 1.06;
  }

  return multiplier;
}

function getWeekpartMultiplier(date: Date, category: string): number {
  const day = date.getDay();
  const isWeekend = day === 5 || day === 6;

  if (!isWeekend) {
    return 1;
  }

  if (["Beverages", "Delivery", "Retail"].includes(category)) {
    return 1.08;
  }

  if (["Financial Services", "Technology"].includes(category)) {
    return 0.93;
  }

  return 0.98;
}

function getPhaseMultiplier(startDate: string, endDate: string | null, spendDate: Date): number {
  const start = parseIsoDate(startDate);
  const effectiveEnd = endDate ? parseIsoDate(endDate) : parseIsoDate(OVERVIEW_DEMO_SEED_END);
  const totalDays = Math.max(1, Math.round((effectiveEnd.getTime() - start.getTime()) / DAY_MS) + 1);
  const offset = Math.max(0, Math.round((spendDate.getTime() - start.getTime()) / DAY_MS));
  const progress = offset / totalDays;

  if (progress < 0.12) return 0.74;
  if (progress < 0.3) return 0.94;
  if (progress < 0.72) return 1.16;
  if (progress < 0.9) return 1.02;
  return 0.82;
}

function baseCampaignStart(brandIndex: number, slot: number): Date {
  if (slot === 0) return addDays(parseIsoDate("2024-08-01"), (brandIndex * 23) % 260);
  if (slot === 1) return addDays(parseIsoDate("2025-04-01"), (brandIndex * 19) % 360);
  return addDays(parseIsoDate("2025-01-10"), (brandIndex * 29) % 300);
}

function campaignDurationDays(category: string, slot: number, brandIndex: number): number {
  const base = slot === 0 ? 78 : slot === 1 ? 112 : 56;
  const categoryBump = category === "Beverages" ? 18 : category === "Telecom" ? 24 : 12;
  return base + categoryBump + ((brandIndex * 11 + slot * 7) % 44);
}

export function buildOverviewDemoCampaigns(currentDate = OVERVIEW_DEMO_SEED_END): OverviewDemoCampaignSpec[] {
  const today = parseIsoDate(currentDate);
  const campaigns: OverviewDemoCampaignSpec[] = [];

  OVERVIEW_DEMO_BRANDS.forEach((brand, brandIndex) => {
    const createCampaign = (slot: number) => {
      const name = buildCampaignName(brand, slot, brandIndex);
      const start = baseCampaignStart(brandIndex, slot);
      const duration = campaignDurationDays(brand.category, slot, brandIndex);
      let end = addDays(start, duration);
      let status: OverviewDemoCampaignSpec["status"] = "completed";

      if (slot === 1) {
        if (!brand.isActive || brandIndex % 7 === 0) {
          end = addDays(start, Math.max(42, duration - 20));
          status = end.getTime() >= today.getTime() ? "completed" : "completed";
        } else {
          status = "active";
          if (brandIndex % 3 === 0) {
            end = addDays(today, 75 + (brandIndex % 5) * 18);
          } else {
            end = addDays(today, 18 + (brandIndex % 4) * 14);
          }
        }
      }

      if (slot === 2) {
        if (brandIndex % 4 !== 0) return;
        if (brand.isActive && brandIndex % 8 === 0) {
          status = "scheduled";
          const futureStart = addDays(today, 14 + (brandIndex % 5) * 9);
          const futureEnd = addDays(futureStart, 80 + (brandIndex % 6) * 11);
          campaigns.push({
            brandName: brand.name,
            name,
            startDate: formatIsoDate(futureStart),
            endDate: formatIsoDate(futureEnd),
            status,
            budgetAmount: roundMoney((145000 + brandIndex * 11000) * (CATEGORY_FACTORS[brand.category] ?? 1)),
            budgetCurrency: "USD",
            objective: campaignObjective(brand.category, slot),
            platformSlugs: platformMixForCategory(brand.category, brandIndex, slot),
          });
          return;
        }
      }

      campaigns.push({
        brandName: brand.name,
        name,
        startDate: formatIsoDate(start),
        endDate: status === "active" && brandIndex % 3 === 1 ? null : formatIsoDate(end),
        status,
        budgetAmount: roundMoney((135000 + brandIndex * 9500 + slot * 18000) * (CATEGORY_FACTORS[brand.category] ?? 1)),
        budgetCurrency: "USD",
        objective: campaignObjective(brand.category, slot),
        platformSlugs: platformMixForCategory(brand.category, brandIndex, slot),
      });
    };

    createCampaign(0);
    createCampaign(1);
    createCampaign(2);
  });

  return campaigns.slice(0, 52);
}

export function buildOverviewDemoSpendSeeds(campaigns = buildOverviewDemoCampaigns()): OverviewDemoSpendSeed[] {
  const seedStart = parseIsoDate(OVERVIEW_DEMO_SEED_START);
  const seedEnd = parseIsoDate(OVERVIEW_DEMO_SEED_END);
  const brandsByName = new Map(OVERVIEW_DEMO_BRANDS.map((brand) => [brand.name, brand]));
  const rows: OverviewDemoSpendSeed[] = [];

  for (const campaign of campaigns) {
    if (campaign.status === "scheduled") continue;

    const brand = brandsByName.get(campaign.brandName);
    if (!brand) continue;

    const start = parseIsoDate(campaign.startDate);
    const rawEnd = campaign.endDate ? parseIsoDate(campaign.endDate) : seedEnd;
    const effectiveStart = start.getTime() < seedStart.getTime() ? seedStart : start;
    const effectiveEnd = rawEnd.getTime() > seedEnd.getTime() ? seedEnd : rawEnd;
    if (effectiveStart.getTime() > effectiveEnd.getTime()) continue;

    const categoryFactor = CATEGORY_FACTORS[brand.category] ?? 1;
    const baseDaily = 780 * categoryFactor + (stringHash(campaign.name) % 720);

    for (const platformSlug of campaign.platformSlugs) {
      const platformWeight = PLATFORM_WEIGHTS[platformSlug] ?? 1;
      for (
        let cursor = new Date(effectiveStart.getTime());
        cursor.getTime() <= effectiveEnd.getTime();
        cursor = addDays(cursor, 1)
      ) {
        const dateKey = formatIsoDate(cursor);
        const probabilitySeed = seededUnit(`${campaign.name}:${platformSlug}:${dateKey}:p`);
        const varianceSeed = seededUnit(`${campaign.name}:${platformSlug}:${dateKey}:v`);
        const pulseSeed = seededUnit(`${campaign.name}:${platformSlug}:${dateKey}:u`);
        const seasonal = getSeasonalMultiplier(cursor, brand.category, platformSlug);
        const weekpart = getWeekpartMultiplier(cursor, brand.category);
        const phase = getPhaseMultiplier(campaign.startDate, campaign.endDate, cursor);
        const activityProbability = clamp(0.38 + (seasonal - 1) * 0.22 + (phase - 0.8) * 0.18 + (brand.isActive ? 0.08 : -0.05), 0.28, 0.92);

        if (probabilitySeed > activityProbability) {
          continue;
        }

        const amount =
          baseDaily *
          platformWeight *
          seasonal *
          weekpart *
          phase *
          (0.84 + varianceSeed * 0.34) *
          (0.96 + pulseSeed * 0.14);

        rows.push({
          brandName: brand.name,
          campaignName: campaign.name,
          platformSlug,
          spendDate: dateKey,
          amount: roundMoney(amount),
          currency: "USD",
        });
      }
    }
  }

  return rows;
}
