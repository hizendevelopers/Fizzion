import { test, vi } from "vitest";
import assert from "node:assert/strict";

// Mocked so these stay fast, deterministic unit tests with no real
// network/DB calls — the calibration lookup itself is covered by
// meta-owned-account-calibration.test.ts.
vi.mock("./meta-owned-account-calibration", () => ({
  getCalibratedCpmBenchmark: vi.fn(async () => null),
}));

import {
  buildImpressionsAssessment,
  buildHeuristicImpressionsMetric,
  formatImpressionsAssessmentReport,
  formatWithCommas,
} from "./meta-impressions-heuristic-model";
import { getCalibratedCpmBenchmark } from "./meta-owned-account-calibration";
import {
  createCheckingMetric,
  createCheckingSpendMetric,
  createUnavailableMetric,
  createUnavailableSpendMetric,
  type MetaLibraryAd,
} from "./meta-library";

const mockedGetCalibratedCpmBenchmark = vi.mocked(getCalibratedCpmBenchmark);

function baseAd(overrides: Partial<MetaLibraryAd> = {}): MetaLibraryAd {
  const impressions = createUnavailableMetric();
  const spend = createUnavailableSpendMetric();
  const audienceSize = createUnavailableMetric();

  const ad: MetaLibraryAd = {
    adLibraryId: "1234567890",
    primaryAdLibraryId: "1234567890",
    pageId: "p1",
    pageName: "Test Brand",
    adLibraryUrl: "https://www.facebook.com/ads/library/?id=1234567890",
    advertiserUrl: null,
    status: "ACTIVE",
    copy: "Buy our thing",
    title: null,
    description: null,
    cta: "Shop Now",
    ctaType: "SHOP_NOW",
    creative: { type: "image", url: null, imageUrls: [], videoUrls: [], cards: [] },
    platforms: ["FACEBOOK", "INSTAGRAM"],
    startDate: "2026-07-01",
    endDate: "2026-07-11",
    similarAds: 2,
    variationGroupId: null,
    variationCount: null,
    spend,
    impressions,
    audienceSize,
    metaMetrics: { spend, impressions, audienceSize },
    metaDetailMetrics: {
      spend: createCheckingSpendMetric(),
      impressions: createCheckingMetric("META_AD_LIBRARY_DETAIL"),
      audienceSize: createCheckingMetric("META_AD_LIBRARY_DETAIL"),
    },
    pathmaticsMetrics: { spend: null, impressions: null, audienceSize: null, providerStatus: "PENDING", providerMessage: null },
    modelMetrics: { impressions: null },
    finalMetrics: { spend, impressions, audienceSize },
    currency: null,
    landingDomain: "example.com",
    countryHint: null,
    engagement: { reactions: null, comments: null, shares: null, videoViews: null },
    rawMetaData: {},
    debug: { metricCandidates: [], sourceUrl: null, actorInputUrl: null },
    intelligenceMatch: { provider: null, confidence: null, matchId: null, status: "PENDING", reasons: [] },
  };

  return { ...ad, ...overrides };
}

test("formatWithCommas formats large numbers with thousands separators", () => {
  assert.equal(formatWithCommas(1234567), "1,234,567");
  assert.equal(formatWithCommas(999.6), "1,000");
});

test("lower-bound model: Meta-disclosed range anchors the estimate with a HIGH-confidence margin", async () => {
  const ad = baseAd({
    finalMetrics: {
      spend: createUnavailableSpendMetric(),
      impressions: { ...createUnavailableMetric(), status: "META_DISCLOSED", min: 39_000_000, max: 45_000_000, raw: "39M-45M" },
      audienceSize: createUnavailableMetric(),
    },
  });

  const assessment = await buildImpressionsAssessment(ad, null);
  const metaModel = assessment.subModels.find((m) => m.key === "META_LOWER_BOUND");

  assert.ok(metaModel?.available);
  assert.equal(metaModel?.low, 39_000_000);
  assert.equal(metaModel?.confidence, "HIGH");
  // U = L * 1.05 for HIGH confidence
  assert.equal(metaModel?.high, 39_000_000 * 1.05);
  assert.equal(assessment.final.classification, "META_RANGE_DERIVED");
  assert.equal(assessment.final.low, 39_000_000);
  assert.ok(assessment.final.best != null && assessment.final.best >= 39_000_000 && assessment.final.best <= metaModel!.high!);
});

