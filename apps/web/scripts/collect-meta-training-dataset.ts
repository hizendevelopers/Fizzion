import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getApifyClient } from "@/lib/apify/client";
import {
  buildMetaAdsActorInput,
  normalizeMetaLibraryAds,
  type MetaLibraryAd,
} from "@/lib/meta-library";

type SearchSpec = {
  country: string;
  keyword: string;
};

type TrainingRow = {
  recordId: string;
  source: "PUBLIC_META_AD_LIBRARY";
  labelQuality: "PUBLIC_META_DISCLOSED";
  labelStrength: "STRONG" | "WEAK_RANGE";
  sourceRecordId: string;
  adLibraryId: string | null;
  metaAdId: string | null;
  advertiserId: string | null;
  advertiserName: string | null;
  campaignId: string | null;
  adsetId: string | null;
  platforms: string[];
  platformPositions: string[];
  country: string | null;
  geoScope: string | null;
  measurementScope: string | null;
  measurementStart: string;
  measurementEnd: string;
  startDate: string | null;
  endDate: string | null;
  activeDays: number | null;
  creativeType: string | null;
  ctaType: string | null;
  landingDomain: string | null;
  landingUrl: string | null;
  adText: string | null;
  headline: string | null;
  description: string | null;
  reachLow: number | null;
  reachHigh: number | null;
  reach: number | null;
  impressionsLow: number | null;
  impressionsHigh: number | null;
  impressions: number | null;
  frequency: number | null;
  weakFrequencyLow: number | null;
  weakFrequencyHigh: number | null;
  spend: number | null;
  spendLow: number | null;
  spendHigh: number | null;
  spendCurrency: string | null;
  isLabelAligned: boolean;
  alignmentNotes: string[];
  qualityFlags: Record<string, unknown>;
  retrievedAt: string;
};

const RAW_AD_TARGET = 2_000;
const PER_QUERY_RESULTS_LIMIT = 250;
const MIN_VALID_ROWS_TARGET = 1_000;
const SEARCH_SPECS: SearchSpec[] = [
  { country: "DE", keyword: "klima" },
  { country: "DE", keyword: "wahl" },
  { country: "DE", keyword: "energie" },
  { country: "DE", keyword: "partei" },
  { country: "FR", keyword: "climat" },
  { country: "FR", keyword: "election" },
  { country: "FR", keyword: "energie" },
  { country: "FR", keyword: "parti" },
  { country: "IT", keyword: "clima" },
  { country: "IT", keyword: "elezioni" },
  { country: "IT", keyword: "energia" },
  { country: "IT", keyword: "partito" },
  { country: "ES", keyword: "clima" },
  { country: "ES", keyword: "elecciones" },
  { country: "ES", keyword: "energia" },
  { country: "ES", keyword: "partido" },
  { country: "PL", keyword: "klimat" },
  { country: "PL", keyword: "wybory" },
  { country: "PL", keyword: "energia" },
  { country: "PL", keyword: "partia" },
  { country: "SE", keyword: "klimat" },
  { country: "SE", keyword: "val" },
  { country: "SE", keyword: "energi" },
  { country: "SE", keyword: "parti" },
  { country: "NL", keyword: "klimaat" },
  { country: "NL", keyword: "verkiezingen" },
  { country: "NL", keyword: "energie" },
  { country: "NL", keyword: "partij" },
  { country: "BE", keyword: "climat" },
  { country: "BE", keyword: "election" },
  { country: "BE", keyword: "energie" },
  { country: "AT", keyword: "klima" },
  { country: "AT", keyword: "wahl" },
  { country: "AT", keyword: "energie" },
  { country: "AT", keyword: "partei" },
  { country: "IE", keyword: "climate" },
  { country: "IE", keyword: "election" },
  { country: "IE", keyword: "energy" },
  { country: "IE", keyword: "party" },
  { country: "DK", keyword: "klima" },
  { country: "DK", keyword: "valg" },
  { country: "DK", keyword: "energi" },
  { country: "FI", keyword: "ilmasto" },
  { country: "FI", keyword: "vaalit" },
  { country: "FI", keyword: "energia" },
  { country: "PT", keyword: "clima" },
  { country: "PT", keyword: "eleicoes" },
  { country: "PT", keyword: "energia" },
  { country: "RO", keyword: "clima" },
  { country: "RO", keyword: "alegeri" },
  { country: "RO", keyword: "energie" },
  { country: "CZ", keyword: "klima" },
  { country: "CZ", keyword: "volby" },
  { country: "CZ", keyword: "energie" },
  { country: "HU", keyword: "klima" },
  { country: "HU", keyword: "valasztas" },
  { country: "HU", keyword: "energia" },
  { country: "GR", keyword: "klima" },
  { country: "GR", keyword: "ekloges" },
  { country: "GR", keyword: "energeia" },
];

