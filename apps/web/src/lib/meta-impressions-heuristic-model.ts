import type { InHouseModelConfidence, MetaLibraryAd, MetaMetric } from "@/lib/meta-library";

/**
 * Confidence-weighted impressions estimator implementing the
 * lower-bound / spend-CPM / engagement / video-view methodology,
 * layered on top of (not replacing) the existing reach × frequency
 * "weak model" in meta-impressions-model.ts.
 *
 * Hard constraint that shapes this entire file: Meta does not disclose
 * impressions, reach, or spend for ordinary commercial ads through any
 * public channel. Only political/social-issue ads get a disclosed
 * range under EU/US transparency law. For everything else, every
 * number produced here is a modeled estimate from indirect signals —
 * never call it exact, and say plainly when there isn't enough data to
 * produce a meaningful estimate at all.
 */

export type ModelConfidence = InHouseModelConfidence;

export type SubModelKey = "META_LOWER_BOUND" | "SPEND_CPM" | "REACH_FREQUENCY" | "ENGAGEMENT" | "VIDEO_VIEWS";

export type SubModelOutput = {
  key: SubModelKey;
  label: string;
  available: boolean;
  low: number | null;
  high: number | null;
  best: number | null;
  confidence: ModelConfidence | null;
  baseWeight: number;
  effectiveWeight: number; // filled in by combineModels; 0 until combined
  formula: string;
  calculation: string;
  assumptions: string[];
  reason: string | null;
};

