"use client";

import { useEffect, useMemo, useState } from "react";

import type { ImpressionsAssessment } from "@/lib/meta-impressions-heuristic-model";

type MetaMetricSource =
  | "META_AD_LIBRARY"
  | "META_AD_LIBRARY_DETAIL"
  | "META_PUBLIC_DETAIL_TEXT"
  | "META_ADVERTISER_TRANSPARENCY"
  | "PUBLIC_META_TRAINING_DATA"
  | "IN_HOUSE_MODEL"
  | "PATHMATICS"
  | "NONE";
type MetaMetricStatus = "CHECKING" | "META_DISCLOSED" | "META_NOT_DISCLOSED" | "ESTIMATED" | "NOT_AVAILABLE";
type MetaDetailStatus = "PENDING" | "META_DISCLOSED" | "META_NOT_DISCLOSED" | "META_BROWSER_FAILED";
type InHouseModelConfidence = "HIGH" | "MEDIUM" | "LOW";
type InHouseDistributionStatus = "IN_DISTRIBUTION" | "PARTIAL_OOD" | "OUT_OF_DISTRIBUTION";
type PathmaticsDebugStatus =
  | "PENDING"
  | "PATHMATICS_NOT_CONFIGURED"
  | "PATHMATICS_AUTH_FAILED"
  | "PATHMATICS_RATE_LIMITED"
  | "PATHMATICS_QUERY_FAILED"
  | "PATHMATICS_NO_MATCH"
  | "PATHMATICS_LOW_CONFIDENCE"
  | "PATHMATICS_MATCH_FOUND"
  | "PATHMATICS_METRIC_NOT_AD_LEVEL";

type MetaMetric = {
  raw: string | null;
  min: number | null;
  max: number | null;
  status: MetaMetricStatus;
  source: MetaMetricSource;
  path: string | null;
  dataType: "DISCLOSED" | "ESTIMATED" | "MODELED_ESTIMATE" | "PUBLIC_RANGE" | null;
  confidence: number | null;
  retrievedAt: string | null;
  low?: number | null;
  high?: number | null;
  predictedFrequency?: number | null;
  modelVersion?: string | null;
  datasetVersion?: string | null;
  featureCoverage?: number | null;
  distributionStatus?: InHouseDistributionStatus | null;
  confidenceLabel?: InHouseModelConfidence | null;
  exactReason?: string | null;
  explanation?: string[];
  displayLabel?: string | null;
  displaySublabel?: string | null;
  modelStage?: "EXPERIMENTAL" | "PRODUCTION" | null;
  trainingRows?: number | null;
};

type MetaSpendMetric = MetaMetric & {
  currency: string | null;
};

