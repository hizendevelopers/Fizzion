import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  findExactTrainingRowByAdLibraryId,
  getDefaultTrainingDatasetPaths,
  readMetaTrainingCsv,
  type MetaTrainingRow,
} from "@/lib/meta-training-dataset";
import type {
  InHouseDistributionStatus,
  InHouseModelConfidence,
  MetaLibraryAd,
  MetaMetric,
} from "@/lib/meta-library";

export type InHouseModelDebugStatus =
  | "MODEL_NOT_AVAILABLE"
  | "GROUND_TRUTH_DATA_REQUIRED"
  | "PREDICTION_AVAILABLE"
  | "MODEL_RUNTIME_ERROR"
  | "FEATURES_INSUFFICIENT";

export type InHouseImpressionPrediction = {
  metric: "impressions";
  estimate: number;
  low: number;
  high: number;
  predictedFrequency: number;
  source: "IN_HOUSE_MODEL";
  dataType: "MODELED_ESTIMATE";
  modelVersion: string;
  datasetVersion: string;
  confidence: InHouseModelConfidence;
  featureCoverage: number;
  distributionStatus: InHouseDistributionStatus;
  predictedAt: string;
  exactReason: string | null;
  explanation: string[];
  modelStage: "EXPERIMENTAL";
  trainingRows: number;
};

export type InHousePredictionResult = {
  status: InHouseModelDebugStatus;
  prediction: InHouseImpressionPrediction | null;
  reason: string | null;
};

export type PublicTrainingRangeMatch = {
  recordId: string;
  adLibraryId: string;
  source: "PUBLIC_META_TRAINING_DATA";
  labelStrength: string;
  reach: number | null;
  reachLow: number | null;
  reachHigh: number | null;
  impressions: number | null;
  impressionsLow: number | null;
  impressionsHigh: number | null;
  raw: string;
  retrievedAt: string | null;
};

type WeakRangeTrainingExample = {
  recordId: string;
  advertiserKey: string;
  adLibraryId: string | null;
  reachValue: number;
  impressionsLow: number;
  impressionsHigh: number;
  impressionsMid: number;
  frequencyLow: number;
  frequencyHigh: number;
  frequencyMid: number;
  platformKey: string;
  creativeType: string;
  activeDaysBucket: string;
  reachBucket: string;
  landingDomainPresent: boolean;
};

type FrequencyStats = {
  count: number;
  median: number;
  p25: number;
  p75: number;
  min: number;
  max: number;
};

type WeakModelArtifact = {
  modelVersion: string;
  datasetVersion: string;
  modelStage: "EXPERIMENTAL";
  trainingRows: number;
  featureSchema: string[];
  createdAt: string;
  globalStats: FrequencyStats;
  reachRange: {
    min: number;
    max: number;
  };
  groupStats: Record<string, FrequencyStats>;
  validation: {
    method: string;
    holdoutAdvertisers: number;
    midpointMae: number;
    midpointMape: number | null;
    estimateInsideActualIntervalRate: number;
  };
};

type WeakModelPrediction = {
  estimate: number;
  low: number;
  high: number;
  predictedFrequency: number;
  confidence: InHouseModelConfidence;
  featureCoverage: number;
  distributionStatus: InHouseDistributionStatus;
  explanation: string[];
  matchedGroupKey: string;
  matchedGroupCount: number;
};

let cachedWeakModel: WeakModelArtifact | null = null;

function getNodeModule<T>(name: string) {
  return process.getBuiltinModule?.(name) as T | undefined;
}

function formatCompactEstimate(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `~${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (abs >= 1_000) {
    return `~${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `~${Math.round(value)}`;
}

function formatCompactRange(low: number | null, high: number | null) {
  if (low == null && high == null) {
    return null;
  }

  const compact = (value: number) => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    }
    return `${Math.round(value)}`;
  };

  if (low != null && high != null) {
    return `${compact(low)} – ${compact(high)}`;
  }

  return compact(low ?? high ?? 0);
}

function getArtifactPath() {
  return path.resolve(process.cwd(), "..", "..", "data", "meta-training", "models", "weak-impressions-v1.json");
}

function getPredictionScriptPath() {
  return path.resolve(process.cwd(), "..", "..", "ml", "predict_impressions.py");
}