const CSV_HEADERS: Array<keyof TrainingRow> = [
  "recordId",
  "source",
  "labelQuality",
  "labelStrength",
  "sourceRecordId",
  "adLibraryId",
  "metaAdId",
  "advertiserId",
  "advertiserName",
  "campaignId",
  "adsetId",
  "platforms",
  "platformPositions",
  "country",
  "geoScope",
  "measurementScope",
  "measurementStart",
  "measurementEnd",
  "startDate",
  "endDate",
  "activeDays",
  "creativeType",
  "ctaType",
  "landingDomain",
  "landingUrl",
  "adText",
  "headline",
  "description",
  "reachLow",
  "reachHigh",
  "reach",
  "impressionsLow",
  "impressionsHigh",
  "impressions",
  "frequency",
  "weakFrequencyLow",
  "weakFrequencyHigh",
  "spend",
  "spendLow",
  "spendHigh",
  "spendCurrency",
  "isLabelAligned",
  "alignmentNotes",
  "qualityFlags",
  "retrievedAt",
];

function parseArgs(argv: string[]) {
  const options = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      options.set(value.slice(2), "true");
      continue;
    }
    options.set(value.slice(2), next);
    index += 1;
  }
  return options;
}

function buildSearchUrl(spec: SearchSpec) {
  const url = new URL("https://www.facebook.com/ads/library/");
  url.searchParams.set("active_status", "all");
  url.searchParams.set("ad_type", "political_and_issue_ads");
  url.searchParams.set("country", spec.country);
  url.searchParams.set("search_type", "keyword_unordered");
  url.searchParams.set("media_type", "all");
  url.searchParams.set("q", spec.keyword);
  return url.toString();
}

function toDateOnly(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function deriveActiveDays(startDate: string | null | undefined, endDate: string | null | undefined) {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate ?? startDate);
  if (!start || !end) {
    return null;
  }
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return null;
  }
  return Math.floor((endMs - startMs) / 86_400_000) + 1;
}

function queryCountry(ad: MetaLibraryAd) {
  const inputUrl = ad.debug.actorInputUrl ?? ad.debug.sourceUrl;
  if (!inputUrl) {
    return null;
  }
  try {
    const parsed = new URL(inputUrl);
    return parsed.searchParams.get("country");
  } catch {
    return null;
  }
}

function hasPositiveReach(ad: MetaLibraryAd) {
  return (ad.audienceSize.min != null && ad.audienceSize.min > 0) || (ad.audienceSize.max != null && ad.audienceSize.max > 0);
}

function hasUsableImpressions(ad: MetaLibraryAd) {
  const exact = ad.impressions.min != null && ad.impressions.max != null && ad.impressions.min === ad.impressions.max && ad.impressions.min > 0;
  const boundedRange =
    ad.impressions.min != null &&
    ad.impressions.max != null &&
    ad.impressions.min > 0 &&
    ad.impressions.max > 0;
  return exact || boundedRange;
}