export type ImpressionsAssessment = {
  adLibraryId: string;
  country: string | null;
  status: "ACTIVE" | "INACTIVE";
  startDate: string | null;
  daysRunning: number | null;
  observedData: string[];
  assumptions: string[];
  subModels: SubModelOutput[];
  final: {
    low: number | null;
    high: number | null;
    best: number | null;
    confidence: ModelConfidence | "INSUFFICIENT_DATA";
    classification: "META_REPORTED_EXACT" | "META_RANGE_DERIVED" | "MODEL_BASED_ESTIMATE" | "INSUFFICIENT_DATA";
    narrative: string;
  };
};

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatWithCommas(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2).replace(/0$/, "").replace(/\.$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${Math.round(value)}`;
}

// ---------------------------------------------------------------------------
// Benchmarks — every value here is a published-industry-average
// ASSUMPTION, never an actual Meta metric. Sources are named in each
// sub-model's `assumptions` output. These are deliberately wide bands,
// not single false-precise numbers, because real CPM/engagement rates
// vary heavily by objective, placement, and season.
// ---------------------------------------------------------------------------

type Benchmark = { low: number; high: number; source: string };

const CPM_BENCHMARKS_USD: Record<"PK" | "DEFAULT", Benchmark> = {
  PK: {
    low: 0.8,
    high: 4.0,
    source:
      "Pakistan-specific Meta CPM benchmarks (2026 ad-agency reports): commonly cited at $0.80–$1.50 for standard feed placements, widened here to $0.80–$4.00 to cover higher-competition objectives/placements.",
  },
  DEFAULT: {
    low: 6,
    high: 18,
    source:
      "General 2026 Meta (Facebook/Instagram) CPM industry benchmarks, blended across feed/Reels/Stories placements; wide band reflects real seasonal and industry variance.",
  },
};

const ENGAGEMENT_RATE_BENCHMARKS: Record<"PK" | "DEFAULT", Benchmark> = {
  PK: {
    low: 0.01,
    high: 0.035,
    source: "South Asia / Pakistan Meta engagement-rate benchmarks commonly cited in the 1%–3.5% range for feed ads.",
  },
  DEFAULT: {
    low: 0.008,
    high: 0.025,
    source: "General Meta ad engagement-rate benchmarks (reactions+comments+shares / impressions), commonly cited at 0.8%–2.5%.",
  },
};

const VIEW_TO_IMPRESSION_RATE: Benchmark = {
  low: 0.5,
  high: 0.9,
  source:
    "Assumed share of served impressions that register as a counted video view (3-second/ThruPlay-style threshold); commonly cited 50%–90% range in video-ad benchmark literature.",
};

function getCpmBenchmark(countryHint: string | null): Benchmark {
  return countryHint === "PK" ? CPM_BENCHMARKS_USD.PK : CPM_BENCHMARKS_USD.DEFAULT;
}

function getEngagementRateBenchmark(countryHint: string | null): Benchmark {
  return countryHint === "PK" ? ENGAGEMENT_RATE_BENCHMARKS.PK : ENGAGEMENT_RATE_BENCHMARKS.DEFAULT;
}

// ---------------------------------------------------------------------------
// Confidence <-> margin / weight mappings
// ---------------------------------------------------------------------------

/** Step 4: m per confidence tier, per the specified methodology. */
function marginForConfidence(confidence: ModelConfidence): number {
  switch (confidence) {
    case "VERY_HIGH":
      return 0.03;
    case "HIGH":
      return 0.05;
    case "MEDIUM":
      return 0.075;
    case "LOW":
      return 0.15; // midpoint of the specified 0.10–0.20 low-confidence band
  }
}

/** Step 9: how much a sub-model's own confidence discounts its base weight. */
function confidenceMultiplier(confidence: ModelConfidence | null): number {
  switch (confidence) {
    case "VERY_HIGH":
      return 1;
    case "HIGH":
      return 0.85;
    case "MEDIUM":
      return 0.55;
    case "LOW":
      return 0.3;
    default:
      return 0;
  }
}

function unavailable(key: SubModelKey, label: string, formula: string, reason: string): SubModelOutput {
  return {
    key,
    label,
    available: false,
    low: null,
    high: null,
    best: null,
    confidence: null,
    baseWeight: 0,
    effectiveWeight: 0,
    formula,
    calculation: "Insufficient data.",
    assumptions: [],
    reason,
  };
}

// ---------------------------------------------------------------------------
// Sub-model 1 — Meta / Lower-Bound Model (Steps 3–5)
// ---------------------------------------------------------------------------

function extractMetaLowerBound(
  ad: MetaLibraryAd,
): { L: number; source: string; confidence: ModelConfidence } | null {
  const disclosed = ad.finalMetrics.impressions;

  if (disclosed.status === "META_DISCLOSED" && disclosed.min != null && disclosed.min > 0) {
    return {
      L: disclosed.min,
      source: "Meta Ad Library disclosed impression range (EU/US political or social-issue ad transparency requirement).",
      confidence: "HIGH",
    };
  }

  if (disclosed.source === "PUBLIC_META_TRAINING_DATA" && (disclosed.low ?? 0) > 0) {
    return {
      L: disclosed.low as number,
      source: "Matched a public Meta weak-range training record for this exact Ad Library ID.",
      confidence: "MEDIUM",
    };
  }

  return null;
}

function computeLowerBoundModel(ad: MetaLibraryAd): SubModelOutput {
  const formula = "U = L × (1 + m);  E = L × (1 + m/2)";
  const bound = extractMetaLowerBound(ad);
  if (!bound) {
    return unavailable(
      "META_LOWER_BOUND",
      "Meta / Lower-Bound Model",
      formula,
      "No Meta-disclosed impression lower bound and no exact public-range match exist for this ad. This is expected for ordinary commercial ads — Meta only discloses impression ranges for political/social-issue ads.",
    );
  }

  const m = marginForConfidence(bound.confidence);
  const U = bound.L * (1 + m);
  const E = bound.L * (1 + m / 2);

  return {
    key: "META_LOWER_BOUND",
    label: "Meta / Lower-Bound Model",
    available: true,
    low: bound.L,
    high: U,
    best: E,
    confidence: bound.confidence,
    baseWeight: 0.55,
    effectiveWeight: 0,
    formula,
    calculation: `L = ${formatWithCommas(bound.L)} (${bound.source}). m = ${m} selected for ${bound.confidence} confidence. U = ${formatWithCommas(bound.L)} × ${(1 + m).toFixed(3)} = ${formatWithCommas(U)}. E = (L + U) / 2 = ${formatWithCommas(E)}.`,
    assumptions: [`Uncertainty margin m = ${m} applied for ${bound.confidence} confidence in the lower bound (per the specified confidence → margin table).`],
    reason: null,
  };
}

// ---------------------------------------------------------------------------
// Sub-model 2 — Spend / CPM cross-check (Step 6)
// ---------------------------------------------------------------------------

function computeSpendCpmModel(ad: MetaLibraryAd, countryHint: string | null): SubModelOutput {
  const formula = "I = (Spend / CPM) × 1,000";
  const spend = ad.finalMetrics.spend;

  if (spend.status !== "META_DISCLOSED" || (spend.min == null && spend.max == null)) {
    return unavailable(
      "SPEND_CPM",
      "Spend/CPM Model",
      formula,
      "No Meta-disclosed spend range is available for this ad.",
    );
  }

  if (spend.currency && spend.currency.trim().toUpperCase() !== "USD") {
    return unavailable(
      "SPEND_CPM",
      "Spend/CPM Model",
      formula,
      `Spend is disclosed in ${spend.currency}. No currency-conversion rate is applied by this model — skipped rather than assume an FX rate.`,
    );
  }

  const spendLow = spend.min ?? spend.max ?? 0;
  const spendHigh = spend.max ?? spend.min ?? 0;
  const cpm = getCpmBenchmark(countryHint);

  // Higher CPM -> fewer impressions for the same spend, and vice versa.
  const impressionsLow = (spendLow / cpm.high) * 1000;
  const impressionsHigh = (spendHigh / cpm.low) * 1000;
  const best = (impressionsLow + impressionsHigh) / 2;

  return {
    key: "SPEND_CPM",
    label: "Spend/CPM Model",
    available: true,
    low: impressionsLow,
    high: impressionsHigh,
    best,
    confidence: "LOW",
    baseWeight: 0.2,
    effectiveWeight: 0,
    formula,
    calculation: `Spend disclosed: $${formatWithCommas(spendLow)}–$${formatWithCommas(spendHigh)}. CPM benchmark: $${cpm.low.toFixed(2)}–$${cpm.high.toFixed(2)} (${countryHint === "PK" ? "Pakistan" : "global default"}). I_low = ($${formatWithCommas(spendLow)} / $${cpm.high.toFixed(2)}) × 1000 = ${formatWithCommas(impressionsLow)}. I_high = ($${formatWithCommas(spendHigh)} / $${cpm.low.toFixed(2)}) × 1000 = ${formatWithCommas(impressionsHigh)}.`,
    assumptions: [`CPM benchmark $${cpm.low.toFixed(2)}–$${cpm.high.toFixed(2)} (assumption, not a Meta metric). Source: ${cpm.source}`],
    reason: null,
  };
}

// ---------------------------------------------------------------------------
// Sub-model 3 — Reach × frequency ("current model", kept as the last-resort
// cross-check per the user's explicit instruction to keep it).
// ---------------------------------------------------------------------------

function computeReachFrequencyModel(ad: MetaLibraryAd, existing: { low: number; high: number; estimate: number; confidenceLabel: ModelConfidence | null; predictedFrequency: number } | null): SubModelOutput {
  const formula = "I = Reach × predicted frequency (existing weak-range baseline)";
  if (!existing) {
    return unavailable(
      "REACH_FREQUENCY",
      "Reach × Frequency Model (existing baseline)",
      formula,
      "The existing reach-based baseline could not produce a prediction (reach is missing or no training data is loaded).",
    );
  }

  return {
    key: "REACH_FREQUENCY",
    label: "Reach × Frequency Model (existing baseline)",
    available: true,
    low: existing.low,
    high: existing.high,
    best: existing.estimate,
    confidence: existing.confidenceLabel ?? "LOW",
    baseWeight: 0.15,
    effectiveWeight: 0,
    formula,
    calculation: `Existing in-house baseline: predicted frequency ${existing.predictedFrequency.toFixed(2)}×, giving a range of ${formatWithCommas(existing.low)}–${formatWithCommas(existing.high)} and a point estimate of ${formatWithCommas(existing.estimate)}.`,
    assumptions: ["Uses the app's existing reach × frequency baseline, trained on public weak-range data grouped by platform/creative type/active-days/reach bucket."],
    reason: null,
  };
}

// ---------------------------------------------------------------------------
// Sub-model 4 — Engagement cross-check (Step 7)
// ---------------------------------------------------------------------------

function computeEngagementModel(ad: MetaLibraryAd, countryHint: string | null): SubModelOutput {
  const formula = "I = (Reactions + Comments + Shares) / Engagement Rate";
  const { reactions, comments, shares } = ad.engagement;

  if (reactions == null && comments == null && shares == null) {
    return unavailable(
      "ENGAGEMENT",
      "Engagement Model",
      formula,
      "No reaction/comment/share counts are exposed for this ad. Meta's Ad Library generally does not disclose organic engagement for standard ad-only (\"dark post\") creatives — only ads boosted from an existing organic post sometimes show these, and even then rarely publicly.",
    );
  }

  const total = (reactions ?? 0) + (comments ?? 0) + (shares ?? 0);
  if (total <= 0) {
    return unavailable("ENGAGEMENT", "Engagement Model", formula, "Observed engagement total is zero.");
  }

  const rate = getEngagementRateBenchmark(countryHint);
  const low = total / rate.high;
  const high = total / rate.low;
  const best = (low + high) / 2;

  return {
    key: "ENGAGEMENT",
    label: "Engagement Model",
    available: true,
    low,
    high,
    best,
    confidence: "LOW",
    baseWeight: 0.07,
    effectiveWeight: 0,
    formula,
    calculation: `Total engagement = ${reactions ?? 0} reactions + ${comments ?? 0} comments + ${shares ?? 0} shares = ${formatWithCommas(total)}. Engagement rate benchmark: ${(rate.low * 100).toFixed(2)}%–${(rate.high * 100).toFixed(2)}%. I_low = ${formatWithCommas(total)} / ${rate.high} = ${formatWithCommas(low)}. I_high = ${formatWithCommas(total)} / ${rate.low} = ${formatWithCommas(high)}.`,
    assumptions: [`Engagement rate ${(rate.low * 100).toFixed(2)}%–${(rate.high * 100).toFixed(2)}% (assumption, not a Meta metric). Source: ${rate.source}`],
    reason: null,
  };
}

// ---------------------------------------------------------------------------
// Sub-model 5 — Video cross-check (Step 8)
// ---------------------------------------------------------------------------

function computeVideoModel(ad: MetaLibraryAd): SubModelOutput {
  const formula = "I = Video Views / View-to-Impression Rate";
  const { videoViews } = ad.engagement;

  if (ad.creative.type !== "video" && ad.creative.type !== "mixed") {
    return unavailable("VIDEO_VIEWS", "Video Model", formula, "This ad's creative is not a video.");
  }

  if (videoViews == null || videoViews <= 0) {
    return unavailable(
      "VIDEO_VIEWS",
      "Video Model",
      formula,
      "No public video view count is available for this ad.",
    );
  }

  const low = videoViews / VIEW_TO_IMPRESSION_RATE.high;
  const high = videoViews / VIEW_TO_IMPRESSION_RATE.low;
  const best = (low + high) / 2;

  return {
    key: "VIDEO_VIEWS",
    label: "Video Model",
    available: true,
    low,
    high,
    best,
    confidence: "LOW",
    baseWeight: 0.03,
    effectiveWeight: 0,
    formula,
    calculation: `Video views = ${formatWithCommas(videoViews)}. Assumed view-to-impression rate: ${(VIEW_TO_IMPRESSION_RATE.low * 100).toFixed(0)}%–${(VIEW_TO_IMPRESSION_RATE.high * 100).toFixed(0)}%. I_low = ${formatWithCommas(videoViews)} / ${VIEW_TO_IMPRESSION_RATE.high} = ${formatWithCommas(low)}. I_high = ${formatWithCommas(videoViews)} / ${VIEW_TO_IMPRESSION_RATE.low} = ${formatWithCommas(high)}.`,
    assumptions: [`View-to-impression rate ${(VIEW_TO_IMPRESSION_RATE.low * 100).toFixed(0)}%–${(VIEW_TO_IMPRESSION_RATE.high * 100).toFixed(0)}% (assumption). Source: ${VIEW_TO_IMPRESSION_RATE.source}. Video views are NOT treated as impressions directly.`],
    reason: null,
  };
}

// ---------------------------------------------------------------------------
// Step 9 — combine
// ---------------------------------------------------------------------------

function combineModels(subModels: SubModelOutput[]): ImpressionsAssessment["final"] {
  const metaModel = subModels.find((model) => model.key === "META_LOWER_BOUND" && model.available);
  const available = subModels.filter((model) => model.available && model.best != null);

  if (available.length === 0) {
    return {
      low: null,
      high: null,
      best: null,
      confidence: "INSUFFICIENT_DATA",
      classification: "INSUFFICIENT_DATA",
      narrative:
        "No Meta-disclosed delivery data, spend, engagement, or video-view signal was available, and the existing reach-based baseline could not run. There is not enough public information to construct a meaningful impressions estimate for this ad.",
    };
  }

  // Step 9's explicit rule: a credible Meta-derived bound must never be
  // overridden by weaker benchmark models. When it exists, it anchors
  // the range outright; other available models are still shown (and
  // still contribute to the point estimate at a small weight) but
  // cannot push the range outside what Meta itself disclosed.
  if (metaModel && metaModel.low != null && metaModel.high != null && metaModel.best != null) {
    const crossChecks = available.filter((model) => model.key !== "META_LOWER_BOUND");
    let weightedBestSum = metaModel.best * 0.85;
    let weightSum = 0.85;
    for (const model of crossChecks) {
      const w = model.baseWeight * confidenceMultiplier(model.confidence);
      model.effectiveWeight = w;
      weightedBestSum += (model.best as number) * w;
      weightSum += w;
    }
    metaModel.effectiveWeight = 0.85 / weightSum;
    for (const model of crossChecks) {
      model.effectiveWeight = model.effectiveWeight / weightSum;
    }

    const best = weightedBestSum / weightSum;
    return {
      low: metaModel.low,
      high: metaModel.high,
      best: Math.min(Math.max(best, metaModel.low), metaModel.high),
      confidence: metaModel.confidence ?? "MEDIUM",
      classification: "META_RANGE_DERIVED",
      narrative:
        "Anchored to Meta's disclosed lower-bound/range for this ad; cross-check models were used only to refine the point estimate within that range, never to widen or override it.",
    };
  }

  // No Meta-derived bound: confidence-weight the available cross-checks
  // and the existing reach-frequency baseline against each other.
  let weightedLowSum = 0;
  let weightedHighSum = 0;
  let weightedBestSum = 0;
  let weightSum = 0;
  let bestConfidence: ModelConfidence = "LOW";

  for (const model of available) {
    const w = model.baseWeight * confidenceMultiplier(model.confidence);
    if (w <= 0) continue;
    weightedLowSum += (model.low as number) * w;
    weightedHighSum += (model.high as number) * w;
    weightedBestSum += (model.best as number) * w;
    weightSum += w;
  }

  if (weightSum <= 0) {
    // Every available model had zero confidence weight — fall back to a
    // straight average rather than dividing by zero, but keep
    // confidence at LOW to reflect how weak this basis is.
    const n = available.length;
    for (const model of available) {
      model.effectiveWeight = 1 / n;
    }
    const best = available.reduce((sum, m) => sum + (m.best as number), 0) / n;
    const low = available.reduce((sum, m) => sum + (m.low as number), 0) / n;
    const high = available.reduce((sum, m) => sum + (m.high as number), 0) / n;
    return {
      low,
      high,
      best,
      confidence: "LOW",
      classification: "MODEL_BASED_ESTIMATE",
      narrative: "No Meta-disclosed bound was available; combined the available cross-check models with equal weight due to uniformly low confidence.",
    };
  }

  for (const model of available) {
    const w = model.baseWeight * confidenceMultiplier(model.confidence);
    model.effectiveWeight = w / weightSum;
  }

  const confidenceOrder: ModelConfidence[] = ["VERY_HIGH", "HIGH", "MEDIUM", "LOW"];
  const topModel = [...available].sort((a, b) => b.effectiveWeight - a.effectiveWeight)[0];
  bestConfidence = topModel?.confidence ?? "LOW";
  // Combining multiple independent weak/low-confidence cross-checks
  // does not manufacture high confidence — cap accordingly.
  if (available.length < 2) {
    bestConfidence = confidenceOrder.includes(bestConfidence) ? bestConfidence : "LOW";
  } else {
    bestConfidence = "LOW";
  }

  return {
    low: weightedLowSum / weightSum,
    high: weightedHighSum / weightSum,
    best: weightedBestSum / weightSum,
    confidence: bestConfidence,
    classification: "MODEL_BASED_ESTIMATE",
    narrative: `No Meta-disclosed delivery data was available for this ad, so the estimate is a confidence-weighted combination of ${available.map((m) => m.label).join(", ")}.`,
  };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

function deriveActiveDays(ad: MetaLibraryAd): number | null {
  if (!ad.startDate) return null;
  const start = new Date(ad.startDate);
  if (Number.isNaN(start.getTime())) return null;
  const end = ad.endDate ? new Date(ad.endDate) : new Date();
  if (Number.isNaN(end.getTime())) return null;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

export function buildImpressionsAssessment(
  ad: MetaLibraryAd,
  reachFrequencyPrediction: { low: number; high: number; estimate: number; confidenceLabel: ModelConfidence | null; predictedFrequency: number } | null,
): ImpressionsAssessment {
  const countryHint = ad.countryHint;

  const observedData: string[] = [];
  if (ad.status) observedData.push(`Status: ${ad.status}`);
  if (ad.startDate) observedData.push(`Start date: ${ad.startDate}`);
  if (ad.endDate) observedData.push(`End date: ${ad.endDate}`);
  if (ad.platforms.length) observedData.push(`Platforms: ${ad.platforms.join(", ")}`);
  if (ad.creative.type !== "unknown") observedData.push(`Creative type: ${ad.creative.type}`);
  if (ad.finalMetrics.spend.status === "META_DISCLOSED") observedData.push(`Spend (Meta-disclosed): ${ad.finalMetrics.spend.raw}`);
  if (ad.finalMetrics.impressions.status === "META_DISCLOSED") observedData.push(`Impressions (Meta-disclosed range): ${ad.finalMetrics.impressions.raw}`);
  if (ad.audienceSize.raw) observedData.push(`Audience/reach signal: ${ad.audienceSize.raw}`);
  if (ad.similarAds != null) observedData.push(`Similar/duplicate active ads: ${ad.similarAds}`);
  if (ad.ctaType || ad.cta) observedData.push(`CTA: ${ad.cta ?? ad.ctaType}`);
  if (ad.engagement.reactions != null) observedData.push(`Reactions: ${ad.engagement.reactions}`);
  if (ad.engagement.comments != null) observedData.push(`Comments: ${ad.engagement.comments}`);
  if (ad.engagement.shares != null) observedData.push(`Shares: ${ad.engagement.shares}`);
  if (ad.engagement.videoViews != null) observedData.push(`Video views: ${ad.engagement.videoViews}`);
  if (countryHint) observedData.push(`Country hint: ${countryHint}`);

  const metaModel = computeLowerBoundModel(ad);
  const spendModel = computeSpendCpmModel(ad, countryHint);
  const reachModel = computeReachFrequencyModel(ad, reachFrequencyPrediction);
  const engagementModel = computeEngagementModel(ad, countryHint);
  const videoModel = computeVideoModel(ad);

  const subModels = [metaModel, spendModel, reachModel, engagementModel, videoModel];
  const final = combineModels(subModels);

  const assumptions = subModels.flatMap((model) => model.assumptions);
  if (!countryHint) {
    assumptions.push("No target country could be determined for this ad, so global-default benchmarks were used instead of Pakistan-specific ones.");
  }

  return {
    adLibraryId: ad.adLibraryId,
    country: countryHint,
    status: ad.status,
    startDate: ad.startDate,
    daysRunning: deriveActiveDays(ad),
    observedData,
    assumptions,
    subModels,
    final,
  };
}

/** Builds the ad-card MetaMetric from a combined assessment. */
export function buildHeuristicImpressionsMetric(assessment: ImpressionsAssessment): MetaMetric {
  const { final } = assessment;

  if (final.confidence === "INSUFFICIENT_DATA" || final.low == null || final.high == null || final.best == null) {
    return {
      raw: "Not available",
      min: null,
      max: null,
      status: "NOT_AVAILABLE",
      source: "IN_HOUSE_MODEL",
      path: "heuristicModel.final",
      dataType: null,
      confidence: null,
      retrievedAt: new Date().toISOString(),
      low: null,
      high: null,
      confidenceLabel: null,
      explanation: [final.narrative],
      displayLabel: "NOT AVAILABLE",
      displaySublabel: "INSUFFICIENT DATA",
      modelStage: "EXPERIMENTAL",
    };
  }

  return {
    raw: formatCompact(final.best),
    min: final.best,
    max: final.best,
    status: "ESTIMATED",
    source: "IN_HOUSE_MODEL",
    path: "heuristicModel.final",
    dataType: final.classification === "META_RANGE_DERIVED" ? "PUBLIC_RANGE" : "MODELED_ESTIMATE",
    confidence: null,
    retrievedAt: new Date().toISOString(),
    low: final.low,
    high: final.high,
    confidenceLabel: final.confidence,
    explanation: [
      final.narrative,
      ...assessment.subModels.filter((m) => m.available).map((m) => `${m.label}: ${formatWithCommas(m.best as number)} (weight ${(m.effectiveWeight * 100).toFixed(0)}%)`),
    ],
    displayLabel: final.classification === "META_RANGE_DERIVED" ? "META RANGE-DERIVED ESTIMATE" : "MODEL-BASED ESTIMATE",
    displaySublabel: `${final.confidence} CONFIDENCE`,
    modelStage: "EXPERIMENTAL",
  };
}

/** Renders the exact REQUIRED OUTPUT report structure. */
export function formatImpressionsAssessmentReport(assessment: ImpressionsAssessment): string {
  const lines: string[] = [];
  lines.push(`Ad ID: ${assessment.adLibraryId}`);
  lines.push(`Country: ${assessment.country ?? "Not determined"}`);
  lines.push(`Status: ${assessment.status}`);
  lines.push(`Start Date: ${assessment.startDate ?? "Not available"}`);
  lines.push(`Days Running: ${assessment.daysRunning ?? "Not available"}`);
  lines.push("");
  lines.push("OBSERVED DATA");
  lines.push(...(assessment.observedData.length ? assessment.observedData.map((line) => `- ${line}`) : ["- No public delivery data was observed."]));
  lines.push("");
  lines.push("ASSUMPTIONS");
  lines.push(...(assessment.assumptions.length ? assessment.assumptions.map((line) => `- ${line}`) : ["- None — no benchmark assumptions were required."]));
  lines.push("");
  lines.push("CALCULATIONS");

  const order: SubModelKey[] = ["META_LOWER_BOUND", "SPEND_CPM", "ENGAGEMENT", "VIDEO_VIEWS"];
  order.forEach((key, index) => {
    const model = assessment.subModels.find((m) => m.key === key);
    lines.push(`${index + 1}. ${model?.label ?? key}:`);
    if (!model || !model.available) {
      lines.push(`   Insufficient data.${model?.reason ? ` (${model.reason})` : ""}`);
    } else {
      lines.push(`   Formula: ${model.formula}`);
      lines.push(`   ${model.calculation}`);
    }
  });

  lines.push("");
  lines.push("FINAL RESULT");
  if (assessment.final.confidence === "INSUFFICIENT_DATA" || assessment.final.low == null || assessment.final.high == null || assessment.final.best == null) {
    lines.push("Estimated Total Impressions Range: Insufficient data to construct a meaningful estimate.");
    lines.push("Best Estimated Impressions: Not available.");
    lines.push("Confidence: Insufficient data.");
  } else {
    lines.push(`Estimated Total Impressions Range: ${formatWithCommas(assessment.final.low)} – ${formatWithCommas(assessment.final.high)} (${formatCompact(assessment.final.low)} – ${formatCompact(assessment.final.high)})`);
    lines.push(`Best Estimated Impressions: ${formatWithCommas(assessment.final.best)} (${formatCompact(assessment.final.best)})`);
    lines.push(`Confidence: ${assessment.final.confidence}`);
  }
  lines.push(`Classification: ${assessment.final.classification}`);
  lines.push(assessment.final.narrative);
  lines.push("");
  lines.push(
    assessment.final.classification === "META_REPORTED_EXACT"
      ? "This figure is Meta-reported exact data."
      : "This figure is a modeled estimate, not exact data. Meta does not publicly disclose exact impressions for ordinary ads.",
  );

  return lines.join("\n");
}