function getModelDirectory() {
  const configured = process.env.META_IMPRESSIONS_MODEL_DIR?.trim();
  if (configured) {
    return path.resolve(process.cwd(), configured);
  }

  return path.resolve(process.cwd(), "..", "..", "ml", "models", "impressions", "production");
}

function getPythonCommand() {
  const configured = process.env.PYTHON_EXECUTABLE?.trim();
  if (configured) {
    return configured;
  }

  const candidates = process.platform === "win32"
    ? [
        path.resolve(process.cwd(), "..", "..", ".venv-impressions", "Scripts", "python.exe"),
        path.resolve(process.cwd(), "..", "..", ".venv-ml", "Scripts", "python.exe"),
        path.resolve(process.cwd(), "..", "..", ".venv", "Scripts", "python.exe"),
      ]
    : [
        path.resolve(process.cwd(), "..", "..", ".venv-impressions", "bin", "python"),
        path.resolve(process.cwd(), "..", "..", ".venv-ml", "bin", "python"),
        path.resolve(process.cwd(), "..", "..", ".venv", "bin", "python"),
      ];

  const discovered = candidates.find((candidate) => existsSync(candidate));
  return discovered ?? "python";
}

function midpoint(low: number | null, high: number | null) {
  if (low != null && high != null) {
    return (low + high) / 2;
  }
  return low ?? high ?? null;
}

function normalizedReachValue(row: MetaTrainingRow) {
  return row.reach ?? midpoint(row.reachLow, row.reachHigh);
}

function normalizedImpressionLow(row: MetaTrainingRow) {
  return row.impressionsLow ?? row.impressions;
}

function normalizedImpressionHigh(row: MetaTrainingRow) {
  return row.impressionsHigh ?? row.impressions;
}

function quantile(values: number[], q: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  const lower = sorted[base] ?? sorted[sorted.length - 1];
  const upper = sorted[base + 1] ?? lower;
  return lower + rest * (upper - lower);
}

function toFrequencyStats(values: number[]): FrequencyStats {
  const sorted = [...values].sort((left, right) => left - right);
  return {
    count: sorted.length,
    median: quantile(sorted, 0.5),
    p25: quantile(sorted, 0.25),
    p75: quantile(sorted, 0.75),
    min: sorted[0] ?? 0,
    max: sorted.at(-1) ?? 0,
  };
}

function platformKey(platforms: string[]) {
  return platforms.length ? [...platforms].sort().join("+") : "UNKNOWN";
}

function activeDaysBucket(activeDays: number | null) {
  const value = activeDays ?? 0;
  if (value <= 3) return "0_3";
  if (value <= 7) return "4_7";
  if (value <= 14) return "8_14";
  if (value <= 30) return "15_30";
  return "31_plus";
}

function reachBucket(reach: number) {
  if (reach < 100) return "lt_100";
  if (reach < 1_000) return "100_999";
  if (reach < 10_000) return "1k_9k";
  if (reach < 100_000) return "10k_99k";
  if (reach < 1_000_000) return "100k_999k";
  return "1m_plus";
}

function deriveActiveDays(ad: MetaLibraryAd) {
  if (ad.startDate && ad.endDate) {
    const start = new Date(ad.startDate);
    const end = new Date(ad.endDate);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const diff = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
      return diff;
    }
  }

  return null;
}

function featureCoverage(ad: MetaLibraryAd) {
  const checks = [
    ad.audienceSize.max != null || ad.audienceSize.min != null,
    ad.platforms.length > 0,
    ad.creative.type !== "unknown",
    deriveActiveDays(ad) != null,
    Boolean(ad.landingDomain),
  ];
  return checks.filter(Boolean).length / checks.length;
}

function buildGroupKeys(input: {
  platformKey: string;
  creativeType: string;
  activeDaysBucket: string;
  reachBucket: string;
}) {
  const { platformKey: p, creativeType: c, activeDaysBucket: a, reachBucket: r } = input;
  return [
    `p=${p}|c=${c}|a=${a}|r=${r}`,
    `p=${p}|c=${c}|r=${r}`,
    `p=${p}|c=${c}`,
    `c=${c}|r=${r}`,
    `p=${p}`,
    `c=${c}`,
    "global",
  ];
}