test("lower-bound model is absent when nothing is Meta-disclosed", async () => {
  const ad = baseAd();
  const assessment = await buildImpressionsAssessment(ad, null);
  const metaModel = assessment.subModels.find((m) => m.key === "META_LOWER_BOUND");
  assert.equal(metaModel?.available, false);
});

test("spend/CPM model computes a range from disclosed USD spend and skips non-USD currency", async () => {
  const adUsd = baseAd({
    finalMetrics: {
      spend: { ...createUnavailableSpendMetric(), status: "META_DISCLOSED", min: 1000, max: 2000, currency: "USD", raw: "$1K-2K" },
      impressions: createUnavailableMetric(),
      audienceSize: createUnavailableMetric(),
    },
  });
  const assessmentUsd = await buildImpressionsAssessment(adUsd, null);
  const spendModelUsd = assessmentUsd.subModels.find((m) => m.key === "SPEND_CPM");
  assert.ok(spendModelUsd?.available);
  assert.ok(spendModelUsd!.low! > 0 && spendModelUsd!.high! > spendModelUsd!.low!);

  const adEur = baseAd({
    finalMetrics: {
      spend: { ...createUnavailableSpendMetric(), status: "META_DISCLOSED", min: 1000, max: 2000, currency: "EUR", raw: "€1K-2K" },
      impressions: createUnavailableMetric(),
      audienceSize: createUnavailableMetric(),
    },
  });
  const assessmentEur = await buildImpressionsAssessment(adEur, null);
  const spendModelEur = assessmentEur.subModels.find((m) => m.key === "SPEND_CPM");
  assert.equal(spendModelEur?.available, false);
});

test("spend/CPM model uses the Pakistan-specific benchmark band when country is PK", async () => {
  const spendMetric = { ...createUnavailableSpendMetric(), status: "META_DISCLOSED" as const, min: 1000, max: 1000, currency: "USD", raw: "$1,000" };
  const adPk = baseAd({
    countryHint: "PK",
    finalMetrics: { spend: spendMetric, impressions: createUnavailableMetric(), audienceSize: createUnavailableMetric() },
  });
  const adDefault = baseAd({
    finalMetrics: { spend: spendMetric, impressions: createUnavailableMetric(), audienceSize: createUnavailableMetric() },
  });

  const pkModel = (await buildImpressionsAssessment(adPk, null)).subModels.find((m) => m.key === "SPEND_CPM");
  const defaultModel = (await buildImpressionsAssessment(adDefault, null)).subModels.find((m) => m.key === "SPEND_CPM");

  // Pakistan's much lower CPM benchmark implies materially more
  // impressions for the same spend than the global-default benchmark.
  assert.ok(pkModel!.best! > defaultModel!.best!);
});

test("spend/CPM model prefers a calibrated CPM band from the org's own real campaign data over the public benchmark", async () => {
  mockedGetCalibratedCpmBenchmark.mockResolvedValueOnce({
    low: 1,
    high: 2,
    median: 1.5,
    sampleRows: 12,
    totalSpend: 50_000,
    totalImpressions: 30_000_000,
    country: "IQ",
    source: "OWN_ACCOUNT_DATA",
  });

  const ad = baseAd({
    countryHint: "IQ",
    finalMetrics: {
      spend: { ...createUnavailableSpendMetric(), status: "META_DISCLOSED", min: 1000, max: 1000, currency: "USD", raw: "$1,000" },
      impressions: createUnavailableMetric(),
      audienceSize: createUnavailableMetric(),
    },
  });

  const assessment = await buildImpressionsAssessment(ad, null);
  const spendModel = assessment.subModels.find((m) => m.key === "SPEND_CPM");

  assert.ok(spendModel?.available);
  assert.equal(spendModel?.confidence, "MEDIUM");
  assert.ok(spendModel!.baseWeight > 0.2); // higher weight than the generic-benchmark case
  assert.match(spendModel!.assumptions[0], /real interquartile CPM range observed across 12 of your own/i);
  // CPM $1-$2 on $1,000 spend -> 500,000-1,000,000 impressions.
  assert.equal(spendModel?.low, 500_000);
  assert.equal(spendModel?.high, 1_000_000);
});

