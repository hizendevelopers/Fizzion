import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

type SupabaseRow = Record<string, unknown>;

type BrandSpec = {
  name: string;
  category: string;
  parentCompany: string;
  competitorGroup: string;
  color: string;
  logoUrl: string | null;
};

type ChannelSpec = {
  name: string;
  slug: string;
  genre: string;
  primaryLanguage: string;
  category: string;
};

type CampaignSpec = {
  name: string;
  brandName: string;
  startDate: string;
  endDate: string | null;
  status: "active" | "completed";
  budgetAmount: number;
  objective: string;
  keywords: string[];
  expectedCreatives: number;
  channelSlugs: string[];
  factor: number;
};

type DetectionSeed = {
  organization_id: string;
  channel_id: string;
  campaign_id: string;
  brand_id: string;
  detected_at: string;
  genre: string;
  language: string;
  daypart: string;
  duration_seconds: number;
  copy_name: string;
  cost: number;
  currency: string;
  sov_percentage: number;
  creative_url: string;
  confidence_score: number;
  review_status: string;
  preview_poster_url: string | null;
  is_uploaded_asset: boolean;
  source: string;
};

const ROOT_DIR = path.resolve(__dirname, "../../..");
const ENV_PATH = path.join(ROOT_DIR, ".env.local");
const ORG_SLUG = "coca_cola_iraq";
const DAYPARTS = [
  { label: "Morning", startHour: 5, endHour: 11 },
  { label: "Afternoon", startHour: 12, endHour: 16 },
  { label: "Evening", startHour: 17, endHour: 18 },
  { label: "Pre Prime Time", startHour: 19, endHour: 19 },
  { label: "Prime Time", startHour: 20, endHour: 22 },
  { label: "Late Prime Time", startHour: 23, endHour: 4 },
] as const;
const DURATION_OPTIONS = [10, 15, 20, 25, 30, 45, 60] as const;
const COPY_NAMES = [
  "Stronger Together",
  "Extra Fizz",
  "Summer Refresh",
  "Ramadan Offer",
  "Eid Celebration",
  "Family Pack",
  "Unlimited Data",
  "Connect More",
  "Smart Choice",
  "Premium Launch",
  "Weekend Deal",
  "Back to School",
  "New Model Launch",
  "Everyday Savings",
] as const;
const PREVIEW_ASSETS = [
  {
    videoUrl: "/demo/tv/manual-detections/bonus-02.mp4",
    posterUrl: "/demo/tv/manual-detections/bonus-02.jpg",
  },
  {
    videoUrl: "/demo/tv/manual-detections/lifebuoy-01.mp4",
    posterUrl: "/demo/tv/manual-detections/lifebuoy-01.jpg",
  },
  {
    videoUrl: "/demo/tv/manual-detections/tapal-danedar-03.mp4",
    posterUrl: "/demo/tv/manual-detections/tapal-danedar-03.jpg",
  },
] as const;

const BRAND_SPECS: BrandSpec[] = [
  { name: "Zain Iraq", category: "Telecom", parentCompany: "Zain Group", competitorGroup: "telecom", color: "#0B8B5C", logoUrl: null },
  { name: "Asiacell", category: "Telecom", parentCompany: "Ooredoo", competitorGroup: "telecom", color: "#F05A28", logoUrl: null },
  { name: "Korek Telecom", category: "Telecom", parentCompany: "Korek Telecom", competitorGroup: "telecom", color: "#C61C3E", logoUrl: null },
  { name: "Pepsi", category: "Beverages", parentCompany: "PepsiCo", competitorGroup: "beverages", color: "#005CB9", logoUrl: null },
  { name: "Coca-Cola", category: "Beverages", parentCompany: "The Coca-Cola Company", competitorGroup: "beverages", color: "#C8102E", logoUrl: null },
  { name: "Samsung", category: "Technology", parentCompany: "Samsung", competitorGroup: "technology", color: "#1428A0", logoUrl: null },
  { name: "LG", category: "Technology", parentCompany: "LG", competitorGroup: "technology", color: "#A50034", logoUrl: null },
  { name: "Toyota", category: "Automotive", parentCompany: "Toyota", competitorGroup: "automotive", color: "#D71920", logoUrl: null },
  { name: "Kia", category: "Automotive", parentCompany: "Kia", competitorGroup: "automotive", color: "#05141F", logoUrl: null },
  { name: "Hyundai", category: "Automotive", parentCompany: "Hyundai", competitorGroup: "automotive", color: "#002C5F", logoUrl: null },
  { name: "Nestle", category: "FMCG", parentCompany: "Nestle", competitorGroup: "fmcg", color: "#6C7A89", logoUrl: null },
  { name: "Unilever", category: "FMCG", parentCompany: "Unilever", competitorGroup: "fmcg", color: "#1C6FB7", logoUrl: null },
  { name: "Huawei", category: "Technology", parentCompany: "Huawei", competitorGroup: "technology", color: "#CF0A2C", logoUrl: null },
  { name: "Careem", category: "Mobility", parentCompany: "Careem", competitorGroup: "mobility", color: "#00C389", logoUrl: null },
  { name: "Talabat", category: "Delivery", parentCompany: "Talabat", competitorGroup: "delivery", color: "#FF5A00", logoUrl: null },
  { name: "Carrefour", category: "Retail", parentCompany: "Majid Al Futtaim", competitorGroup: "retail", color: "#1566C0", logoUrl: null },
  { name: "Visa", category: "Financial Services", parentCompany: "Visa", competitorGroup: "finance", color: "#1A1F71", logoUrl: null },
  { name: "Mastercard", category: "Financial Services", parentCompany: "Mastercard", competitorGroup: "finance", color: "#EB001B", logoUrl: null },
  { name: "Tapal", category: "Beverages", parentCompany: "Tapal Tea", competitorGroup: "legacy_upload", color: "#8A5A2B", logoUrl: null },
  { name: "Lifebuoy", category: "FMCG", parentCompany: "Unilever", competitorGroup: "legacy_upload", color: "#D31145", logoUrl: null },
  { name: "Bonus", category: "FMCG", parentCompany: "Bonus", competitorGroup: "legacy_upload", color: "#6D28D9", logoUrl: null },
];

