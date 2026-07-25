import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  calculateDetectedAdSov,
  campaignOverlapsSelectedRange,
  deriveTvDaypart,
  getPreviousPeriodRange,
  getTvGranularity,
  normalizeTvFilters,
  parseTvFiltersFromSearchParams,
} from "./tv-analytics";

test("normalizeTvFilters defaults to the latest 30 days", () => {
  const filters = normalizeTvFilters();
  assert.equal(filters.preset, "last30");
  assert.equal(filters.startDate, "2026-06-26");
  assert.equal(filters.endDate, "2026-07-25");
});

test("parseTvFiltersFromSearchParams parses shared arrays and timezone", () => {
  const filters = parseTvFiltersFromSearchParams({
    preset: "custom",
    startDate: "2026-07-01",
    endDate: "2026-07-10",
    brands: "a1111111-1111-4111-8111-111111111111,a2222222-2222-4222-8222-222222222222",
    campaigns: "c1111111-1111-4111-8111-111111111111",
    channels: "d1111111-1111-4111-8111-111111111111",
    timezone: "Asia/Baghdad",
  });

  assert.deepEqual(filters.brandIds, [
    "a1111111-1111-4111-8111-111111111111",
    "a2222222-2222-4222-8222-222222222222",
  ]);
  assert.deepEqual(filters.campaignIds, ["c1111111-1111-4111-8111-111111111111"]);
  assert.deepEqual(filters.channelIds, ["d1111111-1111-4111-8111-111111111111"]);
  assert.equal(filters.timezone, "Asia/Baghdad");
});

test("campaignOverlapsSelectedRange respects active TV overlap rules", () => {
  const overlapping = campaignOverlapsSelectedRange(
    {
      startDate: "2026-07-01",
      endDate: "2026-08-01",
      status: "active",
      includesTv: true,
    },
    new Date("2026-07-15T00:00:00Z"),
    new Date("2026-07-31T23:59:59Z"),
  );
  const inactive = campaignOverlapsSelectedRange(
    {
      startDate: "2026-07-01",
      endDate: "2026-08-01",
      status: "draft",
      includesTv: true,
    },
    new Date("2026-07-15T00:00:00Z"),
    new Date("2026-07-31T23:59:59Z"),
  );
  const missingTv = campaignOverlapsSelectedRange(
    {
      startDate: "2026-07-01",
      endDate: "2026-08-01",
      status: "active",
      includesTv: false,
    },
    new Date("2026-07-15T00:00:00Z"),
    new Date("2026-07-31T23:59:59Z"),
  );

  assert.equal(overlapping, true);
  assert.equal(inactive, false);
  assert.equal(missingTv, false);
});

test("deriveTvDaypart maps Baghdad times correctly", () => {
  assert.equal(deriveTvDaypart("2026-07-24T03:00:00Z"), "Morning");
  assert.equal(deriveTvDaypart("2026-07-24T10:00:00Z"), "Afternoon");
  assert.equal(deriveTvDaypart("2026-07-24T15:00:00Z"), "Evening");
  assert.equal(deriveTvDaypart("2026-07-24T16:30:00Z"), "Pre Prime Time");
  assert.equal(deriveTvDaypart("2026-07-24T17:30:00Z"), "Prime Time");
  assert.equal(deriveTvDaypart("2026-07-24T21:30:00Z"), "Late Prime Time");
});

test("getTvGranularity switches from daily to weekly to monthly", () => {
  assert.equal(getTvGranularity(new Date("2026-07-01T00:00:00Z"), new Date("2026-07-25T00:00:00Z")), "daily");
  assert.equal(getTvGranularity(new Date("2026-04-01T00:00:00Z"), new Date("2026-07-25T00:00:00Z")), "weekly");
  assert.equal(getTvGranularity(new Date("2024-07-25T00:00:00Z"), new Date("2026-07-25T00:00:00Z")), "monthly");
});

test("getPreviousPeriodRange returns an equivalent preceding window", () => {
  const result = getPreviousPeriodRange(
    new Date("2026-07-01T00:00:00Z"),
    new Date("2026-07-30T23:59:59Z"),
  );

  assert.equal(result.previousStart.toISOString().slice(0, 10), "2026-06-01");
  assert.equal(result.previousEnd.toISOString().slice(0, 10), "2026-06-30");
});

test("calculateDetectedAdSov protects against division by zero", () => {
  assert.equal(calculateDetectedAdSov(250, 0), 0);
  assert.equal(calculateDetectedAdSov(250, 1000), 25);
});

test("TV page source removes legacy filter heading copy and duplicate date-range actions", () => {
  const source = readFileSync(join(process.cwd(), "src/components/tv/tv-dashboard.tsx"), "utf8");

  assert.equal(source.includes("Global filters"), false);
  assert.equal(source.includes("Every section on this page uses the same TV filter scope."), false);
  assert.equal(source.includes("No extra filters applied."), false);

  const dateRangeStart = source.indexOf("function DateRangeFilter");
  const dateRangeEnd = source.indexOf("function FilterActions");
  const dateRangeSource = source.slice(dateRangeStart, dateRangeEnd);

  assert.equal(dateRangeSource.includes(">Apply<"), false);
  assert.equal(dateRangeSource.includes(">Clear<"), false);
});

test("TV spending chart source keeps stacked bar and polished tooltip contract", () => {
  const tvSource = readFileSync(join(process.cwd(), "src/components/tv/tv-dashboard.tsx"), "utf8");
  const sharedSource = readFileSync(join(process.cwd(), "src/components/states/insight-charts.tsx"), "utf8");

  assert.equal(tvSource.includes("StackedSpendingChartCard"), true);
  assert.equal(sharedSource.includes("stacked spending chart"), true);
  assert.equal(sharedSource.includes("Period total:"), true);
  assert.equal(sharedSource.includes("Period share:"), true);
  assert.equal(sharedSource.includes("Date: {tooltip.bucketLabel}"), true);
});