test("engagement model requires at least one observed engagement signal", async () => {
  const adNoEngagement = baseAd();
  const withoutEngagement = (await buildImpressionsAssessment(adNoEngagement, null)).subModels.find((m) => m.key === "ENGAGEMENT");
  assert.equal(withoutEngagement?.available, false);

  const adWithEngagement = baseAd({ engagement: { reactions: 1000, comments: 200, shares: 100, videoViews: null } });
  const withEngagement = (await buildImpressionsAssessment(adWithEngagement, null)).subModels.find((m) => m.key === "ENGAGEMENT");
  assert.ok(withEngagement?.available);
  assert.ok(withEngagement!.low! > 0);
});

test("video model only runs for video/mixed creatives with an observed view count", async () => {
  const imageAd = baseAd({ engagement: { reactions: null, comments: null, shares: null, videoViews: 50_000 } });
  const imageVideoModel = (await buildImpressionsAssessment(imageAd, null)).subModels.find((m) => m.key === "VIDEO_VIEWS");
  assert.equal(imageVideoModel?.available, false);

  const videoAd = baseAd({
    creative: { type: "video", url: null, imageUrls: [], videoUrls: ["https://example.com/v.mp4"], cards: [] },
    engagement: { reactions: null, comments: null, shares: null, videoViews: 50_000 },
  });
  const videoModel = (await buildImpressionsAssessment(videoAd, null)).subModels.find((m) => m.key === "VIDEO_VIEWS");
  assert.ok(videoModel?.available);
  assert.ok(videoModel!.low! > 50_000); // views / rate(<1) must exceed raw views
});

test("falls back to the existing reach x frequency baseline when nothing else is available", async () => {
  const ad = baseAd();
  const assessment = await buildImpressionsAssessment(ad, {
    low: 100_000,
    high: 300_000,
    estimate: 200_000,
    confidenceLabel: "MEDIUM",
    predictedFrequency: 1.8,
  });

  const reachModel = assessment.subModels.find((m) => m.key === "REACH_FREQUENCY");
  assert.ok(reachModel?.available);
  assert.equal(assessment.final.classification, "MODEL_BASED_ESTIMATE");
  assert.ok(assessment.final.best != null);
});

test("reports insufficient data honestly when literally nothing is available", async () => {
  const ad = baseAd();
  const assessment = await buildImpressionsAssessment(ad, null);
  assert.equal(assessment.final.classification, "INSUFFICIENT_DATA");
  assert.equal(assessment.final.confidence, "INSUFFICIENT_DATA");

  const metric = buildHeuristicImpressionsMetric(assessment);
  assert.equal(metric.status, "NOT_AVAILABLE");
});

test("never labels a modeled estimate as Meta-reported exact data", async () => {
  const ad = baseAd({
    finalMetrics: {
      spend: createUnavailableSpendMetric(),
      impressions: { ...createUnavailableMetric(), status: "META_DISCLOSED", min: 10_000, max: 20_000, raw: "10K-20K" },
      audienceSize: createUnavailableMetric(),
    },
  });
  const assessment = await buildImpressionsAssessment(ad, null);
  assert.notEqual(assessment.final.classification, "META_REPORTED_EXACT");

  const report = formatImpressionsAssessmentReport(assessment);
  assert.ok(!/is Meta-reported exact data/i.test(report) || assessment.final.classification === "META_REPORTED_EXACT");
  assert.match(report, /modeled estimate, not exact data/i);
});

test("report formatter includes every required section", async () => {
  const ad = baseAd({
    finalMetrics: {
      spend: createUnavailableSpendMetric(),
      impressions: { ...createUnavailableMetric(), status: "META_DISCLOSED", min: 39_000_000, max: 45_000_000, raw: "39M-45M" },
      audienceSize: createUnavailableMetric(),
    },
  });
  const report = formatImpressionsAssessmentReport(await buildImpressionsAssessment(ad, null));

  for (const heading of ["Ad ID:", "Country:", "Status:", "OBSERVED DATA", "ASSUMPTIONS", "CALCULATIONS", "FINAL RESULT", "Confidence:"]) {
    assert.ok(report.includes(heading), `report should include "${heading}"`);
  }
});
