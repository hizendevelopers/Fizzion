import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { computeOverviewAnalytics, getBrandColor, normalizeOverviewFilters } from "@/lib/overview-analytics";

const baseFilters = normalizeOverviewFilters({
  preset: "last30",
  startDate: "2026-07-01",
  endDate: "2026-07-30",
  page: 1,
  pageSize: 20,
});

const baseBrands = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Coca-Cola", slug: "coca-cola", logoUrl: null, color: "#F40009", competitorGroup: "owned", isActive: true },
  { id: "22222222-2222-4222-8222-222222222222", name: "Pepsi", slug: "pepsi", logoUrl: null, color: "#005CB4", competitorGroup: "competitor", isActive: true },
];

const basePlatforms = [
  { id: "33333333-3333-4333-8333-333333333333", name: "Meta", slug: "meta", icon: "social", color: "#1877F2", isActive: true },
  { id: "44444444-4444-4444-8444-444444444444", name: "YouTube", slug: "youtube", icon: "video", color: "#FF0000", isActive: true },
  { id: "55555555-5555-4555-8555-555555555555", name: "OOH", slug: "ooh", icon: "ooh", color: "#FF8A00", isActive: true },
  { id: "66666666-6666-4666-8666-666666666666", name: "Web Advertising", slug: "web-advertising", icon: "web", color: "#7C3AED", isActive: true },
];

const baseCampaigns = [
  { id: "77777777-7777-4777-8777-777777777777", brandId: baseBrands[0].id, name: "Coke Studio Iraq", status: "active", startDate: "2026-06-20", endDate: null },
  { id: "88888888-8888-4888-8888-888888888888", brandId: baseBrands[1].id, name: "Pepsi Stronger Together", status: "active", startDate: "2026-06-15", endDate: "2026-08-01" },
  { id: "99999999-9999-4999-8999-999999999999", brandId: baseBrands[0].id, name: "Coca-Cola Ramadan Together", status: "active", startDate: "2026-07-10", endDate: "2026-07-28" },
];

const baseCampaignPlatforms = [
  { campaignId: baseCampaigns[0].id, platformId: basePlatforms[0].id },
  { campaignId: baseCampaigns[0].id, platformId: basePlatforms[1].id },
  { campaignId: baseCampaigns[0].id, platformId: basePlatforms[2].id },
  { campaignId: baseCampaigns[0].id, platformId: basePlatforms[3].id },
  { campaignId: baseCampaigns[1].id, platformId: basePlatforms[0].id },
  { campaignId: baseCampaigns[1].id, platformId: basePlatforms[2].id },
  { campaignId: baseCampaigns[2].id, platformId: basePlatforms[1].id },
];

const currentSpendRecords = [
  { brandId: baseBrands[0].id, campaignId: baseCampaigns[0].id, platformId: basePlatforms[0].id, spendDate: "2026-07-12", amount: 1000, currency: "USD" },
  { brandId: baseBrands[0].id, campaignId: baseCampaigns[0].id, platformId: basePlatforms[1].id, spendDate: "2026-07-13", amount: 1500, currency: "USD" },
  { brandId: baseBrands[0].id, campaignId: baseCampaigns[2].id, platformId: basePlatforms[1].id, spendDate: "2026-07-18", amount: 500, currency: "USD" },
  { brandId: baseBrands[1].id, campaignId: baseCampaigns[1].id, platformId: basePlatforms[0].id, spendDate: "2026-07-11", amount: 1200, currency: "USD" },
  { brandId: baseBrands[1].id, campaignId: baseCampaigns[1].id, platformId: basePlatforms[2].id, spendDate: "2026-07-15", amount: 800, currency: "USD" },
];

const previousSpendRecords = [
  { brandId: baseBrands[0].id, campaignId: baseCampaigns[0].id, platformId: basePlatforms[0].id, spendDate: "2026-06-12", amount: 700, currency: "USD" },
  { brandId: baseBrands[1].id, campaignId: baseCampaigns[1].id, platformId: basePlatforms[0].id, spendDate: "2026-06-13", amount: 900, currency: "USD" },
];

test("one campaign running on four platforms counts as one active campaign", () => {
  const result = computeOverviewAnalytics({
    filters: baseFilters,
    brands: baseBrands,
    platforms: basePlatforms,
    campaigns: baseCampaigns,
    campaignPlatforms: baseCampaignPlatforms,
    currentSpendRecords,
    previousSpendRecords,
  });

  assert.equal(result.activeCampaigns.items.find((campaign) => campaign.id === baseCampaigns[0].id)?.platforms.length, 4);
  assert.equal(result.kpis.activeCampaigns.value, 3);
});

test("a brand with three active campaigns counts as one active brand", () => {
  const extraCampaign = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    brandId: baseBrands[0].id,
    name: "Coca-Cola Taste the Feeling",
    status: "active",
    startDate: "2026-07-05",
    endDate: null,
  };

  const result = computeOverviewAnalytics({
    filters: baseFilters,
    brands: baseBrands,
    platforms: basePlatforms,
    campaigns: [...baseCampaigns, extraCampaign],
    campaignPlatforms: [...baseCampaignPlatforms, { campaignId: extraCampaign.id, platformId: basePlatforms[0].id }],
    currentSpendRecords,
    previousSpendRecords,
  });

  assert.equal(result.kpis.activeBrands.value, 2);
  assert.equal(result.activeBrands.find((brand) => brand.brandId === baseBrands[0].id)?.activeCampaignCount, 2);
});