type MetaLibraryAd = {
  adLibraryId: string;
  pageName: string | null;
  adLibraryUrl: string;
  advertiserUrl: string | null;
  status: "ACTIVE" | "INACTIVE";
  copy: string | null;
  title: string | null;
  description: string | null;
  cta: string | null;
  ctaType: string | null;
  creative: {
    type: "image" | "video" | "mixed" | "unknown";
    url: string | null;
    imageUrls: string[];
    videoUrls: string[];
    cards: Array<{
      title: string | null;
      body: string | null;
      description: string | null;
      imageUrl: string | null;
      videoUrl: string | null;
      destinationUrl: string | null;
      cta: string | null;
    }>;
  };
  platforms: string[];
  startDate: string | null;
  endDate: string | null;
  similarAds: number | null;
  variationGroupId: string | null;
  variationCount: number | null;
  spend: MetaSpendMetric;
  impressions: MetaMetric;
  audienceSize: MetaMetric;
  metaMetrics: {
    spend: MetaSpendMetric;
    impressions: MetaMetric;
    audienceSize: MetaMetric;
  };
  metaDetailMetrics: {
    spend: MetaSpendMetric;
    impressions: MetaMetric;
    audienceSize: MetaMetric;
  };
  pathmaticsMetrics: {
    spend: MetaSpendMetric | null;
    impressions: MetaMetric | null;
    audienceSize: MetaMetric | null;
    providerStatus: PathmaticsDebugStatus;
    providerMessage: string | null;
  };
  modelMetrics: {
    impressions: MetaMetric | null;
  };
  finalMetrics: {
    spend: MetaSpendMetric;
    impressions: MetaMetric;
    audienceSize: MetaMetric;
  };
  landingDomain: string | null;
  rawMetaData: Record<string, unknown>;
  debug: {
    metricCandidates: Array<{ path: string; value: unknown }>;
    sourceUrl: string | null;
    actorInputUrl: string | null;
    metaDetail?: {
      checkedAt: string | null;
      status?: MetaDetailStatus;
      pageUrl: string;
      transport?: "apify-playwright" | "none";
      errorMessage?: string | null;
      actorId?: string | null;
      actorRunId?: string | null;
      actorDatasetId?: string | null;
      pageLoaded?: boolean;
      mainResponseStatus?: number | null;
      mainResponseUrl?: string | null;
      visibleTextSnippet: string | null;
      structuredCandidates: Array<{ path: string; value: unknown }>;
      responses: Array<{ url: string; status: number; bodySnippet: string | null }>;
    };
    pathmatics?: {
      configured: boolean;
      status: PathmaticsDebugStatus;
      confidence: number | null;
      matchId: string | null;
      reasons: string[];
      metricLevel?: "AD" | "CREATIVE" | "CAMPAIGN" | "ADVERTISER" | "CHANNEL" | "DATE_AGGREGATE" | "UNKNOWN";
    };
    resolution?: {
      spendReason: string | null;
      impressionsReason: string | null;
      audienceReason: string | null;
    };
    model?: {
      attempted?: boolean;
      status:
        | "MODEL_NOT_AVAILABLE"
        | "GROUND_TRUTH_DATA_REQUIRED"
        | "PREDICTION_AVAILABLE"
        | "MODEL_RUNTIME_ERROR"
        | "FEATURES_INSUFFICIENT";
      modelVersion: string | null;
      datasetVersion: string | null;
      confidence: InHouseModelConfidence | null;
      distributionStatus: InHouseDistributionStatus | null;
      featureCoverage: number | null;
      reason: string | null;
      predictedFrequency: number | null;
      low: number | null;
      estimate: number | null;
      high: number | null;
      trainingRows: number | null;
      stage: "EXPERIMENTAL" | "PRODUCTION" | null;
    };
    trainingData?: {
      exactMatch: boolean;
      source: "PUBLIC_META_DISCLOSED" | null;
      adLibraryId: string | null;
      reach: number | null;
      reachLow: number | null;
      reachHigh: number | null;
      impressions: number | null;
      impressionsLow: number | null;
      impressionsHigh: number | null;
      labelStrength: string | null;
      recordId: string | null;
    };
    impressionsAssessment?: ImpressionsAssessment;
  };
  intelligenceMatch: {
    provider: "PATHMATICS" | null;
    confidence: number | null;
    matchId: string | null;
    status: PathmaticsDebugStatus;
    reasons: string[];
  };
};

type MetaAdsJobStatus =
  | "QUEUED"
  | "FETCHING_META"
  | "META_COMPLETE"
  | "ENRICHING_META_DETAILS"
  | "MODELING_IMPRESSIONS"
  | "MATCHING_PATHMATICS"
  | "COMPLETE"
  | "FAILED";