const CHANNEL_SPECS: ChannelSpec[] = [
  { name: "Al Iraqiya", slug: "al-iraqiya", genre: "News", primaryLanguage: "Arabic", category: "News" },
  { name: "Al Sharqiya", slug: "al-sharqiya", genre: "General Entertainment", primaryLanguage: "Arabic", category: "Entertainment" },
  { name: "Alsumaria TV", slug: "alsumaria-tv", genre: "General Entertainment", primaryLanguage: "Arabic", category: "Entertainment" },
  { name: "Dijlah TV", slug: "dijlah-tv", genre: "News", primaryLanguage: "Arabic", category: "News" },
  { name: "Al Rasheed TV", slug: "al-rasheed-tv", genre: "News", primaryLanguage: "Arabic", category: "News" },
  { name: "Al Forat TV", slug: "al-forat-tv", genre: "Lifestyle", primaryLanguage: "Arabic", category: "Lifestyle" },
  { name: "Kurdistan 24", slug: "kurdistan-24", genre: "News", primaryLanguage: "Kurdish", category: "News" },
  { name: "Rudaw", slug: "rudaw", genre: "News", primaryLanguage: "Kurdish", category: "News" },
  { name: "NRT", slug: "nrt", genre: "General Entertainment", primaryLanguage: "Kurdish", category: "Entertainment" },
  { name: "UTV Iraq", slug: "utv-iraq", genre: "General Entertainment", primaryLanguage: "Arabic", category: "Entertainment" },
  { name: "Al Rabiaa", slug: "al-rabiaa", genre: "Sports", primaryLanguage: "Arabic", category: "Sports" },
  { name: "Iraqi News", slug: "iraqi-news", genre: "News", primaryLanguage: "Arabic", category: "News" },
  { name: "Zagros TV", slug: "zagros-tv", genre: "Drama", primaryLanguage: "Kurdish", category: "Drama" },
  { name: "Asia Network Television", slug: "asia-network-television", genre: "Family", primaryLanguage: "Arabic / Kurdish", category: "Family" },
];

