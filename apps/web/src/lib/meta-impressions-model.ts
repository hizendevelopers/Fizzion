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
};

export type InHousePredictionResult = {
  status: InHouseModelDebugStatus;
  prediction: InHouseImpressionPrediction | null;
  reason: string | null;
};

function getNodeModule<T>(name: string) {
  return process.getBuiltinModule?.(name) as T | undefined;
}

function formatCompactEstimate(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `~${(value / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `~${(value / 1_000).toFixed(1)}K`;
  }
  return `~${Math.round(value)}`;
}

function getModelDirectory() {
  const path = getNodeModule<typeof import("node:path")>("node:path");
  if (!path) {
    return null;
  }

  const configured = process.env.META_IMPRESSIONS_MODEL_DIR?.trim();
  if (configured) {
    return path.resolve(process.cwd(), configured);
  }

  return path.resolve(process.cwd(), "..", "..", "ml", "models", "impressions", "production");
}

function getPredictionScriptPath() {
  const path = getNodeModule<typeof import("node:path")>("node:path");
  if (!path) {
    return null;
  }

  return path.resolve(process.cwd(), "..", "..", "ml", "predict_impressions.py");
}

function getPythonCommand() {
  const path = getNodeModule<typeof import("node:path")>("node:path");
  const fs = getNodeModule<typeof import("node:fs")>("node:fs");
  if (!path || !fs) {
    return "python";
  }

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

  const discovered = candidates.find((candidate) => fs.existsSync(candidate));
  return discovered ?? "python";
}

function buildPredictionPayload(ad: MetaLibraryAd) {
  return {
    adLibraryId: ad.adLibraryId,
    pageName: ad.pageName,
    platforms: ad.platforms,
    reach: ad.audienceSize.max ?? ad.audienceSize.min,
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
  };
}

export async function estimateImpressionsWithInHouseModel(ad: MetaLibraryAd): Promise<InHousePredictionResult> {
  const reach = ad.audienceSize.max ?? ad.audienceSize.min;
  if (!reach || reach <= 0) {
    return {
      status: "FEATURES_INSUFFICIENT",
      prediction: null,
      reason: "Reach is missing, so the in-house frequency model cannot estimate impressions.",
    };
  }

  const fs = getNodeModule<typeof import("node:fs")>("node:fs");
  const path = getNodeModule<typeof import("node:path")>("node:path");
  const childProcess = getNodeModule<typeof import("node:child_process")>("node:child_process");
  if (!fs || !path || !childProcess) {
    return {
      status: "MODEL_RUNTIME_ERROR",
      prediction: null,
      reason: "Node runtime modules required for model inference are unavailable.",
    };
  }

  const modelDir = getModelDirectory();
  const scriptPath = getPredictionScriptPath();
  if (!modelDir || !scriptPath || !fs.existsSync(modelDir) || !fs.existsSync(scriptPath)) {
    return {
      status: "MODEL_NOT_AVAILABLE",
      prediction: null,
      reason: "No production impressions model artifact is available yet.",
    };
  }

  const pythonCommand = getPythonCommand();
  const payload = JSON.stringify(buildPredictionPayload(ad));
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

  let parsed: {
    status?: InHouseModelDebugStatus;
    prediction?: InHouseImpressionPrediction | null;
    reason?: string | null;
  };

  try {
    parsed = JSON.parse(stdout) as typeof parsed;
  } catch {
    return {
      status: "MODEL_RUNTIME_ERROR",
      prediction: null,
      reason: `The prediction script returned invalid JSON: ${stdout.slice(0, 300)}`,
    };
  }

  return {
    status: parsed.status ?? "MODEL_RUNTIME_ERROR",
    prediction: parsed.prediction ?? null,
    reason: parsed.reason ?? null,
  };
}
