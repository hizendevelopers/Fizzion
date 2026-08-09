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
  transport: "playwright" | "fetch" | "none";
  errorMessage: string | null;
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

function parseScriptJsonCandidates(scriptTexts: string[], html: string) {
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

  if (html.includes("eu_total_reach")) {
    const match = html.match(/eu_total_reach[^0-9]{0,30}(\d{1,12})/i);
    if (match) {
      candidates.push({ path: "html.eu_total_reach", value: Number(match[1]) });
    }
  }

  return candidates;
}

function extractScriptJsonTexts(html: string) {
  const scripts: string[] = [];
  const matches = html.matchAll(/<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of matches) {
    const content = match[1]?.trim();
    if (content) {
      scripts.push(content);
    }
  }
  return scripts;
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
    return /amount_spent|spend/.test(normalized);
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
    return spendFromRaw(
      raw,
      null,
      "META_AD_LIBRARY_DETAIL",
      candidate.path,
    );
  }

  return metricFromRaw(
    raw,
    "META_AD_LIBRARY_DETAIL",
    candidate.path,
  );
}

function buildEnrichment(
  ad: MetaLibraryAd,
  transport: MetaDetailEnrichment["transport"],
  payload: {
    pageText: string;
    html: string;
    scriptTexts: string[];
    responses: MetaDetailEnrichment["responses"];
    errorMessage?: string | null;
  },
): MetaDetailEnrichment {
  const structuredCandidates = parseScriptJsonCandidates(payload.scriptTexts, payload.html);
  const textSpend = extractLabeledMetric(payload.pageText, [/^amount spent$/i, /^spend$/i]);
  const textImpressions = extractLabeledMetric(payload.pageText, [/^impressions$/i]);
  const textAudience = extractLabeledMetric(payload.pageText, [/^estimated audience size$/i, /^audience size$/i, /^reach$/i]);

  const spend =
    spendFromRaw(textSpend, ad.currency, "META_PUBLIC_DETAIL_TEXT", "detail.visible_text.spend") ??
    (metricFromCandidates(structuredCandidates, "spend") as MetaSpendMetric | null) ??
    createMetaNotDisclosedSpendMetric("META_AD_LIBRARY_DETAIL");

  const impressions =
    metricFromRaw(textImpressions, "META_PUBLIC_DETAIL_TEXT", "detail.visible_text.impressions") ??
    (metricFromCandidates(structuredCandidates, "impressions") as MetaMetric | null) ??
    createMetaNotDisclosedMetric("META_AD_LIBRARY_DETAIL");

  const audienceSize =
    metricFromRaw(textAudience, "META_PUBLIC_DETAIL_TEXT", "detail.visible_text.audience") ??
    (metricFromCandidates(structuredCandidates, "audienceSize") as MetaMetric | null) ??
    createMetaNotDisclosedMetric("META_AD_LIBRARY_DETAIL");

  return {
    checkedAt: metricNow(),
    pageUrl: ad.adLibraryUrl,
    transport,
    errorMessage: payload.errorMessage ?? null,
    visibleTextSnippet: payload.pageText.slice(0, 2000) || null,
    structuredCandidates,
    responses: payload.responses.slice(0, 20),
    metrics: {
      spend,
      impressions,
      audienceSize,
    },
  };
}

async function enrichViaFetch(ad: MetaLibraryAd, errorMessage: string | null = null): Promise<MetaDetailEnrichment> {
  const response = await fetch(ad.adLibraryUrl, {
    method: "GET",
    cache: "no-store",
    headers: {
      "accept-language": "en-US,en;q=0.9",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    },
  });

  const html = await response.text();
  const pageText = [stripHtml(html)].filter(Boolean).join("\n");
  const scriptTexts = extractScriptJsonTexts(html);

  return buildEnrichment(ad, "fetch", {
    pageText,
    html,
    scriptTexts,
    responses: [
      {
        url: response.url,
        status: response.status,
        bodySnippet: html.slice(0, 4000) || null,
      },
    ],
    errorMessage,
  });
}

async function enrichViaPlaywright(ad: MetaLibraryAd): Promise<MetaDetailEnrichment> {
  const playwright = await import("playwright");
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage({
    locale: "en-US",
    timezoneId: "Asia/Karachi",
  });

  const responses: MetaDetailEnrichment["responses"] = [];

  page.on("response", async (response) => {
    const request = response.request();
    const resourceType = request.resourceType();
    if (resourceType !== "xhr" && resourceType !== "fetch") {
      return;
    }

    let bodySnippet: string | null = null;
    try {
      bodySnippet = (await response.text()).slice(0, 4000);
    } catch {
      bodySnippet = null;
    }

    responses.push({
      url: response.url(),
      status: response.status(),
      bodySnippet,
    });
  });

  try {
    await page.goto(ad.adLibraryUrl, { waitUntil: "networkidle", timeout: 60000 }).catch(async () => {
      await page.waitForTimeout(10000);
    });
    await page.waitForTimeout(2500);

    const visibleText = await page.locator("body").innerText().catch(() => "");
    const html = await page.content();
    const pageText = [visibleText, stripHtml(html)].filter(Boolean).join("\n");
    const scriptTexts = await page
      .locator('script[type="application/json"]')
      .evaluateAll((nodes) => nodes.map((node) => node.textContent || ""))
      .catch(() => []);

    return buildEnrichment(ad, "playwright", {
      pageText,
      html,
      scriptTexts,
      responses,
    });
  } finally {
    await browser.close().catch(() => null);
  }
}

function isPlaywrightLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /playwright|playwright-core|browsers\.json/i.test(message);
}

export async function enrichMetaAdFromPublicDetail(ad: MetaLibraryAd): Promise<MetaDetailEnrichment> {
  try {
    return await enrichViaPlaywright(ad);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta detail browser enrichment failed.";
    if (!isPlaywrightLoadError(error)) {
      try {
        return await enrichViaFetch(ad, message);
      } catch {
        return {
          checkedAt: metricNow(),
          pageUrl: ad.adLibraryUrl,
          transport: "none",
          errorMessage: message,
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
    }

    return await enrichViaFetch(ad, message).catch(() => ({
      checkedAt: metricNow(),
      pageUrl: ad.adLibraryUrl,
      transport: "none",
      errorMessage: message,
      visibleTextSnippet: null,
      structuredCandidates: [],
      responses: [],
      metrics: {
        spend: createMetaNotDisclosedSpendMetric("META_AD_LIBRARY_DETAIL"),
        impressions: createMetaNotDisclosedMetric("META_AD_LIBRARY_DETAIL"),
        audienceSize: createMetaNotDisclosedMetric("META_AD_LIBRARY_DETAIL"),
      },
    }));
  }
}