const CAMPAIGN_SPECS: CampaignSpec[] = [
  { name: "Zain Ramadan Connectivity", brandName: "Zain Iraq", startDate: "2024-02-15", endDate: "2024-04-20", status: "completed", budgetAmount: 2850000, objective: "Drive Ramadan recharge usage", keywords: ["ramadan", "connectivity"], expectedCreatives: 2, channelSlugs: ["al-iraqiya", "al-sharqiya", "alsumaria-tv", "utv-iraq"], factor: 1.22 },
  { name: "Zain Summer Streaming", brandName: "Zain Iraq", startDate: "2025-06-01", endDate: "2025-09-15", status: "completed", budgetAmount: 3050000, objective: "Promote summer streaming bundles", keywords: ["summer", "streaming"], expectedCreatives: 2, channelSlugs: ["al-sharqiya", "alsumaria-tv", "al-rabiaa"], factor: 1.18 },
  { name: "Zain Fiber for Families", brandName: "Zain Iraq", startDate: "2026-03-01", endDate: "2026-12-31", status: "active", budgetAmount: 4120000, objective: "Grow home broadband signups", keywords: ["fiber", "family"], expectedCreatives: 3, channelSlugs: ["al-iraqiya", "al-sharqiya", "utv-iraq", "iraqi-news"], factor: 1.3 },
  { name: "Asiacell Eid Rewards", brandName: "Asiacell", startDate: "2024-03-10", endDate: "2024-05-10", status: "completed", budgetAmount: 2760000, objective: "Drive Eid roaming and rewards", keywords: ["eid", "rewards"], expectedCreatives: 2, channelSlugs: ["al-iraqiya", "dijlah-tv", "al-rabiaa"], factor: 1.1 },
  { name: "Asiacell Unlimited Data", brandName: "Asiacell", startDate: "2025-10-01", endDate: "2026-03-31", status: "active", budgetAmount: 3980000, objective: "Acquire youth data subscribers", keywords: ["data", "unlimited"], expectedCreatives: 3, channelSlugs: ["alsumaria-tv", "utv-iraq", "al-rabiaa", "rudaw"], factor: 1.28 },
  { name: "Asiacell Back to School", brandName: "Asiacell", startDate: "2026-07-15", endDate: "2026-10-15", status: "active", budgetAmount: 2640000, objective: "Win student segment bundles", keywords: ["school", "students"], expectedCreatives: 2, channelSlugs: ["al-sharqiya", "utv-iraq", "asia-network-television"], factor: 1.16 },
  { name: "Korek National Coverage", brandName: "Korek Telecom", startDate: "2024-08-01", endDate: "2024-12-31", status: "completed", budgetAmount: 2480000, objective: "Expand network perception", keywords: ["coverage", "network"], expectedCreatives: 2, channelSlugs: ["al-iraqiya", "kurdistan-24", "rudaw"], factor: 1.05 },
  { name: "Korek Prime Bundles", brandName: "Korek Telecom", startDate: "2025-12-01", endDate: "2026-09-30", status: "active", budgetAmount: 3520000, objective: "Upsell premium bundles", keywords: ["prime", "bundles"], expectedCreatives: 3, channelSlugs: ["rudaw", "kurdistan-24", "nrt", "zagros-tv"], factor: 1.21 },
  { name: "Pepsi Summer Refresh", brandName: "Pepsi", startDate: "2025-05-01", endDate: "2025-08-31", status: "completed", budgetAmount: 3180000, objective: "Own summer refresh occasions", keywords: ["summer", "refresh"], expectedCreatives: 2, channelSlugs: ["alsumaria-tv", "al-rabiaa", "al-sharqiya"], factor: 1.24 },
  { name: "Pepsi Match Day", brandName: "Pepsi", startDate: "2026-01-15", endDate: "2026-11-30", status: "active", budgetAmount: 4380000, objective: "Associate with live sports viewing", keywords: ["sports", "match"], expectedCreatives: 3, channelSlugs: ["al-rabiaa", "al-sharqiya", "utv-iraq"], factor: 1.33 },
  { name: "Coca-Cola Ramadan Together", brandName: "Coca-Cola", startDate: "2024-02-20", endDate: "2024-04-25", status: "completed", budgetAmount: 3360000, objective: "Build Ramadan meal-time affinity", keywords: ["ramadan", "iftar"], expectedCreatives: 2, channelSlugs: ["al-iraqiya", "alsumaria-tv", "al-forat-tv"], factor: 1.26 },
  { name: "Coca-Cola Eid Celebration", brandName: "Coca-Cola", startDate: "2026-03-01", endDate: "2026-08-31", status: "active", budgetAmount: 4660000, objective: "Win Eid celebration moments", keywords: ["eid", "celebration"], expectedCreatives: 3, channelSlugs: ["al-sharqiya", "alsumaria-tv", "utv-iraq", "asia-network-television"], factor: 1.37 },
  { name: "Samsung Smart Living", brandName: "Samsung", startDate: "2025-11-01", endDate: "2026-06-30", status: "completed", budgetAmount: 2890000, objective: "Drive appliance launches", keywords: ["smart", "home"], expectedCreatives: 2, channelSlugs: ["al-iraqiya", "al-forat-tv", "utv-iraq"], factor: 1.09 },
  { name: "Samsung Galaxy Launch", brandName: "Samsung", startDate: "2026-06-01", endDate: "2026-10-31", status: "active", budgetAmount: 4270000, objective: "Launch new flagship devices", keywords: ["galaxy", "launch"], expectedCreatives: 3, channelSlugs: ["al-sharqiya", "alsumaria-tv", "nrt"], factor: 1.29 },
  { name: "LG Home Upgrade", brandName: "LG", startDate: "2024-10-01", endDate: "2025-01-31", status: "completed", budgetAmount: 2140000, objective: "Promote appliance upgrades", keywords: ["upgrade", "home"], expectedCreatives: 2, channelSlugs: ["al-forat-tv", "utv-iraq"], factor: 0.98 },
  { name: "LG Family Entertainment", brandName: "LG", startDate: "2026-02-01", endDate: "2026-09-15", status: "active", budgetAmount: 3010000, objective: "Push large-screen TV sales", keywords: ["family", "entertainment"], expectedCreatives: 2, channelSlugs: ["alsumaria-tv", "asia-network-television", "zagros-tv"], factor: 1.08 },
  { name: "Toyota New Model Launch", brandName: "Toyota", startDate: "2025-09-01", endDate: "2026-02-28", status: "completed", budgetAmount: 3560000, objective: "Launch new SUV range", keywords: ["launch", "suv"], expectedCreatives: 2, channelSlugs: ["al-iraqiya", "dijlah-tv", "iraqi-news"], factor: 1.19 },
  { name: "Toyota Everyday Confidence", brandName: "Toyota", startDate: "2026-04-01", endDate: "2026-12-31", status: "active", budgetAmount: 4090000, objective: "Support dealer traffic", keywords: ["confidence", "dealers"], expectedCreatives: 3, channelSlugs: ["al-iraqiya", "utv-iraq", "al-rabiaa"], factor: 1.27 },
  { name: "Kia Weekend Drive", brandName: "Kia", startDate: "2024-11-01", endDate: "2025-03-15", status: "completed", budgetAmount: 2280000, objective: "Build consideration for family vehicles", keywords: ["weekend", "drive"], expectedCreatives: 2, channelSlugs: ["al-sharqiya", "dijlah-tv"], factor: 1.01 },
  { name: "Kia Premium Launch", brandName: "Kia", startDate: "2026-05-01", endDate: "2026-11-15", status: "active", budgetAmount: 3340000, objective: "Launch premium sedan lineup", keywords: ["premium", "launch"], expectedCreatives: 2, channelSlugs: ["al-sharqiya", "utv-iraq", "iraqi-news"], factor: 1.13 },
  { name: "Hyundai Family SUV", brandName: "Hyundai", startDate: "2025-07-01", endDate: "2025-11-30", status: "completed", budgetAmount: 2440000, objective: "Promote family SUV", keywords: ["family", "suv"], expectedCreatives: 2, channelSlugs: ["alsumaria-tv", "dijlah-tv"], factor: 1.02 },
  { name: "Hyundai Smart Value", brandName: "Hyundai", startDate: "2026-01-01", endDate: "2026-10-31", status: "active", budgetAmount: 3250000, objective: "Drive value-led showroom visits", keywords: ["smart", "value"], expectedCreatives: 2, channelSlugs: ["al-iraqiya", "al-sharqiya", "zagros-tv"], factor: 1.1 },
  { name: "Nestle Family Breakfast", brandName: "Nestle", startDate: "2025-01-01", endDate: "2025-04-30", status: "completed", budgetAmount: 1910000, objective: "Win breakfast occasions", keywords: ["breakfast", "family"], expectedCreatives: 2, channelSlugs: ["al-forat-tv", "asia-network-television"], factor: 0.94 },
  { name: "Nestle Back to School", brandName: "Nestle", startDate: "2026-07-20", endDate: "2026-09-30", status: "active", budgetAmount: 2740000, objective: "Support school season purchases", keywords: ["school", "family"], expectedCreatives: 2, channelSlugs: ["alsumaria-tv", "asia-network-television", "al-forat-tv"], factor: 1.04 },
  { name: "Unilever Everyday Care", brandName: "Unilever", startDate: "2024-09-01", endDate: "2025-02-28", status: "completed", budgetAmount: 2050000, objective: "Drive household product frequency", keywords: ["care", "everyday"], expectedCreatives: 2, channelSlugs: ["al-iraqiya", "al-forat-tv"], factor: 0.96 },
  { name: "Unilever Ramadan Essentials", brandName: "Unilever", startDate: "2026-02-15", endDate: "2026-05-31", status: "active", budgetAmount: 3120000, objective: "Grow Ramadan household basket", keywords: ["ramadan", "essentials"], expectedCreatives: 3, channelSlugs: ["al-iraqiya", "alsumaria-tv", "al-forat-tv"], factor: 1.14 },
  { name: "Huawei Connect More", brandName: "Huawei", startDate: "2025-03-01", endDate: "2025-06-30", status: "completed", budgetAmount: 1980000, objective: "Promote smart devices", keywords: ["connect", "devices"], expectedCreatives: 2, channelSlugs: ["al-sharqiya", "nrt"], factor: 0.93 },
  { name: "Huawei Premium Launch", brandName: "Huawei", startDate: "2026-04-15", endDate: "2026-11-30", status: "active", budgetAmount: 2980000, objective: "Launch premium handset", keywords: ["premium", "launch"], expectedCreatives: 2, channelSlugs: ["al-sharqiya", "rudaw", "kurdistan-24"], factor: 1.07 },
  { name: "Careem Everyday Savings", brandName: "Careem", startDate: "2025-05-01", endDate: "2025-08-31", status: "completed", budgetAmount: 1860000, objective: "Increase ride frequency", keywords: ["savings", "rides"], expectedCreatives: 2, channelSlugs: ["utv-iraq", "al-sharqiya"], factor: 0.91 },
  { name: "Careem Weekend Deal", brandName: "Careem", startDate: "2026-03-15", endDate: "2026-10-31", status: "active", budgetAmount: 2570000, objective: "Promote delivery and mobility bundles", keywords: ["weekend", "deal"], expectedCreatives: 2, channelSlugs: ["utv-iraq", "alsumaria-tv", "al-rabiaa"], factor: 1.03 },
  { name: "Talabat Family Pack", brandName: "Talabat", startDate: "2025-02-01", endDate: "2025-05-31", status: "completed", budgetAmount: 1770000, objective: "Drive family meal orders", keywords: ["family", "pack"], expectedCreatives: 2, channelSlugs: ["alsumaria-tv", "al-forat-tv"], factor: 0.9 },
  { name: "Talabat Ramadan Offer", brandName: "Talabat", startDate: "2026-02-20", endDate: "2026-04-30", status: "active", budgetAmount: 2840000, objective: "Own Iftar ordering moments", keywords: ["ramadan", "offer"], expectedCreatives: 3, channelSlugs: ["alsumaria-tv", "al-sharqiya", "utv-iraq"], factor: 1.12 },
  { name: "Carrefour Everyday Savings", brandName: "Carrefour", startDate: "2025-09-01", endDate: "2026-01-31", status: "completed", budgetAmount: 2230000, objective: "Promote weekly retail offers", keywords: ["savings", "retail"], expectedCreatives: 2, channelSlugs: ["al-iraqiya", "al-forat-tv"], factor: 0.97 },
  { name: "Carrefour Back to School", brandName: "Carrefour", startDate: "2026-07-10", endDate: "2026-09-30", status: "active", budgetAmount: 2910000, objective: "Capture school-season grocery trips", keywords: ["school", "retail"], expectedCreatives: 2, channelSlugs: ["al-iraqiya", "utv-iraq", "asia-network-television"], factor: 1.06 },
  { name: "Visa Smart Choice", brandName: "Visa", startDate: "2025-10-01", endDate: "2026-02-28", status: "completed", budgetAmount: 2160000, objective: "Increase digital payments trust", keywords: ["smart", "payments"], expectedCreatives: 2, channelSlugs: ["al-iraqiya", "iraqi-news"], factor: 0.95 },
  { name: "Visa Connect More", brandName: "Visa", startDate: "2026-04-01", endDate: "2026-12-15", status: "active", budgetAmount: 3070000, objective: "Grow merchant checkout usage", keywords: ["connect", "payments"], expectedCreatives: 2, channelSlugs: ["al-iraqiya", "al-sharqiya", "iraqi-news"], factor: 1.05 },
  { name: "Mastercard Premium Launch", brandName: "Mastercard", startDate: "2025-11-01", endDate: "2026-03-31", status: "completed", budgetAmount: 2090000, objective: "Promote premium card proposition", keywords: ["premium", "payments"], expectedCreatives: 2, channelSlugs: ["al-iraqiya", "rudaw"], factor: 0.94 },
  { name: "Mastercard Connect More", brandName: "Mastercard", startDate: "2026-05-15", endDate: "2026-12-31", status: "active", budgetAmount: 2960000, objective: "Support digital payment adoption", keywords: ["connect", "checkout"], expectedCreatives: 2, channelSlugs: ["al-sharqiya", "rudaw", "iraqi-news"], factor: 1.02 },
  { name: "Tapal Legacy Upload Spot", brandName: "Tapal", startDate: "2026-07-24", endDate: "2026-08-31", status: "active", budgetAmount: 175000, objective: "Preserve uploaded media linkage", keywords: ["legacy", "upload"], expectedCreatives: 1, channelSlugs: ["al-sharqiya"], factor: 1 },
  { name: "Lifebuoy Legacy Upload Spot", brandName: "Lifebuoy", startDate: "2026-07-24", endDate: "2026-08-31", status: "active", budgetAmount: 175000, objective: "Preserve uploaded media linkage", keywords: ["legacy", "upload"], expectedCreatives: 1, channelSlugs: ["alsumaria-tv"], factor: 1 },
  { name: "Bonus Legacy Upload Spot", brandName: "Bonus", startDate: "2026-07-24", endDate: "2026-08-31", status: "active", budgetAmount: 175000, objective: "Preserve uploaded media linkage", keywords: ["legacy", "upload"], expectedCreatives: 1, channelSlugs: ["al-iraqiya"], factor: 1 },
];