type MetaAdsJobResponse = {
  success: boolean;
  jobId: string;
  status: MetaAdsJobStatus;
  progressMessage: string;
  found: number;
  processed: number;
  actorRunId: string | null;
  datasetId: string | null;
  url: string;
  maxAds: number;
  ads: MetaLibraryAd[];
  rawItems: unknown[];
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

type PersistedMetaLibraryState = {
  url: string;
  maxAds: string;
  lastJob: MetaAdsJobResponse | null;
};

const META_LIBRARY_STORAGE_KEY = "fizzion.meta-library.url-state.v3";
const DEFAULT_URL =
  "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=nike&search_type=keyword_unordered";
const DEFAULT_MAX_ADS = "100";
const IS_DEV = process.env.NODE_ENV !== "production";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(`The server returned an empty ${response.status} response.`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const snippet = text.slice(0, 200).replace(/\s+/g, " ").trim();
    throw new Error(
      response.ok
        ? `The server returned an invalid JSON response. ${snippet || "No response body was available."}`
        : `The server returned an invalid error response (${response.status}). ${snippet || "No response body was available."}`,
    );
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatPlatform(platform: string) {
  return platform.replace(/_/g, " ");
}

function primaryMedia(ad: MetaLibraryAd) {
  return ad.creative.videoUrls[0] ?? ad.creative.imageUrls[0] ?? ad.creative.cards[0]?.imageUrl ?? null;
}

function formatMetricValue(metric: MetaMetric | MetaSpendMetric, label?: string) {
  if (metric.status === "CHECKING") {
    return label === "Impressions" ? "Calculating estimate..." : "Checking data...";
  }
  if (metric.status === "NOT_AVAILABLE" || metric.status === "META_NOT_DISCLOSED") {
    return "Not available";
  }
  return metric.raw ?? "Not available";
}

function metricBadge(metric: MetaMetric | MetaSpendMetric) {
  if (metric.status === "CHECKING") {
    return "CHECKING DATA";
  }
  if (metric.status === "META_DISCLOSED") {
    return "META DISCLOSED";
  }
  if (metric.status === "ESTIMATED" || metric.source === "PATHMATICS") {
    return "ESTIMATED · PATHMATICS";
  }
  return "NOT AVAILABLE";
}

function metricBadgeClass(metric: MetaMetric | MetaSpendMetric) {
  if (metric.status === "META_DISCLOSED") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (metric.status === "ESTIMATED" || metric.source === "PATHMATICS") {
    return "bg-amber-100 text-amber-700";
  }
  if (metric.status === "CHECKING") {
    return "bg-sky-100 text-sky-700";
  }
  return "bg-slate-200 text-slate-700";
}

/**
 * Accepts either a bare Meta ad ID (the long numeric string Meta uses,
 * e.g. from the ad's "..." menu → Ad details) or a full Ad Library URL,
 * and normalizes it into the single-ad Ad Library URL
 * (facebook.com/ads/library/?id=<id>) that the scrape pipeline expects.
 */
function normalizeAdIdOrUrl(input: string): { ok: true; url: string } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Paste a Meta ad ID or Ad Library URL." };
  }

  if (/^\d{6,}$/.test(trimmed)) {
    return { ok: true, url: `https://www.facebook.com/ads/library/?id=${trimmed}` };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "Enter a valid Meta Ad Library URL, or the numeric ad ID on its own." };
  }

  if (!["facebook.com", "www.facebook.com"].includes(parsed.hostname.toLowerCase())) {
    return { ok: false, error: "The URL must be a facebook.com Ad Library link." };
  }
  if (!parsed.pathname.toLowerCase().includes("/ads/library")) {
    return { ok: false, error: "The URL must point to Meta Ad Library (/ads/library), not a regular Facebook page or post." };
  }

  return { ok: true, url: parsed.toString() };
}

function jobSummary(job: MetaAdsJobResponse | null) {
  if (!job) {
    return null;
  }
  if (job.status === "FAILED") {
    return job.error ?? "The scrape failed.";
  }
  switch (job.status) {
    case "QUEUED":
      return "Queued...";
    case "FETCHING_META":
      return `${job.progressMessage} ${job.found > 0 ? `${job.found} ads found.` : ""}`.trim();
    case "META_COMPLETE":
      return `${job.progressMessage} Starting detail enrichment...`;
    case "ENRICHING_META_DETAILS":
      return `${job.progressMessage}`;
    case "MODELING_IMPRESSIONS":
      return `${job.progressMessage}`;
    case "MATCHING_PATHMATICS":
      return `${job.progressMessage}`;
    case "COMPLETE":
      return `Complete. ${job.ads.length} ads loaded.`;
    default:
      return job.progressMessage;
  }
}

