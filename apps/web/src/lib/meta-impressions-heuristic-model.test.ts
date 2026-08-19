import { test } from "vitest";
import assert from "node:assert/strict";

import {
  buildImpressionsAssessment,
  buildHeuristicImpressionsMetric,
  formatImpressionsAssessmentReport,
  formatWithCommas,
} from "./meta-impressions-heuristic-model";
import {
  createCheckingMetric,
  createCheckingSpendMetric,
  createUnavailableMetric,
  createUnavailableSpendMetric,
  type MetaLibraryAd,
} from "./meta-library";

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

test("lower-bound model: Meta-disclosed range anchors the estimate with a HIGH-confidence margin", () => {
  const ad = baseAd({
    finalMetrics: {
      spend: createUnavailableSpendMetric(),
      impressions: { ...createUnavailableMetric(), status: "META_DISCLOSED", min: 39_000_000, max: 45_000_000, raw: "39M-45M" },
      audienceSize: createUnavailableMetric(),
    },
  });

  const assessment = buildImpressionsAssessment(ad, null);
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

test("lower-bound model is absent when nothing is Meta-disclosed", () => {
  const ad = baseAd();
  const assessment = buildImpressionsAssessment(ad, null);
  const metaModel = assessment.subModels.find((m) => m.key === "META_LOWER_BOUND");
  assert.equal(metaModel?.available, false);
});

test("spend/CPM model computes a range from disclosed USD spend and skips non-USD currency", () => {
  const adUsd = baseAd({
    finalMetrics: {
      spend: { ...createUnavailableSpendMetric(), status: "META_DISCLOSED", min: 1000, max: 2000, currency: "USD", raw: "$1K-2K" },
      impressions: createUnavailableMetric(),
      audienceSize: createUnavailableMetric(),
    },
  });
  const assessmentUsd = buildImpressionsAssessment(adUsd, null);
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
  const assessmentEur = buildImpressionsAssessment(adEur, null);
  const spendModelEur = assessmentEur.subModels.find((m) => m.key === "SPEND_CPM");
  assert.equal(spendModelEur?.available, false);
});

test("spend/CPM model uses the Pakistan-specific benchmark band when country is PK", () => {
  const spendMetric = { ...createUnavailableSpendMetric(), status: "META_DISCLOSED" as const, min: 1000, max: 1000, currency: "USD", raw: "$1,000" };
  const adPk = baseAd({
    countryHint: "PK",
    finalMetrics: { spend: spendMetric, impressions: createUnavailableMetric(), audienceSize: createUnavailableMetric() },
  });
  const adDefault = baseAd({
    finalMetrics: { spend: spendMetric, impressions: createUnavailableMetric(), audienceSize: createUnavailableMetric() },
  });

  const pkModel = buildImpressionsAssessment(adPk, null).subModels.find((m) => m.key === "SPEND_CPM");
  const defaultModel = buildImpressionsAssessment(adDefault, null).subModels.find((m) => m.key === "SPEND_CPM");

  // Pakistan's much lower CPM benchmark implies materially more
  // impressions for the same spend than the global-default benchmark.
  assert.ok(pkModel!.best! > defaultModel!.best!);
});

test("engagement model requires at least one observed engagement signal", () => {
  const adNoEngagement = baseAd();
  const withoutEngagement = buildImpressionsAssessment(adNoEngagement, null).subModels.find((m) => m.key === "ENGAGEMENT");
  assert.equal(withoutEngagement?.available, false);

  const adWithEngagement = baseAd({ engagement: { reactions: 1000, comments: 200, shares: 100, videoViews: null } });
  const withEngagement = buildImpressionsAssessment(adWithEngagement, null).subModels.find((m) => m.key === "ENGAGEMENT");
  assert.ok(withEngagement?.available);
  assert.ok(withEngagement!.low! > 0);
});

test("video model only runs for video/mixed creatives with an observed view count", () => {
  const imageAd = baseAd({ engagement: { reactions: null, comments: null, shares: null, videoViews: 50_000 } });
  const imageVideoModel = buildImpressionsAssessment(imageAd, null).subModels.find((m) => m.key === "VIDEO_VIEWS");
  assert.equal(imageVideoModel?.available, false);

  const videoAd = baseAd({
    creative: { type: "video", url: null, imageUrls: [], videoUrls: ["https://example.com/v.mp4"], cards: [] },
    engagement: { reactions: null, comments: null, shares: null, videoViews: 50_000 },
  });
  const videoModel = buildImpressionsAssessment(videoAd, null).subModels.find((m) => m.key === "VIDEO_VIEWS");
  assert.ok(videoModel?.available);
  assert.ok(videoModel!.low! > 50_000); // views / rate(<1) must exceed raw views
});

test("falls back to the existing reach x frequency baseline when nothing else is available", () => {
  const ad = baseAd();
  const assessment = buildImpressionsAssessment(ad, {
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

test("reports insufficient data honestly when literally nothing is available", () => {
  const ad = baseAd();
  const assessment = buildImpressionsAssessment(ad, null);
  assert.equal(assessment.final.classification, "INSUFFICIENT_DATA");
  assert.equal(assessment.final.confidence, "INSUFFICIENT_DATA");

  const metric = buildHeuristicImpressionsMetric(assessment);
  assert.equal(metric.status, "NOT_AVAILABLE");
});

test("never labels a modeled estimate as Meta-reported exact data", () => {
  const ad = baseAd({
    finalMetrics: {
      spend: createUnavailableSpendMetric(),
      impressions: { ...createUnavailableMetric(), status: "META_DISCLOSED", min: 10_000, max: 20_000, raw: "10K-20K" },
      audienceSize: createUnavailableMetric(),
    },
  });
  const assessment = buildImpressionsAssessment(ad, null);
  assert.notEqual(assessment.final.classification, "META_REPORTED_EXACT");

  const report = formatImpressionsAssessmentReport(assessment);
  assert.ok(!/is Meta-reported exact data/i.test(report) || assessment.final.classification === "META_REPORTED_EXACT");
  assert.match(report, /modeled estimate, not exact data/i);
});

test("report formatter includes every required section", () => {
  const ad = baseAd({
    finalMetrics: {
      spend: createUnavailableSpendMetric(),
      impressions: { ...createUnavailableMetric(), status: "META_DISCLOSED", min: 39_000_000, max: 45_000_000, raw: "39M-45M" },
      audienceSize: createUnavailableMetric(),
    },
  });
  const report = formatImpressionsAssessmentReport(buildImpressionsAssessment(ad, null));

  for (const heading of ["Ad ID:", "Country:", "Status:", "OBSERVED DATA", "ASSUMPTIONS", "CALCULATIONS", "FINAL RESULT", "Confidence:"]) {
    assert.ok(report.includes(heading), `report should include "${heading}"`);
  }
});