function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(`Missing env file: ${ENV_PATH}`);
  }

  const contents = fs.readFileSync(ENV_PATH, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function createSeededRandom(seed: number) {
  let current = seed >>> 0;
  return () => {
    current += 0x6d2b79f5;
    let t = current;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseBaghdadDate(dateValue: string) {
  return new Date(`${dateValue}T12:00:00+03:00`);
}

function formatDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getDaypart(hour: number) {
  for (const daypart of DAYPARTS) {
    if (daypart.startHour <= daypart.endHour) {
      if (hour >= daypart.startHour && hour <= daypart.endHour) {
        return daypart.label;
      }
      continue;
    }

    if (hour >= daypart.startHour || hour <= daypart.endHour) {
      return daypart.label;
    }
  }

  return "Afternoon";
}

function getSeasonalMultiplier(date: Date) {
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  if ((month === 3 && day >= 1) || month === 4) return 1.3;
  if (month === 6) return 1.18;
  if (month === 7 || month === 8) return 1.12;
  if (month === 9) return 1.08;
  if (month === 11 || month === 12) return 1.06;

  return 0.92;
}

function getDaypartMultiplier(daypart: string) {
  switch (daypart) {
    case "Morning":
      return 0.74;
    case "Afternoon":
      return 0.88;
    case "Evening":
      return 1.02;
    case "Pre Prime Time":
      return 1.16;
    case "Prime Time":
      return 1.42;
    case "Late Prime Time":
      return 1.1;
    default:
      return 1;
  }
}

function getDurationMultiplier(durationSeconds: number) {
  return durationSeconds / 30;
}

function getLanguageForChannel(channel: ChannelSpec) {
  return channel.primaryLanguage;
}

async function chunkedUpsert<T extends SupabaseRow>(
  // The migration-backed tables in this repo evolve faster than generated types.
  // Keeping the seed client loose lets the deterministic demo script run reliably.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  table: string,
  rows: T[],
  onConflict?: string,
) {
  const chunkSize = 250;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const query = supabase.from(table).upsert(chunk, onConflict ? { onConflict } : undefined);
    const { error } = await query;
    if (error) {
      throw error;
    }
  }
}

async function chunkedInsert<T extends SupabaseRow>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  table: string,
  rows: T[],
) {
  const chunkSize = 400;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      throw error;
    }
  }
}