function MetricCard({ label, metric }: { label: string; metric: MetaMetric | MetaSpendMetric }) {
  return (
    <div className="rounded-[1.2rem] border border-[#f0d6cb] bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9f8b80]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{formatMetricValue(metric)}</p>
      <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${metricBadgeClass(metric)}`}>
        {metricBadge(metric)}
      </span>
    </div>
  );
}

function StaticCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-[#f0d6cb] bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9f8b80]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function compactDisplayNumber(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `${Math.round(value)}`;
}

function formatDisplayRange(low: number | null | undefined, high: number | null | undefined) {
  if (low == null && high == null) {
    return null;
  }
  if (low != null && high != null) {
    return `${compactDisplayNumber(low)} – ${compactDisplayNumber(high)}`;
  }
  return compactDisplayNumber(low ?? high ?? 0);
}

function ImpressionMetricCard({ metric }: { metric: MetaMetric }) {
  const value =
    metric.status === "CHECKING"
      ? "Calculating estimate..."
      : metric.status === "NOT_AVAILABLE" || metric.status === "META_NOT_DISCLOSED"
        ? "Not available"
        : metric.raw ?? "Not available";

  const label =
    metric.source === "PUBLIC_META_TRAINING_DATA"
      ? "PUBLIC META RANGE"
      : metric.source === "IN_HOUSE_MODEL"
        ? "ESTIMATED"
        : metric.status === "META_DISCLOSED"
          ? "META DISCLOSED"
          : metric.status === "ESTIMATED" || metric.source === "PATHMATICS"
            ? "ESTIMATED · PATHMATICS"
            : metric.status === "CHECKING"
              ? "CHECKING DATA"
              : "NOT AVAILABLE";

  const badgeClass =
    metric.status === "META_DISCLOSED"
      ? "bg-emerald-100 text-emerald-700"
      : metric.source === "PUBLIC_META_TRAINING_DATA"
        ? "bg-orange-100 text-orange-700"
        : metric.source === "IN_HOUSE_MODEL"
          ? "bg-violet-100 text-violet-700"
          : metric.status === "ESTIMATED" || metric.source === "PATHMATICS"
            ? "bg-amber-100 text-amber-700"
            : metric.status === "CHECKING"
              ? "bg-sky-100 text-sky-700"
              : "bg-slate-200 text-slate-700";

  const likelyRange = metric.source === "IN_HOUSE_MODEL" ? formatDisplayRange(metric.low, metric.high) : null;

  return (
    <div className="rounded-[1.2rem] border border-[#f0d6cb] bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9f8b80]">Impressions</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
      <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${badgeClass}`}>
        {label}
      </span>
      {metric.source === "PUBLIC_META_TRAINING_DATA" ? (
        <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">WEAK RANGE</div>
      ) : null}
      {metric.source === "IN_HOUSE_MODEL" ? (
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          {likelyRange ? <p>Likely range: {likelyRange}</p> : null}
          <p>EXPERIMENTAL MODEL</p>
          <p>
            Confidence: {metric.confidenceLabel ?? "LOW"}
            {metric.trainingRows ? ` · Training rows: ${metric.trainingRows}` : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function confidenceBadgeClass(confidence: string) {
  if (confidence === "VERY_HIGH" || confidence === "HIGH") return "bg-emerald-100 text-emerald-700";
  if (confidence === "MEDIUM") return "bg-amber-100 text-amber-700";
  if (confidence === "INSUFFICIENT_DATA") return "bg-slate-200 text-slate-700";
  return "bg-orange-100 text-orange-700";
}

function ImpressionsBreakdown({ assessment }: { assessment: ImpressionsAssessment }) {
  const orderedKeys = ["META_LOWER_BOUND", "SPEND_CPM", "REACH_FREQUENCY", "ENGAGEMENT", "VIDEO_VIEWS"] as const;

  return (
    <div className="mt-3 space-y-4 text-sm">
      <div className="grid gap-2 sm:grid-cols-4">
        <StaticCard label="Country" value={assessment.country ?? "Not determined"} />
        <StaticCard label="Status" value={assessment.status} />
        <StaticCard label="Start date" value={formatDate(assessment.startDate)} />
        <StaticCard label="Days running" value={assessment.daysRunning != null ? String(assessment.daysRunning) : "Not available"} />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9f8b80]">Observed data</p>
        {assessment.observedData.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-foreground">
            {assessment.observedData.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">No public delivery data was observed for this ad.</p>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9f8b80]">Assumptions</p>
        {assessment.assumptions.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {assessment.assumptions.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">No benchmark assumptions were required.</p>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9f8b80]">Calculations</p>
        <div className="mt-2 space-y-2">
          {orderedKeys.map((key) => {
            const model = assessment.subModels.find((item) => item.key === key);
            if (!model) return null;
            return (
              <div className="rounded-[1rem] border border-[#f0d6cb] bg-white px-3 py-2" key={key}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">{model.label}</span>
                  {model.available ? (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      weight {(model.effectiveWeight * 100).toFixed(0)}%
                    </span>
                  ) : null}
                </div>
                {model.available ? (
                  <>
                    <p className="mt-1 text-[11px] text-muted-foreground">Formula: {model.formula}</p>
                    <p className="mt-1 text-xs text-foreground">{model.calculation}</p>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">Insufficient data{model.reason ? ` — ${model.reason}` : "."}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[1rem] border border-[#f0d6cb] bg-[#fff8f5] px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9f8b80]">Final result</span>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${confidenceBadgeClass(assessment.final.confidence)}`}>
            {assessment.final.confidence.replace(/_/g, " ")}
          </span>
        </div>
        {assessment.final.low != null && assessment.final.high != null && assessment.final.best != null ? (
          <>
            <p className="mt-2 text-sm font-semibold text-foreground">
              Range: {formatDisplayRange(assessment.final.low, assessment.final.high)} · Best estimate: {compactDisplayNumber(assessment.final.best)}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm font-semibold text-foreground">Insufficient data to construct a meaningful estimate.</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{assessment.final.narrative}</p>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#b45309]">
          {assessment.final.classification === "META_REPORTED_EXACT"
            ? "Meta-reported exact data"
            : assessment.final.classification === "META_RANGE_DERIVED"
              ? "Meta-range-derived estimate — not exact"
              : assessment.final.classification === "MODEL_BASED_ESTIMATE"
                ? "Model-based estimate — not exact"
                : "Insufficient public data"}
        </p>
      </div>
    </div>
  );
}

export function MetaLibraryClient() {
  const [mode, setMode] = useState<"search" | "lookup">("search");
  const [metaUrl, setMetaUrl] = useState(DEFAULT_URL);
  const [maxAds, setMaxAds] = useState(DEFAULT_MAX_ADS);
  const [adIdOrUrl, setAdIdOrUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [job, setJob] = useState<MetaAdsJobResponse | null>(null);
  const [restored, setRestored] = useState(false);
  const [expandedAdId, setExpandedAdId] = useState<string | null>(null);
  const [breakdownAdId, setBreakdownAdId] = useState<string | null>(null);

  useEffect(() => {
    // Restoring saved state from localStorage only after mount (client
    // only, avoids an SSR/hydration mismatch) — the setState calls here
    // are the restore itself, not a derived-state side effect.
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const raw = window.localStorage.getItem(META_LIBRARY_STORAGE_KEY);
      if (!raw) {
        setRestored(true);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<PersistedMetaLibraryState>;
      if (typeof parsed.url === "string") setMetaUrl(parsed.url);
      if (typeof parsed.maxAds === "string") setMaxAds(parsed.maxAds);
      if (parsed.lastJob && typeof parsed.lastJob === "object") setJob(parsed.lastJob as MetaAdsJobResponse);
    } catch {
      window.localStorage.removeItem(META_LIBRARY_STORAGE_KEY);
    } finally {
      setRestored(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!restored) return;
    window.localStorage.setItem(
      META_LIBRARY_STORAGE_KEY,
      JSON.stringify({
        url: metaUrl,
        maxAds,
        lastJob: job,
      } satisfies PersistedMetaLibraryState),
    );
  }, [restored, metaUrl, maxAds, job]);

  const ads = useMemo(() => job?.ads ?? [], [job]);

  async function pollJob(jobId: string) {
    let consecutiveFailures = 0;

    while (true) {
      try {
        const response = await fetch(`/api/meta-ads/jobs/${jobId}`, { cache: "no-store" });
        const data = await readJsonResponse<
          MetaAdsJobResponse & {
            error?:
              | string
              | {
                  code?: string;
                  message?: string;
                  stage?: string | null;
                };
          }
        >(response);

        if (!response.ok) {
          const responseError = data.error as
            | string
            | {
                code?: string;
                message?: string;
                stage?: string | null;
              }
            | undefined;
          const message =
            typeof responseError === "string"
              ? responseError
              : responseError?.message ?? `The Meta Ad Library job returned ${response.status}.`;
          throw new Error(message);
        }

        consecutiveFailures = 0;
        setJob(data);

        if (data.status === "COMPLETE") {
          return;
        }
        if (data.status === "FAILED") {
          throw new Error(data.error && typeof data.error === "string" ? data.error : "The Meta Ad Library scrape failed.");
        }

        await sleep(2000);
      } catch (error) {
        consecutiveFailures += 1;

        if (consecutiveFailures >= 5) {
          throw error;
        }

        await sleep(Math.min(2000 * 2 ** (consecutiveFailures - 1), 10000));
      }
    }
  }

  async function submitJob(url: string, maxAdsValue: number) {
    setLoading(true);
    setErrorMessage(null);
    setExpandedAdId(null);
    setBreakdownAdId(null);
    try {
      const response = await fetch("/api/meta-ads/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, maxAds: maxAdsValue }),
      });
      const data = await readJsonResponse<{ success: boolean; jobId?: string; error?: string }>(response);
      if (!response.ok || !data.success || !data.jobId) {
        throw new Error(data.error ?? "The Meta Ad Library scrape could not be started.");
      }
      setJob({
        success: true,
        jobId: data.jobId,
        status: "QUEUED",
        progressMessage: "Queued",
        found: 0,
        processed: 0,
        actorRunId: null,
        datasetId: null,
        url,
        maxAds: maxAdsValue,
        ads: [],
        rawItems: [],
        error: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await pollJob(data.jobId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The Meta Ad Library scrape failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFetchAds() {
    await submitJob(metaUrl, Number(maxAds));
  }

  async function handleLookupAd() {
    const normalized = normalizeAdIdOrUrl(adIdOrUrl);
    if (!normalized.ok) {
      setErrorMessage(normalized.error);
      return;
    }
    // A direct id= lookup should return just that one ad — keep it
    // small and fast rather than reusing the bulk "max ads" setting.
    await submitJob(normalized.url, 1);
  }

  const summary = jobSummary(job);

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-red">Meta Ad Library research</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Meta Library</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">
              Search the public Meta Ad Library, or look up one specific ad by its ID or link. Meta doesn&apos;t disclose exact impressions for ordinary ads it doesn&apos;t belong to you — the app checks Meta first, then estimates from public training data, an in-house model, or Pathmatics if configured, and always labels which one produced the number.
            </p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
            Live Apify + Meta data
          </span>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="grid gap-4">
          <div className="inline-flex w-fit rounded-full border border-border bg-[var(--color-surface)] p-1">
            <button
              type="button"
              onClick={() => setMode("search")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === "search" ? "bg-brand-red text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Search ads
            </button>
            <button
              type="button"
              onClick={() => setMode("lookup")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === "lookup" ? "bg-brand-red text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Look up one ad
            </button>
          </div>

          {mode === "search" ? (
            <>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-foreground">Paste Meta Ad Library URL</span>
                <textarea
                  value={metaUrl}
                  onChange={(event) => setMetaUrl(event.target.value)}
                  className="min-h-[120px] w-full rounded-[1.25rem] border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  placeholder="https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=nike&search_type=keyword_unordered"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-[180px_1fr] md:items-end">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-foreground">Max ads</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={maxAds}
                    onChange={(event) => setMaxAds(event.target.value)}
                    className="h-12 w-full rounded-[1.25rem] border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  />
                </label>
                <div className="flex flex-col gap-3 md:items-start">
                  <button
                    type="button"
                    onClick={handleFetchAds}
                    disabled={loading}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-brand-red px-6 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? "Fetching ads..." : "Fetch Ads"}
                  </button>
                  <p className="text-xs leading-6 text-muted-foreground">
                    Backend stages: Fetch Meta ads, check Meta detail pages, then optional Pathmatics fallback if an authorized provider is configured.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-foreground">Ad ID or Ad Library link</span>
                <input
                  type="text"
                  value={adIdOrUrl}
                  onChange={(event) => setAdIdOrUrl(event.target.value)}
                  className="h-12 w-full rounded-[1.25rem] border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  placeholder="1249043200627555 or https://www.facebook.com/ads/library/?id=1249043200627555"
                />
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleLookupAd}
                  disabled={loading}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-brand-red px-6 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Looking up ad..." : "Look up ad"}
                </button>
                <p className="max-w-2xl text-xs leading-6 text-muted-foreground">
                  Find the ad ID from the ad&apos;s &quot;...&quot; menu → &quot;Ad details&quot; in the Meta Ad Library, or paste the full link. If this isn&apos;t your own ad, Meta doesn&apos;t disclose exact impressions — you&apos;ll get the same clearly-labeled estimate the search flow produces, just without searching first.
                </p>
              </div>
            </>
          )}

          {summary ? (
            <div className="rounded-[1.25rem] border border-border bg-[var(--color-surface)] px-4 py-3 text-sm text-foreground">
              {summary}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          {job?.actorRunId ? (
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>Status: {job.status}</span>
              <span>Run ID: {job.actorRunId}</span>
              <span>Dataset: {job.datasetId ?? "Pending"}</span>
              <span>Found: {job.found}</span>
              <span>Processed: {job.processed}</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Fetched ads</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cards populate as the pipeline advances. Meta data is prioritized, and third-party estimates are only shown when clearly labeled.
            </p>
          </div>
          <span className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-foreground">
            {ads.length} ads
          </span>
        </div>

        {job?.status === "COMPLETE" && ads.length === 0 ? (
          <div className="rounded-[1.8rem] border border-border bg-white p-8 text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
            No ads were returned for this Meta Ad Library URL.
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-2">
          {ads.map((ad) => {
            const media = primaryMedia(ad);
            const isExpanded = expandedAdId === ad.adLibraryId;
            const isBreakdownOpen = breakdownAdId === ad.adLibraryId;
            const assessment = ad.debug.impressionsAssessment;
            return (
              <article key={ad.adLibraryId} className="overflow-hidden rounded-[2rem] border border-[#f0d6cb] bg-[#fff8f5] shadow-[0_12px_32px_rgba(112,74,43,0.08)]">
                <div className="flex items-start gap-4 border-b border-[#f0d6cb] bg-white/80 px-5 py-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#e9c7b8] bg-white text-sm font-semibold text-[#8f6b59]">
                    {(ad.pageName ?? "P").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-semibold text-foreground">{ad.pageName ?? "Unknown page"}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ad.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                        {ad.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Ad Library ID: {ad.adLibraryId}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ad.platforms.map((platform) => (
                        <span key={`${ad.adLibraryId}-${platform}`} className="rounded-full border border-[#ecd6cb] bg-[#fff4ee] px-2.5 py-1 text-[11px] font-medium text-[#8a5b46]">
                          {formatPlatform(platform)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-3">
                      <p className="text-sm italic text-[#8f7c72]">{ad.copy ?? ad.description ?? "No creative copy was returned for this ad."}</p>
                      {ad.title ? <p className="text-sm font-semibold text-foreground">{ad.title}</p> : null}
                      {ad.cta ? <div className="inline-flex rounded-full border border-[#ecd6cb] bg-white px-3 py-1 text-xs font-semibold text-[#8a5b46]">CTA: {ad.cta}</div> : null}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <MetricCard label="Spend" metric={ad.finalMetrics.spend} />
                        <ImpressionMetricCard metric={ad.finalMetrics.impressions} />
                        <MetricCard label="Audience size" metric={ad.finalMetrics.audienceSize} />
                        <StaticCard label="Ad type" value={ad.creative.type.toUpperCase()} />
                        <StaticCard label="Started" value={formatDate(ad.startDate)} />
                        <StaticCard label="Ended" value={formatDate(ad.endDate)} />
                      </div>
                    </div>

                    <div className="rounded-[1.4rem] border border-[#edd7cc] bg-white p-3">
                      {media ? (
                        ad.creative.type === "video" ? (
                          <video src={media} controls className="h-56 w-full rounded-[1rem] object-cover" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={media} alt={ad.pageName ?? "Meta ad creative"} className="h-56 w-full rounded-[1rem] object-cover" />
                        )
                      ) : (
                        <div className="flex h-56 items-center justify-center rounded-[1rem] bg-[#fff7f2] text-sm text-muted-foreground">
                          No public creative media returned
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>Similar ads: {ad.similarAds ?? "Not available"}</span>
                    <span>Variation group: {ad.variationGroupId ?? "None"}</span>
                    <span>Landing domain: {ad.landingDomain ?? "Not available"}</span>
                    <a href={ad.adLibraryUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-red hover:underline">
                      Open in Meta Ad Library
                    </a>
                  </div>

                  {assessment ? (
                    <div className="rounded-[1.25rem] border border-[#e5cabd] bg-white/70 p-3">
                      <button
                        type="button"
                        onClick={() => setBreakdownAdId(isBreakdownOpen ? null : ad.adLibraryId)}
                        className="text-sm font-semibold text-[#8a5b46]"
                      >
                        {isBreakdownOpen ? "Hide full calculation breakdown" : "View full calculation breakdown"}
                      </button>
                      {isBreakdownOpen ? <ImpressionsBreakdown assessment={assessment} /> : null}
                    </div>
                  ) : null}

                  {IS_DEV ? (
                    <div className="rounded-[1.25rem] border border-dashed border-[#e5cabd] bg-white/70 p-3">
                      <button type="button" onClick={() => setExpandedAdId(isExpanded ? null : ad.adLibraryId)} className="text-sm font-semibold text-[#8a5b46]">
                        {isExpanded ? "Hide metric debug" : "Metric Debug"}
                      </button>
                      {isExpanded ? (
                        <div className="mt-3 space-y-3">
                          <pre className="max-h-[28rem] overflow-auto rounded-[1rem] bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                            {JSON.stringify(
                              {
                                adLibraryId: ad.adLibraryId,
                                meta: ad.metaMetrics,
                                metaDetail: ad.metaDetailMetrics,
                                pathmatics: ad.pathmaticsMetrics,
                                model: ad.modelMetrics,
                                trainingData: ad.debug.trainingData,
                                intelligenceMatch: ad.intelligenceMatch,
                                final: ad.finalMetrics,
                                metaDetailDebug: ad.debug.metaDetail,
                                pathmaticsDebug: ad.debug.pathmatics,
                                modelDebug: ad.debug.model,
                              },
                              null,
                              2,
                            )}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