test("total spending equals the sum of all matching spend records and brand totals match", () => {
  const result = computeOverviewAnalytics({
    filters: baseFilters,
    brands: baseBrands,
    platforms: basePlatforms,
    campaigns: baseCampaigns,
    campaignPlatforms: baseCampaignPlatforms,
    currentSpendRecords,
    previousSpendRecords,
  });

  assert.equal(result.kpis.totalSpending.value, 5000);
  assert.equal(result.spending.total, 5000);
  assert.equal(result.spending.totalsByBrand.reduce((sum, item) => sum + item.totalSpend, 0), 5000);
});

test("spending SOV and platform split total approximately 100 percent", () => {
  const result = computeOverviewAnalytics({
    filters: baseFilters,
    brands: baseBrands,
    platforms: basePlatforms,
    campaigns: baseCampaigns,
    campaignPlatforms: baseCampaignPlatforms,
    currentSpendRecords,
    previousSpendRecords,
  });

  const sovTotal = result.shareOfVoice.reduce((sum, item) => sum + item.percentage, 0);
  const platformTotal = result.platformSplit.reduce((sum, item) => sum + item.percentage, 0);

  assert.ok(Math.abs(sovTotal - 100) < 0.2);
  assert.ok(Math.abs(platformTotal - 100) < 0.2);
});

test("date and platform filters update totals and lists without duplication", () => {
  const filtered = normalizeOverviewFilters({
    preset: "custom",
    startDate: "2026-07-10",
    endDate: "2026-07-16",
    platformIds: [basePlatforms[2].id],
    page: 1,
    pageSize: 20,
  });

  const result = computeOverviewAnalytics({
    filters: filtered,
    brands: baseBrands,
    platforms: basePlatforms,
    campaigns: baseCampaigns,
    campaignPlatforms: baseCampaignPlatforms,
    currentSpendRecords: currentSpendRecords.filter((record) => record.platformId === basePlatforms[2].id),
    previousSpendRecords: [],
  });

  assert.equal(result.kpis.totalSpending.value, 800);
  assert.equal(result.activeCampaigns.items.length, 1);
  assert.equal(result.activeCampaigns.items[0]?.id, baseCampaigns[1].id);
});

test("reset-style default filters stay on last 30 days and zero spend does not break calculations", () => {
  const filters = normalizeOverviewFilters({ preset: "last30", page: 1, pageSize: 20 });
  const result = computeOverviewAnalytics({
    filters,
    brands: baseBrands,
    platforms: basePlatforms,
    campaigns: baseCampaigns,
    campaignPlatforms: baseCampaignPlatforms,
    currentSpendRecords: [],
    previousSpendRecords: [],
  });

  assert.equal(filters.preset, "last30");
  assert.equal(result.kpis.totalSpending.value, 0);
  assert.equal(result.shareOfVoice.length, 0);
  assert.equal(result.platformSplit.length, 0);
  assert.equal(result.states.isEmpty, true);
});

test("brand colors remain consistent across outputs", () => {
  const result = computeOverviewAnalytics({
    filters: baseFilters,
    brands: baseBrands,
    platforms: basePlatforms,
    campaigns: baseCampaigns,
    campaignPlatforms: baseCampaignPlatforms,
    currentSpendRecords,
    previousSpendRecords,
  });

  const cokeColor = getBrandColor(baseBrands[0]);
  assert.equal(result.spending.totalsByBrand.find((brand) => brand.brandId === baseBrands[0].id)?.color, cokeColor);
  assert.equal(result.shareOfVoice.find((brand) => brand.brandId === baseBrands[0].id)?.color, cokeColor);
  assert.equal(result.activeBrands.find((brand) => brand.brandId === baseBrands[0].id)?.brandColor, cokeColor);
});

test("last2Years preset normalizes safely and keeps a full 24 month window available", () => {
  const filters = normalizeOverviewFilters({
    preset: "last2Years",
    page: 1,
    pageSize: 20,
  });

  assert.equal(filters.preset, "last2Years");
  const start = new Date(`${filters.startDate}T00:00:00Z`);
  const end = new Date(`${filters.endDate}T00:00:00Z`);
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);

  assert.ok(diffDays >= 728);
  assert.ok(diffDays <= 730);
});

test("overview filter popovers use floating overlays instead of inline expanding details", () => {
  const source = readFileSync(join(process.cwd(), "src/components/overview/overview-dashboard.tsx"), "utf8");

  assert.match(source, /createPortal/);
  assert.match(source, /function FilterPopoverShell/);
  assert.match(source, /fixed inset-x-4 bottom-4 max-h-\[72vh\]/);
  assert.match(source, /openFilterPanel/);
  assert.doesNotMatch(source, /<details className=/);
});