function normalizeTrainingRows(rows: MetaTrainingRow[]) {
  return rows
    .filter((row) => row.isLabelAligned)
    .map((row): WeakRangeTrainingExample | null => {
      const reachValue = normalizedReachValue(row);
      const impressionsLow = normalizedImpressionLow(row);
      const impressionsHigh = normalizedImpressionHigh(row);

      if (!reachValue || reachValue <= 0 || !impressionsLow || !impressionsHigh || impressionsLow <= 0 || impressionsHigh <= 0) {
        return null;
      }

      const impressionsMid = midpoint(impressionsLow, impressionsHigh);
      if (!impressionsMid || impressionsMid <= 0) {
        return null;
      }

      const frequencyLow = impressionsLow / reachValue;
      const frequencyHigh = impressionsHigh / reachValue;
      const frequencyMid = (frequencyLow + frequencyHigh) / 2;

      return {
        recordId: row.recordId,
        advertiserKey: (row.advertiserName ?? "unknown").trim().toLowerCase(),
        adLibraryId: row.adLibraryId,
        reachValue,
        impressionsLow,
        impressionsHigh,
        impressionsMid,
        frequencyLow,
        frequencyHigh,
        frequencyMid,
        platformKey: platformKey(row.platforms),
        creativeType: (row.creativeType ?? "UNKNOWN").toUpperCase(),
        activeDaysBucket: activeDaysBucket(row.activeDays),
        reachBucket: reachBucket(reachValue),
        landingDomainPresent: Boolean(row.landingDomain),
      };
    })
    .filter((row): row is WeakRangeTrainingExample => Boolean(row));
}

function buildArtifactFromRows(rows: MetaTrainingRow[]): WeakModelArtifact | null {
  const examples = normalizeTrainingRows(rows);
  if (examples.length === 0) {
    return null;
  }

  const advertisers = [...new Set(examples.map((row) => row.advertiserKey))].sort();
  const holdoutAdvertisers = new Set(advertisers.filter((_, index) => index % 5 === 4));
  const trainRows = examples.filter((row) => !holdoutAdvertisers.has(row.advertiserKey));
  const testRows = examples.filter((row) => holdoutAdvertisers.has(row.advertiserKey));

  const groupValues = new Map<string, number[]>();
  const globalValues = trainRows.map((row) => row.frequencyMid);
  for (const row of trainRows) {
    for (const key of buildGroupKeys(row)) {
      const list = groupValues.get(key) ?? [];
      list.push(row.frequencyMid);
      groupValues.set(key, list);
    }
  }

  const globalStats = toFrequencyStats(globalValues.length > 0 ? globalValues : examples.map((row) => row.frequencyMid));
  const groupStats = Object.fromEntries(
    [...groupValues.entries()].map(([key, values]) => [key, toFrequencyStats(values)]),
  );

  const predictFromArtifact = (
    example: Pick<WeakRangeTrainingExample, "platformKey" | "creativeType" | "activeDaysBucket" | "reachBucket" | "reachValue" | "landingDomainPresent">,
  ) => {
    const keys = buildGroupKeys(example);
    const matchedKey = keys.find((key) => key === "global" || groupStats[key]);
    const stats = matchedKey && matchedKey !== "global" ? groupStats[matchedKey] : globalStats;
    return {
      matchedKey: matchedKey ?? "global",
      stats,
    };
  };

  const midpointErrors: number[] = [];
  const midpointMapes: number[] = [];
  const estimateInsideActualIntervalFlags: boolean[] = [];
  for (const row of testRows) {
    const prediction = predictFromArtifact(row);
    const predictedImpressions = row.reachValue * prediction.stats.median;
    midpointErrors.push(Math.abs(predictedImpressions - row.impressionsMid));
    if (row.impressionsMid > 0) {
      midpointMapes.push(Math.abs(predictedImpressions - row.impressionsMid) / row.impressionsMid);
    }
    estimateInsideActualIntervalFlags.push(
      predictedImpressions >= row.impressionsLow && predictedImpressions <= row.impressionsHigh,
    );
  }

  const datasetVersion = `public-meta-weak-range-${new Date().toISOString().slice(0, 10)}-v1`;

  return {
    modelVersion: "weak-impressions-v1",
    datasetVersion,
    modelStage: "EXPERIMENTAL",
    trainingRows: examples.length,
    featureSchema: ["platformKey", "creativeType", "activeDaysBucket", "reachBucket"],
    createdAt: new Date().toISOString(),
    globalStats,
    reachRange: {
      min: Math.min(...examples.map((row) => row.reachValue)),
      max: Math.max(...examples.map((row) => row.reachValue)),
    },
    groupStats,
    validation: {
      method: "Advertiser-grouped 80/20 holdout using frequency midpoint approximation from weak public ranges",
      holdoutAdvertisers: holdoutAdvertisers.size,
      midpointMae: midpointErrors.length > 0 ? midpointErrors.reduce((sum, value) => sum + value, 0) / midpointErrors.length : 0,
      midpointMape:
        midpointMapes.length > 0 ? midpointMapes.reduce((sum, value) => sum + value, 0) / midpointMapes.length : null,
      estimateInsideActualIntervalRate:
        estimateInsideActualIntervalFlags.length > 0
          ? estimateInsideActualIntervalFlags.filter(Boolean).length / estimateInsideActualIntervalFlags.length
          : 0,
    },
  };
}

