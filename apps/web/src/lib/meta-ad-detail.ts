import { runMetaBrowserDetailActor } from "@/lib/meta-browser-detail";
import type { MetaLibraryAd, MetaMetric, MetaSpendMetric, MetricCandidate } from "@/lib/meta-library";
import {
  createMetaNotDisclosedMetric,
  createMetaNotDisclosedSpendMetric,
  findMetricCandidates,
  parseMetaRange,
} from "@/lib/meta-library";

export type MetaDetailEnrichment = {
  checkedAt: string;
  pageUrl: string;
  transport: "apify-playwright" | "none";
  errorMessage: string | null;
  actorId: string | null;
  actorRunId: string | null;
  actorDatasetId: string | null;
  pageLoaded: boolean;
  mainResponseStatus: number | null;
  mainResponseUrl: string | null;
  visibleTextSnippet: string | null;
  structuredCandidates: MetricCandidate[];
  responses: Array<{ url: string; status: number; bodySnippet: string | null }>;
  metrics: {
    spend: MetaSpendMetric;
    impressions: MetaMetric;
    audienceSize: MetaMetric;
  };
};

function metricNow() {
  return new Date().toISOString();
}

function metricFromRaw(
  raw: string | number | null,
  source: MetaMetric["source"],
  path: string | null,
): MetaMetric | null {
  if (raw == null) {
    return null;
  }

  const parsed = parseMetaRange(raw);
  if (parsed.raw == null && parsed.min == null && parsed.max == null) {
    return null;
  }

  return {
    raw: parsed.raw,
    min: parsed.min,
    max: parsed.max,
    status: "META_DISCLOSED",
    source,
    path,
    dataType: "DISCLOSED",
    confidence: null,
    retrievedAt: metricNow(),
  };
}