function toTrainingRow(ad: MetaLibraryAd): TrainingRow | null {
  if (!hasPositiveReach(ad) || !hasUsableImpressions(ad)) {
    return null;
  }

  const reachLow = ad.audienceSize.min;
  const reachHigh = ad.audienceSize.max;
  const hasExactReach = reachLow != null && reachHigh != null && reachLow === reachHigh;
  const impressionsLow = ad.impressions.min;
  const impressionsHigh = ad.impressions.max;
  const hasExactImpressions =
    impressionsLow != null && impressionsHigh != null && impressionsLow === impressionsHigh;

  const exactFrequency =
    hasExactReach &&
    hasExactImpressions &&
    reachLow != null &&
    reachLow > 0 &&
    impressionsLow != null
      ? impressionsLow / reachLow
      : null;

  const weakFrequencyLow =
    impressionsLow != null &&
    impressionsLow > 0 &&
    reachHigh != null &&
    reachHigh > 0
      ? impressionsLow / reachHigh
      : null;
  const weakFrequencyHigh =
    impressionsHigh != null &&
    impressionsHigh > 0 &&
    reachLow != null &&
    reachLow > 0
      ? impressionsHigh / reachLow
      : null;

  const country = queryCountry(ad);
  const alignmentNotes = [
    "Reach and impressions were collected from the same public Meta Ad Library ad row.",
    `Reach source path: ${ad.audienceSize.path ?? "unknown"}`,
    `Impressions source path: ${ad.impressions.path ?? "unknown"}`,
    hasExactImpressions
      ? "Impressions are exact-compatible for this public row."
      : "Impressions are a public range, so the row remains a weak/range label.",
  ];

  const measurementStart = toDateOnly(ad.startDate) ?? new Date().toISOString().slice(0, 10);
  const measurementEnd = toDateOnly(ad.endDate ?? ad.startDate) ?? measurementStart;

  return {
    recordId: `public-meta-${ad.adLibraryId}-${country ?? "EU"}-${measurementStart}-${measurementEnd}`,
    source: "PUBLIC_META_AD_LIBRARY",
    labelQuality: "PUBLIC_META_DISCLOSED",
    labelStrength: hasExactReach && hasExactImpressions ? "STRONG" : "WEAK_RANGE",
    sourceRecordId: ad.adLibraryId,
    adLibraryId: ad.adLibraryId,
    metaAdId: null,
    advertiserId: ad.pageId,
    advertiserName: ad.pageName,
    campaignId: null,
    adsetId: null,
    platforms: ad.platforms,
    platformPositions: [],
    country,
    geoScope: country ? `EU_${country}` : "EU_PUBLIC_META",
    measurementScope: "PUBLIC_META_AD_LIBRARY_POLITICAL_AND_ISSUE_ADS",
    measurementStart,
    measurementEnd,
    startDate: toDateOnly(ad.startDate),
    endDate: toDateOnly(ad.endDate),
    activeDays: deriveActiveDays(ad.startDate, ad.endDate),
    creativeType: ad.creative.type.toUpperCase(),
    ctaType: ad.ctaType,
    landingDomain: ad.landingDomain,
    landingUrl: ad.advertiserUrl,
    adText: ad.copy,
    headline: ad.title,
    description: ad.description,
    reachLow,
    reachHigh,
    reach: hasExactReach ? reachLow : null,
    impressionsLow,
    impressionsHigh,
    impressions: hasExactImpressions ? impressionsLow : null,
    frequency: exactFrequency,
    weakFrequencyLow,
    weakFrequencyHigh,
    spend: ad.spend.min != null && ad.spend.max != null && ad.spend.min === ad.spend.max ? ad.spend.min : null,
    spendLow: ad.spend.min,
    spendHigh: ad.spend.max,
    spendCurrency: ad.spend.currency,
    isLabelAligned: true,
    alignmentNotes,
    qualityFlags: {
      audienceStatus: ad.audienceSize.status,
      audiencePath: ad.audienceSize.path,
      impressionsStatus: ad.impressions.status,
      impressionsPath: ad.impressions.path,
      sourceUrl: ad.debug.actorInputUrl ?? ad.debug.sourceUrl,
    },
    retrievedAt: new Date().toISOString(),
  };
}