async function main() {
  loadEnvFile();

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL or key is missing in .env.local");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", ORG_SLUG)
    .limit(1)
    .maybeSingle();

  if (organizationError || !organization?.id) {
    throw new Error(`Organization ${ORG_SLUG} could not be found.`);
  }

  const organizationId = organization.id as string;

  const brandRows = BRAND_SPECS.map((brand) => ({
    organization_id: organizationId,
    name: brand.name,
    category: brand.category,
    parent_company: brand.parentCompany,
    competitor_group: brand.competitorGroup,
    is_active: true,
    slug: slugify(brand.name),
    logo_url: brand.logoUrl,
    color: brand.color,
    is_dummy_brand: true,
  }));

  await chunkedUpsert(supabase, "brands", brandRows, "organization_id,name");

  const { data: brands, error: brandsError } = await supabase
    .from("brands")
    .select("id,name")
    .eq("organization_id", organizationId)
    .in("name", BRAND_SPECS.map((brand) => brand.name));

  if (brandsError || !brands) {
    throw brandsError ?? new Error("Failed to load seeded brands.");
  }

  const brandIdByName = new Map(brands.map((brand) => [brand.name as string, brand.id as string]));

  const channelRows = CHANNEL_SPECS.map((channel) => ({
    organization_id: organizationId,
    name: channel.name,
    name_en: channel.name,
    slug: channel.slug,
    category: channel.category,
    source_type: "seeded_demo",
    recording_status: "active",
    retention_days: 30,
    expected_schedule: "24/7 monitored",
    country_code: "IQ",
    monitoring_market: "Iraq",
    source_verification_state: "verified",
    default_timezone: "Asia/Baghdad",
    source_timezone: "Asia/Baghdad",
    display_timezone: "Asia/Baghdad",
    source_authorization_status: "authorized",
    is_active: true,
    current_source_health: "healthy",
    country: "IQ",
    primary_language: channel.primaryLanguage,
    genre: channel.genre,
    notes: "TV dashboard deterministic Iraq demo seed",
  }));

  await chunkedUpsert(supabase, "tv_channels", channelRows, "organization_id,slug");

  const { data: channels, error: channelsError } = await supabase
    .from("tv_channels")
    .select("id,slug")
    .eq("organization_id", organizationId)
    .in("slug", CHANNEL_SPECS.map((channel) => channel.slug));

  if (channelsError || !channels) {
    throw channelsError ?? new Error("Failed to load seeded channels.");
  }

  const channelIdBySlug = new Map(channels.map((channel) => [channel.slug as string, channel.id as string]));
  const channelBySlug = new Map(CHANNEL_SPECS.map((channel) => [channel.slug, channel]));

  const campaignRows = CAMPAIGN_SPECS.map((campaign) => ({
    organization_id: organizationId,
    brand_id: brandIdByName.get(campaign.brandName),
    name: campaign.name,
    market: "Iraq",
    agency: "Hizen Media Lab",
    start_date: campaign.startDate,
    end_date: campaign.endDate,
    objective: campaign.objective,
    media_types: ["tv"],
    keywords: campaign.keywords,
    hashtags: [],
    expected_creatives: Array.from({ length: campaign.expectedCreatives }, (_, index) => `${campaign.name} Creative ${index + 1}`),
    status: campaign.status,
    budget_amount: campaign.budgetAmount,
    budget_currency: "PKR",
    medium: "tv",
    notes: "TV dashboard deterministic Iraq demo seed",
  }));

  await chunkedUpsert(supabase, "campaigns", campaignRows, "organization_id,name");

  const { data: campaigns, error: campaignsError } = await supabase
    .from("campaigns")
    .select("id,name")
    .eq("organization_id", organizationId)
    .in("name", CAMPAIGN_SPECS.map((campaign) => campaign.name));

  if (campaignsError || !campaigns) {
    throw campaignsError ?? new Error("Failed to load seeded campaigns.");
  }

  const campaignIdByName = new Map(campaigns.map((campaign) => [campaign.name as string, campaign.id as string]));
  const seededCampaignIds = [...campaignIdByName.values()];

  const { error: deleteBridgeError } = await supabase
    .from("tv_campaign_channels")
    .delete()
    .eq("organization_id", organizationId)
    .in("campaign_id", seededCampaignIds);

  if (deleteBridgeError) {
    throw deleteBridgeError;
  }

  const bridgeRows = CAMPAIGN_SPECS.flatMap((campaign) =>
    campaign.channelSlugs.map((channelSlug) => ({
      organization_id: organizationId,
      campaign_id: campaignIdByName.get(campaign.name),
      channel_id: channelIdBySlug.get(channelSlug),
    })),
  );

  await chunkedInsert(supabase, "tv_campaign_channels", bridgeRows);

  const { error: deleteDetectionError } = await supabase
    .from("tv_ad_detections")
    .delete()
    .eq("organization_id", organizationId)
    .in("source", ["tv_dashboard_seed_v2", "uploaded_asset_seed"]);

  if (deleteDetectionError) {
    throw deleteDetectionError;
  }

  const seededRandom = createSeededRandom(20260725);
  const startDate = parseBaghdadDate("2024-07-25");
  const endDate = parseBaghdadDate("2026-07-25");
  const detections: DetectionSeed[] = [];
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;

  for (let dayOffset = 0; dayOffset < totalDays; dayOffset += 1) {
    const currentDate = addDays(startDate, dayOffset);
    const currentDateValue = formatDate(currentDate);
    const seasonalMultiplier = getSeasonalMultiplier(currentDate);

    for (const campaign of CAMPAIGN_SPECS) {
      if (campaign.name.endsWith("Legacy Upload Spot")) {
        continue;
      }

      if (currentDateValue < campaign.startDate) {
        continue;
      }

      if (campaign.endDate && currentDateValue > campaign.endDate) {
        continue;
      }

      const activeLength = Math.max(
        1,
        Math.floor(
          (parseBaghdadDate(campaign.endDate ?? "2026-12-31").getTime() - parseBaghdadDate(campaign.startDate).getTime()) /
            86_400_000,
        ),
      );
      const progress = Math.min(
        1,
        Math.max(0, (currentDate.getTime() - parseBaghdadDate(campaign.startDate).getTime()) / (activeLength * 86_400_000)),
      );
      const burstMultiplier = 0.88 + Math.sin(progress * Math.PI) * 0.45;
      const weekday = currentDate.getUTCDay();
      const weekendBoost = weekday === 4 || weekday === 5 ? 1.08 : weekday === 0 ? 0.95 : 1;
      const dailyIntensity = campaign.factor * seasonalMultiplier * burstMultiplier * weekendBoost;
      const activityProbability = Math.min(0.78, 0.22 + dailyIntensity * 0.18);
      if (seededRandom() > activityProbability) {
        continue;
      }

      const airingCount = Math.max(1, Math.round(0.75 + dailyIntensity * (0.35 + seededRandom() * 0.8)));

      for (let airingIndex = 0; airingIndex < airingCount; airingIndex += 1) {
        const channelSlug = campaign.channelSlugs[Math.floor(seededRandom() * campaign.channelSlugs.length)] ?? campaign.channelSlugs[0];
        const channel = channelBySlug.get(channelSlug);
        if (!channel) {
          continue;
        }

        const channelId = channelIdBySlug.get(channelSlug);
        const campaignId = campaignIdByName.get(campaign.name);
        const brandId = brandIdByName.get(campaign.brandName);

        if (!channelId || !campaignId || !brandId) {
          continue;
        }

        const hourBands = [7, 9, 13, 16, 18, 19, 20, 21, 22, 23];
        const baseHour = hourBands[Math.floor(seededRandom() * hourBands.length)] ?? 20;
        const minute = Math.floor(seededRandom() * 60);
        const second = Math.floor(seededRandom() * 60);
        const durationSeconds = DURATION_OPTIONS[Math.floor(seededRandom() * DURATION_OPTIONS.length)] ?? 30;
        const daypart = getDaypart(baseHour);
        const month = currentDate.getUTCMonth() + 1;
        const channelRate =
          channel.genre === "Sports" ? 38500 :
          channel.genre === "News" ? 32250 :
          channel.genre === "Drama" ? 29500 :
          27400;
        const primeTimePremium = getDaypartMultiplier(daypart);
        const summerBeverageBoost =
          (campaign.brandName === "Pepsi" || campaign.brandName === "Coca-Cola") && (month === 6 || month === 7 || month === 8)
            ? 1.18
            : 1;
        const telecomPromoBoost =
          ["Zain Iraq", "Asiacell", "Korek Telecom"].includes(campaign.brandName) && (month === 3 || month === 9)
            ? 1.1
            : 1;
        const negotiatedVariance = 0.92 + seededRandom() * 0.18;
        const cost =
          channelRate *
          primeTimePremium *
          getDurationMultiplier(durationSeconds) *
          seasonalMultiplier *
          campaign.factor *
          summerBeverageBoost *
          telecomPromoBoost *
          negotiatedVariance;

        const asset = PREVIEW_ASSETS[(airingIndex + dayOffset) % PREVIEW_ASSETS.length] ?? PREVIEW_ASSETS[0];

        detections.push({
          organization_id: organizationId,
          channel_id: channelId,
          campaign_id: campaignId,
          brand_id: brandId,
          detected_at: `${currentDateValue}T${String(baseHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}+03:00`,
          genre: channel.genre,
          language: getLanguageForChannel(channel),
          daypart,
          duration_seconds: durationSeconds,
          copy_name: COPY_NAMES[(airingIndex + dayOffset + campaign.name.length) % COPY_NAMES.length] ?? "Smart Choice",
          cost: Number(cost.toFixed(2)),
          currency: "PKR",
          sov_percentage: 0,
          creative_url: asset.videoUrl,
          confidence_score: Number((0.84 + seededRandom() * 0.15).toFixed(2)),
          review_status: "approved",
          preview_poster_url: asset.posterUrl,
          is_uploaded_asset: false,
          source: "tv_dashboard_seed_v2",
        });
      }
    }
  }

  const uploadedRows: DetectionSeed[] = [
    {
      organization_id: organizationId,
      channel_id: channelIdBySlug.get("al-sharqiya")!,
      campaign_id: campaignIdByName.get("Tapal Legacy Upload Spot")!,
      brand_id: brandIdByName.get("Tapal")!,
      detected_at: "2026-07-24T15:23:00+03:00",
      genre: "General Entertainment",
      language: "Arabic",
      daypart: "Afternoon",
      duration_seconds: 30,
      copy_name: "Stronger Together",
      cost: 48250,
      currency: "PKR",
      sov_percentage: 0,
      creative_url: "/demo/tv/manual-detections/tapal-danedar-03.mp4",
      confidence_score: 0.99,
      review_status: "approved",
      preview_poster_url: "/demo/tv/manual-detections/tapal-danedar-03.jpg",
      is_uploaded_asset: true,
      source: "uploaded_asset_seed",
    },
    {
      organization_id: organizationId,
      channel_id: channelIdBySlug.get("alsumaria-tv")!,
      campaign_id: campaignIdByName.get("Lifebuoy Legacy Upload Spot")!,
      brand_id: brandIdByName.get("Lifebuoy")!,
      detected_at: "2026-07-24T15:23:00+03:00",
      genre: "General Entertainment",
      language: "Arabic",
      daypart: "Afternoon",
      duration_seconds: 25,
      copy_name: "Family Pack",
      cost: 43600,
      currency: "PKR",
      sov_percentage: 0,
      creative_url: "/demo/tv/manual-detections/lifebuoy-01.mp4",
      confidence_score: 0.99,
      review_status: "approved",
      preview_poster_url: "/demo/tv/manual-detections/lifebuoy-01.jpg",
      is_uploaded_asset: true,
      source: "uploaded_asset_seed",
    },
    {
      organization_id: organizationId,
      channel_id: channelIdBySlug.get("al-iraqiya")!,
      campaign_id: campaignIdByName.get("Bonus Legacy Upload Spot")!,
      brand_id: brandIdByName.get("Bonus")!,
      detected_at: "2026-07-24T15:23:00+03:00",
      genre: "News",
      language: "Arabic",
      daypart: "Afternoon",
      duration_seconds: 20,
      copy_name: "Weekend Deal",
      cost: 39800,
      currency: "PKR",
      sov_percentage: 0,
      creative_url: "/demo/tv/manual-detections/bonus-02.mp4",
      confidence_score: 0.99,
      review_status: "approved",
      preview_poster_url: "/demo/tv/manual-detections/bonus-02.jpg",
      is_uploaded_asset: true,
      source: "uploaded_asset_seed",
    },
  ];

  await chunkedInsert(supabase, "tv_ad_detections", detections);
  await chunkedInsert(supabase, "tv_ad_detections", uploadedRows);

  console.log(
    JSON.stringify(
      {
        status: "ok",
        organizationId,
        brandsSeeded: brandRows.length,
        channelsSeeded: channelRows.length,
        campaignsSeeded: campaignRows.length,
        detectionsSeeded: detections.length + uploadedRows.length,
        uploadedAssetsSeeded: uploadedRows.length,
        sources: ["tv_dashboard_seed_v2", "uploaded_asset_seed"],
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