function loadWeakModelArtifact(): WeakModelArtifact | null {
  if (cachedWeakModel) {
    return cachedWeakModel;
  }

  const artifactPath = getArtifactPath();
  const datasetPath = getDefaultTrainingDatasetPaths().csvPath;

  if (existsSync(artifactPath) && existsSync(datasetPath)) {
    const artifactMtime = statSync(artifactPath).mtimeMs;
    const datasetMtime = statSync(datasetPath).mtimeMs;
    if (artifactMtime >= datasetMtime) {
      cachedWeakModel = JSON.parse(readFileSync(artifactPath, "utf8")) as WeakModelArtifact;
      return cachedWeakModel;
    }
  }

  const rows = readMetaTrainingCsv(datasetPath);
  const artifact = buildArtifactFromRows(rows);
  if (!artifact) {
    return null;
  }

  mkdirSync(path.dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
  cachedWeakModel = artifact;
  return artifact;
}

function buildPredictionPayload(ad: MetaLibraryAd) {
  const reach = ad.audienceSize.max ?? ad.audienceSize.min;
  const activeDays = deriveActiveDays(ad);
  const pKey = platformKey(ad.platforms);
  const cType = ad.creative.type.toUpperCase();
  const rBucket = reachBucket(reach ?? 0);
  const aBucket = activeDaysBucket(activeDays);

  return {
    reach,
    platformKey: pKey,
    creativeType: cType,
    activeDays,
    activeDaysBucket: aBucket,
    reachBucket: rBucket,
    landingDomainPresent: Boolean(ad.landingDomain),
  };
}

function predictWithWeakArtifact(artifact: WeakModelArtifact, ad: MetaLibraryAd): WeakModelPrediction | null {
  const payload = buildPredictionPayload(ad);
  if (!payload.reach || payload.reach <= 0) {
    return null;
  }

  const keys = buildGroupKeys({
    platformKey: payload.platformKey,
    creativeType: payload.creativeType,
    activeDaysBucket: payload.activeDaysBucket,
    reachBucket: payload.reachBucket,
  });

  const matchedKey = keys.find((key) => key === "global" || artifact.groupStats[key]) ?? "global";
  const stats = matchedKey === "global" ? artifact.globalStats : artifact.groupStats[matchedKey] ?? artifact.globalStats;
  const estimate = Math.max(1, Math.round(payload.reach * stats.median));
  const low = Math.max(1, Math.round(payload.reach * stats.p25));
  const high = Math.max(low, Math.round(payload.reach * stats.p75));

  const inDistribution =
    payload.reach >= artifact.reachRange.min * 0.5 &&
    payload.reach <= artifact.reachRange.max * 1.5;
  const coverage = featureCoverage(ad);
  const confidence: InHouseModelConfidence =
    stats.count >= 10 && inDistribution && coverage >= 0.8 ? "MEDIUM" : "LOW";
  const distributionStatus: InHouseDistributionStatus =
    !inDistribution && stats.count < 5
      ? "OUT_OF_DISTRIBUTION"
      : !inDistribution || coverage < 0.8
        ? "PARTIAL_OOD"
        : "IN_DISTRIBUTION";

  return {
    estimate,
    low,
    high,
    predictedFrequency: stats.median,
    confidence,
    featureCoverage: coverage,
    distributionStatus,
    explanation: [
      `Experimental weak-range baseline used group ${matchedKey}.`,
      `Group training rows: ${stats.count}.`,
      `Frequency median ${stats.median.toFixed(2)}x with interquartile range ${stats.p25.toFixed(2)}x – ${stats.p75.toFixed(2)}x.`,
      `Validation midpoint MAE: ${Math.round(artifact.validation.midpointMae)} impressions.`,
    ],
    matchedGroupKey: matchedKey,
    matchedGroupCount: stats.count,
  };
}

async function estimateWithExperimentalWeakModel(ad: MetaLibraryAd): Promise<InHousePredictionResult> {
  const reach = ad.audienceSize.max ?? ad.audienceSize.min;
  if (!reach || reach <= 0) {
    return {
      status: "FEATURES_INSUFFICIENT",
      prediction: null,
      reason: "Reach is missing, so the weak-range baseline cannot estimate impressions.",
    };
  }

  const artifact = loadWeakModelArtifact();
  if (!artifact) {
    return {
      status: "GROUND_TRUTH_DATA_REQUIRED",
      prediction: null,
      reason: "No weak-range training rows were available to build the experimental impressions baseline.",
    };
  }

  const predicted = predictWithWeakArtifact(artifact, ad);
  if (!predicted) {
    return {
      status: "FEATURES_INSUFFICIENT",
      prediction: null,
      reason: "The ad did not provide enough features to run the experimental weak-range baseline.",
    };
  }

  return {
    status: "PREDICTION_AVAILABLE",
    prediction: {
      metric: "impressions",
      estimate: predicted.estimate,
      low: predicted.low,
      high: predicted.high,
      predictedFrequency: predicted.predictedFrequency,
      source: "IN_HOUSE_MODEL",
      dataType: "MODELED_ESTIMATE",
      modelVersion: artifact.modelVersion,
      datasetVersion: artifact.datasetVersion,
      confidence: predicted.confidence,
      featureCoverage: predicted.featureCoverage,
      distributionStatus: predicted.distributionStatus,
      predictedAt: new Date().toISOString(),
      exactReason: null,
      explanation: predicted.explanation,
      modelStage: "EXPERIMENTAL",
      trainingRows: artifact.trainingRows,
    },
    reason: null,
  };
}

export function buildModeledImpressionsMetric(prediction: InHouseImpressionPrediction): MetaMetric {
  return {
    raw: formatCompactEstimate(prediction.estimate),
    min: prediction.estimate,
    max: prediction.estimate,
    status: "ESTIMATED",
    source: "IN_HOUSE_MODEL",
    path: "model.prediction",
    dataType: "MODELED_ESTIMATE",
    confidence: null,
    retrievedAt: prediction.predictedAt,
    low: prediction.low,
    high: prediction.high,
    predictedFrequency: prediction.predictedFrequency,
    modelVersion: prediction.modelVersion,
    datasetVersion: prediction.datasetVersion,
    featureCoverage: prediction.featureCoverage,
    distributionStatus: prediction.distributionStatus,
    confidenceLabel: prediction.confidence,
    exactReason: prediction.exactReason,
    explanation: prediction.explanation,
    displayLabel: "ESTIMATED",
    displaySublabel: "EXPERIMENTAL MODEL",
    modelStage: prediction.modelStage,
    trainingRows: prediction.trainingRows,
  };
}

export function buildPublicTrainingRangeMetric(match: PublicTrainingRangeMatch): MetaMetric {
  return {
    raw: match.raw,
    min: match.impressionsLow ?? match.impressions ?? null,
    max: match.impressionsHigh ?? match.impressions ?? null,
    status: "ESTIMATED",
    source: "PUBLIC_META_TRAINING_DATA",
    path: `trainingDataset.${match.recordId}`,
    dataType: "PUBLIC_RANGE",
    confidence: null,
    retrievedAt: match.retrievedAt,
    low: match.impressionsLow ?? match.impressions ?? null,
    high: match.impressionsHigh ?? match.impressions ?? null,
    predictedFrequency: null,
    modelVersion: null,
    datasetVersion: null,
    featureCoverage: 1,
    distributionStatus: "IN_DISTRIBUTION",
    confidenceLabel: "MEDIUM",
    exactReason: "Exact public Meta weak-range row matched this Ad Library ID.",
    explanation: [
      `Matched training record ${match.recordId} for the same Ad Library ID.`,
      "Using the stored public Meta impression range directly, without invoking the model.",
    ],
    displayLabel: "PUBLIC META RANGE",
    displaySublabel: "WEAK RANGE",
    modelStage: null,
    trainingRows: null,
  };
}

export async function findExactPublicTrainingRange(adLibraryId: string): Promise<PublicTrainingRangeMatch | null> {
  const row = await findExactTrainingRowByAdLibraryId(adLibraryId);
  if (!row) {
    return null;
  }

  const impressionsLow = row.impressionsLow ?? row.impressions ?? null;
  const impressionsHigh = row.impressionsHigh ?? row.impressions ?? null;
  if (impressionsLow == null && impressionsHigh == null) {
    return null;
  }

  return {
    recordId: row.recordId,
    adLibraryId: row.adLibraryId ?? adLibraryId,
    source: "PUBLIC_META_TRAINING_DATA",
    labelStrength: row.labelStrength,
    reach: row.reach,
    reachLow: row.reachLow,
    reachHigh: row.reachHigh,
    impressions: row.impressions,
    impressionsLow: row.impressionsLow,
    impressionsHigh: row.impressionsHigh,
    raw: formatCompactRange(impressionsLow, impressionsHigh) ?? "Not available",
    retrievedAt: row.retrievedAt,
  };
}

function fallbackToPythonModel(ad: MetaLibraryAd): InHousePredictionResult {
  const reach = ad.audienceSize.max ?? ad.audienceSize.min;
  if (!reach || reach <= 0) {
    return {
      status: "FEATURES_INSUFFICIENT",
      prediction: null,
      reason: "Reach is missing, so the in-house frequency model cannot estimate impressions.",
    };
  }

  const scriptPath = getPredictionScriptPath();
  const modelDir = getModelDirectory();
  const childProcess = getNodeModule<typeof import("node:child_process")>("node:child_process");
  if (!existsSync(scriptPath) || !existsSync(modelDir) || !childProcess) {
    return {
      status: "MODEL_NOT_AVAILABLE",
      prediction: null,
      reason: "No production impressions model artifact is available yet.",
    };
  }

  const pythonCommand = getPythonCommand();
  const payload = JSON.stringify({
    adLibraryId: ad.adLibraryId,
    pageName: ad.pageName,
    platforms: ad.platforms,
    reach,
    creativeType: ad.creative.type.toUpperCase(),
    startDate: ad.startDate,
    endDate: ad.endDate,
    similarAds: ad.similarAds,
    variationCount: ad.variationCount,
    landingDomain: ad.landingDomain,
    ctaType: ad.ctaType,
    copyLength: ad.copy?.length ?? 0,
    headlineLength: ad.title?.length ?? 0,
    descriptionLength: ad.description?.length ?? 0,
    isActive: ad.status === "ACTIVE",
  });
  const output = childProcess.spawnSync(
    pythonCommand,
    [scriptPath, "--model-dir", modelDir, "--payload", payload],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 120_000,
    },
  );

  if (output.error) {
    return {
      status: "MODEL_RUNTIME_ERROR",
      prediction: null,
      reason: output.error.message,
    };
  }

  const stdout = output.stdout?.trim();
  if (!stdout) {
    return {
      status: "MODEL_RUNTIME_ERROR",
      prediction: null,
      reason: output.stderr?.trim() || "The prediction script returned no output.",
    };
  }

  try {
    const parsed = JSON.parse(stdout) as {
      status?: InHouseModelDebugStatus;
      prediction?: InHouseImpressionPrediction | null;
      reason?: string | null;
    };
    return {
      status: parsed.status ?? "MODEL_RUNTIME_ERROR",
      prediction: parsed.prediction ?? null,
      reason: parsed.reason ?? null,
    };
  } catch {
    return {
      status: "MODEL_RUNTIME_ERROR",
      prediction: null,
      reason: `The prediction script returned invalid JSON: ${stdout.slice(0, 300)}`,
    };
  }
}

export async function estimateImpressionsWithInHouseModel(ad: MetaLibraryAd): Promise<InHousePredictionResult> {
  const weakModel = await estimateWithExperimentalWeakModel(ad);
  if (weakModel.status === "PREDICTION_AVAILABLE" || weakModel.status === "FEATURES_INSUFFICIENT") {
    return weakModel;
  }

  return fallbackToPythonModel(ad);
}

export function getExperimentalWeakModelSummary() {
  const artifact = loadWeakModelArtifact();
  return artifact
    ? {
        modelVersion: artifact.modelVersion,
        datasetVersion: artifact.datasetVersion,
        trainingRows: artifact.trainingRows,
        validation: artifact.validation,
      }
    : null;
}