function csvValue(value: unknown) {
  if (value == null) {
    return "";
  }
  if (Array.isArray(value) || typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function toCsv(rows: TrainingRow[]) {
  const header = CSV_HEADERS.join(",");
  const lines = rows.map((row) =>
    CSV_HEADERS.map((key) => {
      const raw = csvValue(row[key]);
      if (/[",\n]/.test(raw)) {
        return `"${raw.replace(/"/g, "\"\"")}"`;
      }
      return raw;
    }).join(","),
  );
  return `${header}\n${lines.join("\n")}${lines.length ? "\n" : ""}`;
}

function loadExistingRows(trainingJsonPath: string): TrainingRow[] {
  if (!existsSync(trainingJsonPath)) {
    return [];
  }

  try {
    const payload = JSON.parse(readFileSync(trainingJsonPath, "utf8"));
    if (!Array.isArray(payload)) {
      return [];
    }
    return payload.filter((row): row is TrainingRow => Boolean(row && typeof row === "object")) as TrainingRow[];
  } catch {
    return [];
  }
}

function dedupeRowsByAdLibraryId(rows: TrainingRow[]) {
  const deduped = new Map<string, TrainingRow>();
  for (const row of rows) {
    const key = row.adLibraryId ?? row.recordId;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, row);
      continue;
    }

    const existingScore = existing.labelStrength === "STRONG" ? 2 : 1;
    const currentScore = row.labelStrength === "STRONG" ? 2 : 1;
    if (currentScore > existingScore) {
      deduped.set(key, row);
      continue;
    }

    if (currentScore === existingScore && row.retrievedAt > existing.retrievedAt) {
      deduped.set(key, row);
    }
  }
  return [...deduped.values()];
}

function summarizeRows(rows: TrainingRow[]) {
  const countries = [...new Set(rows.map((row) => row.country).filter((value): value is string => Boolean(value)))];
  const platformMix: Record<string, number> = {};
  const creativeMix: Record<string, number> = {};

  for (const row of rows) {
    const platformKey = row.platforms.length ? row.platforms.slice().sort().join("+") : "UNKNOWN";
    platformMix[platformKey] = (platformMix[platformKey] ?? 0) + 1;
    const creativeKey = row.creativeType ?? "UNKNOWN";
    creativeMix[creativeKey] = (creativeMix[creativeKey] ?? 0) + 1;
  }

  return {
    countries,
    platformMix,
    creativeMix,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rawCap = Number(args.get("raw-cap") ?? RAW_AD_TARGET);
  const datasetVersion = args.get("dataset-version") ?? new Date().toISOString().slice(0, 10);
  const exactOnly = args.get("exact-only") === "true";
  const minValidRowsTarget = Number(args.get("min-valid-rows") ?? MIN_VALID_ROWS_TARGET);
  const outputDir = path.resolve(process.cwd(), "..", "..", "data", "meta-training");
  mkdirSync(outputDir, { recursive: true });
  const trainingJsonPath = path.join(outputDir, "training_dataset.json");
  const existingRows = loadExistingRows(trainingJsonPath);

  const client = getApifyClient();
  const allRawItems: unknown[] = [];
  const actorRuns: Array<{ runId: string | null; datasetId: string | null; queryUrl: string }> = [];

  for (const spec of SEARCH_SPECS) {
    if (allRawItems.length >= rawCap) {
      break;
    }
    const queryUrl = buildSearchUrl(spec);
    const queryLimit = Math.min(PER_QUERY_RESULTS_LIMIT, rawCap - allRawItems.length);
    const actorInput = buildMetaAdsActorInput(queryUrl, queryLimit);
    const run = await client.actor("apify~facebook-ads-scraper").call({
      ...actorInput,
      resultsLimit: queryLimit,
    });
    actorRuns.push({
      runId: run.id ?? null,
      datasetId: run.defaultDatasetId ?? null,
      queryUrl,
    });
    if (!run.defaultDatasetId) {
      continue;
    }

    const datasetResponse = await client
      .dataset(run.defaultDatasetId)
      .listItems({ clean: true, limit: queryLimit });
    const items = (datasetResponse.items ?? []) as unknown[];
    allRawItems.push(...items);

    const currentNormalized = normalizeMetaLibraryAds(allRawItems.slice(0, rawCap), {
      actorRunId: actorRuns[0]?.runId ?? "unknown",
      datasetId: actorRuns[0]?.datasetId ?? "multi-run",
    });
    const currentRows = currentNormalized.ads
      .map((ad) => toTrainingRow(ad))
      .filter((row): row is TrainingRow => Boolean(row));
    const currentDedupedRows = dedupeRowsByAdLibraryId([...existingRows, ...currentRows]);
    const currentFinalRows = exactOnly
      ? currentDedupedRows.filter(
          (row) => row.labelStrength === "STRONG" && row.reach != null && row.impressions != null,
        )
      : currentDedupedRows;
    const progressSummary = summarizeRows(currentFinalRows);
    const queryYield = currentRows.length > 0 ? currentRows.length / Math.max(items.length, 1) : 0;

    console.log(
      JSON.stringify(
        {
          progress: true,
          rawAdsScanned: allRawItems.length,
          uniqueAds: currentNormalized.ads.length,
          adsWithReach: currentNormalized.ads.filter(hasPositiveReach).length,
          adsWithImpressions: currentNormalized.ads.filter(hasUsableImpressions).length,
          adsWithBoth: currentRows.length,
          alignedWeakRangeRows: currentFinalRows.filter((row) => row.labelStrength === "WEAK_RANGE").length,
          uniqueAdvertisers: new Set(
            currentFinalRows
              .map((row) => row.advertiserName?.trim().toLowerCase())
              .filter((value): value is string => Boolean(value)),
          ).size,
          currentCountry: spec.country,
          currentQuery: spec.keyword,
          labelYield: queryYield,
          countries: progressSummary.countries,
        },
        null,
        2,
      ),
    );

    if (currentFinalRows.length >= minValidRowsTarget) {
      break;
    }
  }

  const trimmedRawItems = allRawItems.slice(0, rawCap);
  const normalized = normalizeMetaLibraryAds(trimmedRawItems, {
    actorRunId: actorRuns[0]?.runId ?? "unknown",
    datasetId: actorRuns[0]?.datasetId ?? "multi-run",
  });

  const uniqueAds = normalized.ads;
  const adsWithReach = uniqueAds.filter(hasPositiveReach);
  const adsWithImpressions = uniqueAds.filter(hasUsableImpressions);
  const qualifyingRows = uniqueAds
    .map((ad) => toTrainingRow(ad))
    .filter((row): row is TrainingRow => Boolean(row));

  const dedupedRows = dedupeRowsByAdLibraryId([...existingRows, ...qualifyingRows]);
  const finalRows = exactOnly
    ? dedupedRows.filter(
        (row) => row.labelStrength === "STRONG" && row.reach != null && row.impressions != null,
      )
    : dedupedRows;
  const uniqueAdvertisers = new Set(
    finalRows
      .map((row) => row.advertiserName?.trim().toLowerCase())
      .filter((value): value is string => Boolean(value)),
  );

  const trainingCsvPath = path.join(outputDir, "training_dataset.csv");
  const rejectedCsvPath = path.join(outputDir, "rejected_rows.csv");
  const quarantineCsvPath = path.join(outputDir, "quarantine_dataset.csv");
  const qualityPath = path.join(outputDir, "data_quality_report.json");
  const collectionPath = path.join(outputDir, "collection_report.json");
  const overallSummary = summarizeRows(finalRows);
  const newRowsAddedThisRun = finalRows.filter(
    (row) => !existingRows.some((existing) => (existing.adLibraryId ?? existing.recordId) === (row.adLibraryId ?? row.recordId)),
  ).length;

  writeFileSync(trainingCsvPath, toCsv(finalRows), "utf8");
  writeFileSync(trainingJsonPath, JSON.stringify(finalRows, null, 2), "utf8");
  writeFileSync(rejectedCsvPath, toCsv([]), "utf8");
  writeFileSync(quarantineCsvPath, toCsv(dedupedRows.filter((row) => row.labelStrength === "WEAK_RANGE")), "utf8");
  writeFileSync(
    qualityPath,
    JSON.stringify(
      {
        datasetVersion,
        exactOnly,
        rawAds: trimmedRawItems.length,
        uniqueAds: uniqueAds.length,
        adsWithReach: adsWithReach.length,
        adsWithImpressions: adsWithImpressions.length,
        adsWithBoth: dedupedRows.length,
        alignedTrainingRows: finalRows.filter((row) => row.isLabelAligned).length,
        strongRows: dedupedRows.filter((row) => row.labelStrength === "STRONG").length,
        weakRangeRows: dedupedRows.filter((row) => row.labelStrength === "WEAK_RANGE").length,
        uniqueAdvertisers: uniqueAdvertisers.size,
        countries: overallSummary.countries,
        platformMix: overallSummary.platformMix,
        creativeMix: overallSummary.creativeMix,
        newRowsAddedThisRun,
      },
      null,
      2,
    ),
    "utf8",
  );
  writeFileSync(
    collectionPath,
    JSON.stringify(
      {
        actorId: "apify~facebook-ads-scraper",
        actorRuns,
        rawCap,
        exactOnly,
        minValidRowsTarget,
        searchSpecs: SEARCH_SPECS,
        rawAds: trimmedRawItems.length,
        uniqueAds: uniqueAds.length,
        adsWithReach: adsWithReach.length,
        adsWithImpressions: adsWithImpressions.length,
        adsWithBoth: dedupedRows.length,
        alignedTrainingRows: finalRows.filter((row) => row.isLabelAligned).length,
        strongRows: dedupedRows.filter((row) => row.labelStrength === "STRONG").length,
        weakRangeRows: dedupedRows.filter((row) => row.labelStrength === "WEAK_RANGE").length,
        uniqueAdvertisers: uniqueAdvertisers.size,
        countries: overallSummary.countries,
        platformMix: overallSummary.platformMix,
        creativeMix: overallSummary.creativeMix,
        newRowsAddedThisRun,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        actorRuns,
        rawAds: trimmedRawItems.length,
        minValidRowsTarget,
        uniqueAds: uniqueAds.length,
        adsWithReach: adsWithReach.length,
        adsWithImpressions: adsWithImpressions.length,
        adsWithBoth: dedupedRows.length,
        alignedTrainingRows: finalRows.filter((row) => row.isLabelAligned).length,
        strongRows: dedupedRows.filter((row) => row.labelStrength === "STRONG").length,
        weakRangeRows: dedupedRows.filter((row) => row.labelStrength === "WEAK_RANGE").length,
        uniqueAdvertisers: uniqueAdvertisers.size,
        countries: overallSummary.countries,
        platformMix: overallSummary.platformMix,
        creativeMix: overallSummary.creativeMix,
        newRowsAddedThisRun,
        trainingCsvPath,
        firstRows: finalRows.slice(0, 5),
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Meta training dataset collection failed.");
  process.exitCode = 1;
});