function spendFromRaw(
  raw: string | number | null,
  currency: string | null,
  source: MetaSpendMetric["source"],
  path: string | null,
): MetaSpendMetric | null {
  const base = metricFromRaw(raw, source, path);
  if (!base) {
    return null;
  }

  return {
    ...base,
    currency,
  };
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLabeledMetric(text: string, labels: RegExp[]): string | null {
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!labels.some((label) => label.test(line))) {
      continue;
    }

    for (let lookahead = 1; lookahead <= 3; lookahead += 1) {
      const candidate = lines[index + lookahead];
      if (!candidate) {
        continue;
      }
      if (/\d/.test(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

function parseScriptJsonCandidates(scriptTexts: string[], html: string, responses: MetaDetailEnrichment["responses"]) {
  const candidates: MetricCandidate[] = [];

  for (const scriptText of scriptTexts) {
    try {
      const parsed = JSON.parse(scriptText);
      const found = findMetricCandidates(parsed);
      for (const candidate of found) {
        if (candidate.path.includes("page_spend")) {
          continue;
        }
        if (typeof candidate.value === "string" || typeof candidate.value === "number") {
          candidates.push(candidate);
        }
      }
    } catch {
      continue;
    }
  }

  for (const response of responses) {
    if (!response.bodySnippet) {
      continue;
    }

    try {
      const parsed = JSON.parse(response.bodySnippet);
      const found = findMetricCandidates(parsed);
      for (const candidate of found) {
        if (candidate.path.includes("page_spend")) {
          continue;
        }
        if (typeof candidate.value === "string" || typeof candidate.value === "number") {
          candidates.push({
            path: `network:${response.url}::${candidate.path}`,
            value: candidate.value,
          });
        }
      }
    } catch {
      continue;
    }
  }

  if (html.includes("eu_total_reach")) {
    const match = html.match(/eu_total_reach[^0-9]{0,30}(\d{1,12})/i);
    if (match) {
      candidates.push({ path: "html.eu_total_reach", value: Number(match[1]) });
    }
  }

  return candidates;
}

function candidateRawValue(value: MetricCandidate["value"]) {
  return typeof value === "number" || typeof value === "string" ? value : null;
}

function isExplicitMetricValue(raw: string | number | null) {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw >= 0;
  }

  if (typeof raw !== "string") {
    return false;
  }

  const normalized = raw.trim();
  if (!normalized) {
    return false;
  }

  if (!/\d/.test(normalized)) {
    return false;
  }

  if (/^[A-Z_]+$/.test(normalized)) {
    return false;
  }

  const parsed = parseMetaRange(normalized);
  return parsed.raw != null || parsed.min != null || parsed.max != null;
}

function pathLooksLikeAdMetric(path: string, metric: "spend" | "impressions" | "audienceSize") {
  const normalized = path.toLowerCase();

  if (/page_spend|weekly|lifetime|disclaimer|timeframe|window|period|index|rank|sort|filter/.test(normalized)) {
    return false;
  }

  if (metric === "spend") {
    return /amount_spent|amountspent|spend|currency/.test(normalized);
  }

  if (metric === "impressions") {
    return /impression/.test(normalized);
  }

  return /eu_total_reach|reachestimate|estimatedaudience|estimated_audience|audiencesize|audience_size|reach/.test(
    normalized,
  );
}

function metricFromCandidates(
  candidates: MetricCandidate[],
  metric: "spend" | "impressions" | "audienceSize",
): MetaMetric | MetaSpendMetric | null {
  const candidate = candidates.find((item) => {
    const raw = candidateRawValue(item.value);
    return pathLooksLikeAdMetric(item.path, metric) && isExplicitMetricValue(raw);
  });

  if (!candidate) {
    return null;
  }

  const raw = candidateRawValue(candidate.value);
  if (metric === "spend") {
    return spendFromRaw(raw, null, "META_AD_LIBRARY_DETAIL", candidate.path);
  }

  return metricFromRaw(raw, "META_AD_LIBRARY_DETAIL", candidate.path);
}

export async function enrichMetaAdFromPublicDetail(ad: MetaLibraryAd): Promise<MetaDetailEnrichment> {
  const actorResult = await runMetaBrowserDetailActor(ad);

  if (!actorResult.item) {
    return {
      checkedAt: metricNow(),
      pageUrl: ad.adLibraryUrl,
      transport: "none",
      errorMessage: actorResult.errorMessage,
      actorId: actorResult.actorId,
      actorRunId: actorResult.runId,
      actorDatasetId: actorResult.datasetId,
      pageLoaded: false,
      mainResponseStatus: null,
      mainResponseUrl: null,
      visibleTextSnippet: null,
      structuredCandidates: [],
      responses: [],
      metrics: {
        spend: createMetaNotDisclosedSpendMetric("META_AD_LIBRARY_DETAIL"),
        impressions: createMetaNotDisclosedMetric("META_AD_LIBRARY_DETAIL"),
        audienceSize: createMetaNotDisclosedMetric("META_AD_LIBRARY_DETAIL"),
      },
    };
  }

  const item = actorResult.item;
  const pageText = [item.bodyTextSnippet ?? "", stripHtml(item.htmlSnippet ?? "")].filter(Boolean).join("\n");
  const responses = (item.responses ?? []).map((response) => ({
    url: response.url,
    status: response.status,
    bodySnippet: response.bodySnippet,
  }));
  const structuredCandidates = parseScriptJsonCandidates(item.scriptTexts ?? [], item.htmlSnippet ?? "", responses);

  const textSpend = extractLabeledMetric(pageText, [/^amount spent$/i, /^spend$/i]);
  const textImpressions = extractLabeledMetric(pageText, [/^impressions$/i]);
  const textAudience = extractLabeledMetric(pageText, [/^estimated audience size$/i, /^audience size$/i, /^reach$/i]);

  const spend =
    (metricFromCandidates(structuredCandidates, "spend") as MetaSpendMetric | null) ??
    spendFromRaw(textSpend, ad.currency, "META_PUBLIC_DETAIL_TEXT", "detail.visible_text.spend") ??
    createMetaNotDisclosedSpendMetric("META_AD_LIBRARY_DETAIL");

  const impressions =
    (metricFromCandidates(structuredCandidates, "impressions") as MetaMetric | null) ??
    metricFromRaw(textImpressions, "META_PUBLIC_DETAIL_TEXT", "detail.visible_text.impressions") ??
    createMetaNotDisclosedMetric("META_AD_LIBRARY_DETAIL");

  const audienceSize =
    (metricFromCandidates(structuredCandidates, "audienceSize") as MetaMetric | null) ??
    metricFromRaw(textAudience, "META_PUBLIC_DETAIL_TEXT", "detail.visible_text.audience") ??
    createMetaNotDisclosedMetric("META_AD_LIBRARY_DETAIL");

  return {
    checkedAt: metricNow(),
    pageUrl: item.finalUrl || ad.adLibraryUrl,
    transport: "apify-playwright",
    errorMessage: actorResult.errorMessage,
    actorId: actorResult.actorId,
    actorRunId: actorResult.runId,
    actorDatasetId: actorResult.datasetId,
    pageLoaded: item.pageLoaded,
    mainResponseStatus: item.mainResponseStatus,
    mainResponseUrl: item.mainResponseUrl,
    visibleTextSnippet: pageText.slice(0, 2000) || null,
    structuredCandidates,
    responses,
    metrics: {
      spend,
      impressions,
      audienceSize,
    },
  };
}
