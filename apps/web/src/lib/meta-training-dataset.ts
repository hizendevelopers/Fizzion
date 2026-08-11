import { readFileSync } from "node:fs";
import path from "node:path";

import * as XLSX from "xlsx";

import { getOptionalSupabaseAdminClient } from "@/lib/supabase/server";

export const META_TRAINING_SOURCE = "PUBLIC_META_AD_LIBRARY";
export const DEFAULT_TRAINING_TARGET_ROWS = 1_000;

export type MetaTrainingRow = {
  recordId: string;
  source: string;
  labelQuality: string;
  labelStrength: string;
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
  measurementStart: string | null;
  measurementEnd: string | null;
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
  retrievedAt: string | null;
};

export type MetaTrainingImportStats = {
  rowsRead: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  duplicates: number;
  databaseRows: number;
};

export type MetaTrainingCollectionReport = {
  rawAds?: number;
  uniqueAds?: number;
  adsWithReach?: number;
  adsWithImpressions?: number;
  adsWithBoth?: number;
  alignedTrainingRows?: number;
  strongRows?: number;
  weakRangeRows?: number;
  uniqueAdvertisers?: number;
  countries?: string[];
  platformMix?: Record<string, number>;
  creativeMix?: Record<string, number>;
  newRowsAddedThisRun?: number;
  actorRuns?: Array<{ runId: string | null; datasetId: string | null; queryUrl?: string; datasetCount?: number }>;
} & Record<string, unknown>;

export type MetaTrainingDatasetStats = {
  totalRows: number;
  exactLabels: number;
  weakRangeLabels: number;
  uniqueAdvertisers: number;
  countries: Record<string, number>;
  platforms: Record<string, number>;
  creativeTypes: Record<string, number>;
  targetRows: number;
  progress: number;
  rawAdsScanned: number;
  adsWithReach: number;
  adsWithImpressions: number;
  adsWithBoth: number;
  labelYield: number;
  collectionStatus: string;
  stopReason: string;
  latestError: string | null;
  modelStatus: string;
};

export type MetaTrainingDatasetListResult = Awaited<ReturnType<typeof listMetaTrainingRows>>;

export type MetaTrainingDatasetDetail = NonNullable<Awaited<ReturnType<typeof getMetaTrainingRow>>>;

type DbTrainingRow = {
  id: string;
  record_id: string;
};

type TrainingTableCapabilities = {
  hasLabelStrength: boolean;
  hasReachLow: boolean;
  hasReachHigh: boolean;
  hasImpressionsLow: boolean;
  hasImpressionsHigh: boolean;
  hasWeakFrequencyLow: boolean;
  hasWeakFrequencyHigh: boolean;
  hasSpendLow: boolean;
  hasSpendHigh: boolean;
};

let trainingTableCapabilitiesPromise: Promise<TrainingTableCapabilities> | null = null;

function repoDataPath(...parts: string[]) {
  return path.resolve(process.cwd(), "..", "..", ...parts);
}

export function getTrainingTargetRows() {
  const raw = process.env.TRAINING_TARGET_ROWS?.trim();
  if (!raw) {
    return DEFAULT_TRAINING_TARGET_ROWS;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TRAINING_TARGET_ROWS;
}

export function getDefaultTrainingDatasetPaths() {
  const baseDir = repoDataPath("data", "meta-training");
  return {
    baseDir,
    csvPath: path.join(baseDir, "training_dataset.csv"),
    jsonPath: path.join(baseDir, "training_dataset.json"),
    qualityReportPath: path.join(baseDir, "data_quality_report.json"),
    collectionReportPath: path.join(baseDir, "collection_report.json"),
  };
}

function parseMaybeJsonArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function parseMaybeJsonObject(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string" || !value.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function readRangeValue(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    const parsed = parseNullableNumber(value);
    if (parsed != null) {
      return parsed;
    }
  }
  return null;
}

function readStringValue(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = parseNullableString(source[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

function parseNullableNumber(value: unknown) {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNullableString(value: unknown) {
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
  return text ? text : null;
}

function convertExcelSerialToDate(value: number) {
  return new Date(Math.round((value - 25569) * 86_400 * 1000));
}

function parseNullableDateValue(value: unknown, mode: "date" | "datetime") {
  if (value == null || value === "") {
    return null;
  }

  const coerce = (date: Date) => {
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return mode === "date" ? date.toISOString().slice(0, 10) : date.toISOString();
  };

  if (typeof value === "number") {
    return coerce(convertExcelSerialToDate(value));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (/^\d+(\.\d+)?$/.test(trimmed) && !/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        return coerce(convertExcelSerialToDate(parsed));
      }
    }

    const parsedDate = new Date(trimmed);
    if (!Number.isNaN(parsedDate.getTime())) {
      return coerce(parsedDate);
    }

    return trimmed;
  }

  return null;
}

function parseBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }
  return Boolean(value);
}

function countBy<T>(items: T[], getKey: (item: T) => string | null | undefined) {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = getKey(item);
    if (!key) {
      continue;
    }
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function formatPlatformKey(platforms: string[]) {
  return platforms.length ? platforms.slice().sort().join("+") : "UNKNOWN";
}

async function detectColumn(column: string) {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return false;
  }

  const { error } = await supabase
    .from("meta_impressions_ground_truth_labels")
    .select(column)
    .limit(1);

  return !error;
}

async function getTrainingTableCapabilities() {
  if (!trainingTableCapabilitiesPromise) {
    trainingTableCapabilitiesPromise = (async () => ({
      hasLabelStrength: await detectColumn("label_strength"),
      hasReachLow: await detectColumn("reach_low"),
      hasReachHigh: await detectColumn("reach_high"),
      hasImpressionsLow: await detectColumn("impressions_low"),
      hasImpressionsHigh: await detectColumn("impressions_high"),
      hasWeakFrequencyLow: await detectColumn("weak_frequency_low"),
      hasWeakFrequencyHigh: await detectColumn("weak_frequency_high"),
      hasSpendLow: await detectColumn("spend_low"),
      hasSpendHigh: await detectColumn("spend_high"),
    }))();
  }

  return trainingTableCapabilitiesPromise;
}

async function getDefaultOrganizationId() {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .limit(1);

  if (error) {
    return null;
  }

  const first = (data ?? [])[0] as { id?: string } | undefined;
  return typeof first?.id === "string" ? first.id : null;
}

export function readMetaTrainingCsv(csvPath = getDefaultTrainingDatasetPaths().csvPath): MetaTrainingRow[] {
  const workbook = XLSX.readFile(csvPath, { raw: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

  return rows
    .map((row) => ({
      recordId: String(row.recordId ?? "").trim(),
      source: String(row.source ?? "").trim(),
      labelQuality: String(row.labelQuality ?? "").trim(),
      labelStrength: String(row.labelStrength ?? "").trim(),
      sourceRecordId: String(row.sourceRecordId ?? "").trim(),
      adLibraryId: parseNullableString(row.adLibraryId),
      metaAdId: parseNullableString(row.metaAdId),
      advertiserId: parseNullableString(row.advertiserId),
      advertiserName: parseNullableString(row.advertiserName),
      campaignId: parseNullableString(row.campaignId),
      adsetId: parseNullableString(row.adsetId),
      platforms: parseMaybeJsonArray(row.platforms),
      platformPositions: parseMaybeJsonArray(row.platformPositions),
      country: parseNullableString(row.country),
      geoScope: parseNullableString(row.geoScope),
      measurementScope: parseNullableString(row.measurementScope),
      measurementStart: parseNullableDateValue(row.measurementStart, "date"),
      measurementEnd: parseNullableDateValue(row.measurementEnd, "date"),
      startDate: parseNullableDateValue(row.startDate, "date"),
      endDate: parseNullableDateValue(row.endDate, "date"),
      activeDays: parseNullableNumber(row.activeDays),
      creativeType: parseNullableString(row.creativeType),
      ctaType: parseNullableString(row.ctaType),
      landingDomain: parseNullableString(row.landingDomain),
      landingUrl: parseNullableString(row.landingUrl),
      adText: parseNullableString(row.adText),
      headline: parseNullableString(row.headline),
      description: parseNullableString(row.description),
      reachLow: parseNullableNumber(row.reachLow),
      reachHigh: parseNullableNumber(row.reachHigh),
      reach: parseNullableNumber(row.reach),
      impressionsLow: parseNullableNumber(row.impressionsLow),
      impressionsHigh: parseNullableNumber(row.impressionsHigh),
      impressions: parseNullableNumber(row.impressions),
      frequency: parseNullableNumber(row.frequency),
      weakFrequencyLow: parseNullableNumber(row.weakFrequencyLow),
      weakFrequencyHigh: parseNullableNumber(row.weakFrequencyHigh),
      spend: parseNullableNumber(row.spend),
      spendLow: parseNullableNumber(row.spendLow),
      spendHigh: parseNullableNumber(row.spendHigh),
      spendCurrency: parseNullableString(row.spendCurrency),
      isLabelAligned: parseBoolean(row.isLabelAligned),
      alignmentNotes: parseMaybeJsonArray(row.alignmentNotes),
      qualityFlags: parseMaybeJsonObject(row.qualityFlags),
      retrievedAt: parseNullableDateValue(row.retrievedAt, "datetime"),
    }))
    .filter((row) => row.recordId.length > 0);
}

export async function importMetaTrainingDataset(csvPath = getDefaultTrainingDatasetPaths().csvPath): Promise<MetaTrainingImportStats> {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const capabilities = await getTrainingTableCapabilities();
  const defaultOrganizationId = await getDefaultOrganizationId();
  const rows = readMetaTrainingCsv(csvPath);
  const deduped = new Map<string, MetaTrainingRow>();
  let duplicates = 0;
  for (const row of rows) {
    if (deduped.has(row.recordId)) {
      duplicates += 1;
    }
    deduped.set(row.recordId, row);
  }
  const normalizedRows = [...deduped.values()];

  const { data: existingData, error: existingError } = await supabase
    .from("meta_impressions_ground_truth_labels")
    .select("id, record_id");

  if (existingError) {
    throw new Error(`Failed to load existing training rows: ${existingError.message}`);
  }

  const existingByRecordId = new Map(
    ((existingData ?? []) as DbTrainingRow[]).map((row) => [row.record_id, row]),
  );

  let rowsInserted = 0;
  let rowsUpdated = 0;
  let rowsSkipped = 0;

  for (const row of normalizedRows) {
    const qualityFlags = {
      ...row.qualityFlags,
      importedFromCsv: true,
      labelStrength: row.labelStrength,
      metricRanges: {
        reachLow: row.reachLow,
        reachHigh: row.reachHigh,
        impressionsLow: row.impressionsLow,
        impressionsHigh: row.impressionsHigh,
        weakFrequencyLow: row.weakFrequencyLow,
        weakFrequencyHigh: row.weakFrequencyHigh,
        spendLow: row.spendLow,
        spendHigh: row.spendHigh,
      },
    };

    const payload: Record<string, unknown> = {
      organization_id: defaultOrganizationId,
      record_id: row.recordId,
      source: row.source || META_TRAINING_SOURCE,
      label_quality: row.labelQuality,
      source_record_id: row.sourceRecordId,
      source_import_run_id: null,
      ad_library_id: row.adLibraryId,
      meta_ad_id: row.metaAdId,
      advertiser_id: row.advertiserId,
      advertiser_name: row.advertiserName,
      campaign_id: row.campaignId,
      adset_id: row.adsetId,
      platforms: row.platforms,
      platform_positions: row.platformPositions,
      country: row.country,
      geo_scope: row.geoScope,
      measurement_scope: row.measurementScope,
      measurement_start: row.measurementStart,
      measurement_end: row.measurementEnd,
      start_date: row.startDate,
      end_date: row.endDate,
      active_days: row.activeDays,
      creative_type: row.creativeType,
      cta_type: row.ctaType,
      landing_domain: row.landingDomain,
      landing_url: row.landingUrl,
      ad_text: row.adText,
      headline: row.headline,
      description: row.description,
      reach: row.reach,
      impressions: row.impressions,
      frequency: row.frequency,
      spend: row.spend,
      spend_currency: row.spendCurrency,
      is_label_aligned: row.isLabelAligned,
      alignment_notes: row.alignmentNotes,
      quality_flags: qualityFlags,
      raw_payload: {
        csvRow: row,
      },
      retrieved_at: row.retrievedAt,
    };

    if (capabilities.hasLabelStrength) {
      payload.label_strength = row.labelStrength;
    }
    if (capabilities.hasReachLow) {
      payload.reach_low = row.reachLow;
    }
    if (capabilities.hasReachHigh) {
      payload.reach_high = row.reachHigh;
    }
    if (capabilities.hasImpressionsLow) {
      payload.impressions_low = row.impressionsLow;
    }
    if (capabilities.hasImpressionsHigh) {
      payload.impressions_high = row.impressionsHigh;
    }
    if (capabilities.hasWeakFrequencyLow) {
      payload.weak_frequency_low = row.weakFrequencyLow;
    }
    if (capabilities.hasWeakFrequencyHigh) {
      payload.weak_frequency_high = row.weakFrequencyHigh;
    }
    if (capabilities.hasSpendLow) {
      payload.spend_low = row.spendLow;
    }
    if (capabilities.hasSpendHigh) {
      payload.spend_high = row.spendHigh;
    }

    const existing = existingByRecordId.get(row.recordId);
    if (existing) {
      const { error } = await supabase
        .from("meta_impressions_ground_truth_labels")
        .update(payload)
        .eq("id", existing.id);
      if (error) {
        throw new Error(`Failed to update training row ${row.recordId}: ${error.message}`);
      }
      rowsUpdated += 1;
      continue;
    }

    const { error } = await supabase
      .from("meta_impressions_ground_truth_labels")
      .insert(payload);
    if (error) {
      throw new Error(`Failed to insert training row ${row.recordId}: ${error.message}`);
    }
    rowsInserted += 1;
  }

  rowsSkipped = rows.length - normalizedRows.length;

  const { count, error: countError } = await supabase
    .from("meta_impressions_ground_truth_labels")
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(`Failed to count imported training rows: ${countError.message}`);
  }

  return {
    rowsRead: rows.length,
    rowsInserted,
    rowsUpdated,
    rowsSkipped,
    duplicates,
    databaseRows: count ?? 0,
  };
}

function readCollectionReport() {
  const reportPath = getDefaultTrainingDatasetPaths().collectionReportPath;
  try {
    return JSON.parse(readFileSync(reportPath, "utf8")) as MetaTrainingCollectionReport;
  } catch {
    return {} as MetaTrainingCollectionReport;
  }
}

export async function listMetaTrainingRows(filters: {
  page?: number;
  pageSize?: number;
  search?: string;
  country?: string;
  platform?: string;
  creativeType?: string;
  advertiser?: string;
  labelStrength?: string;
  hasReach?: boolean;
  hasImpressions?: boolean;
  alignedOnly?: boolean;
}) {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data, error } = await supabase
    .from("meta_impressions_ground_truth_labels")
    .select("*")
    .order("retrieved_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load training rows: ${error.message}`);
  }

  let rows = (data ?? []).map((row) => {
    const qualityFlags = ((row.quality_flags as Record<string, unknown>) ?? {}) as Record<string, unknown>;
    const metricRanges =
      qualityFlags.metricRanges && typeof qualityFlags.metricRanges === "object"
        ? (qualityFlags.metricRanges as Record<string, unknown>)
        : {};
    const csvRow =
      row.raw_payload &&
      typeof row.raw_payload === "object" &&
      (row.raw_payload as Record<string, unknown>).csvRow &&
      typeof (row.raw_payload as Record<string, unknown>).csvRow === "object"
        ? ((row.raw_payload as Record<string, unknown>).csvRow as Record<string, unknown>)
        : {};

    return {
    id: row.id as string,
    recordId: row.record_id as string,
    adLibraryId: row.ad_library_id as string | null,
    advertiserId: row.advertiser_id as string | null,
    advertiserName: row.advertiser_name as string | null,
    country: row.country as string | null,
    platforms: (row.platforms as string[]) ?? [],
    platformPositions: (row.platform_positions as string[]) ?? [],
    creativeType: row.creative_type as string | null,
    ctaType: row.cta_type as string | null,
    landingDomain: row.landing_domain as string | null,
    landingUrl: row.landing_url as string | null,
    startDate: row.start_date as string | null,
    endDate: row.end_date as string | null,
    activeDays: row.active_days as number | null,
    reachLow: readRangeValue(row as Record<string, unknown>, "reach_low") ?? readRangeValue(metricRanges, "reachLow") ?? readRangeValue(csvRow, "reachLow"),
    reachHigh: readRangeValue(row as Record<string, unknown>, "reach_high") ?? readRangeValue(metricRanges, "reachHigh") ?? readRangeValue(csvRow, "reachHigh"),
    reach: row.reach as number | null,
    impressionsLow:
      readRangeValue(row as Record<string, unknown>, "impressions_low") ??
      readRangeValue(metricRanges, "impressionsLow") ??
      readRangeValue(csvRow, "impressionsLow"),
    impressionsHigh:
      readRangeValue(row as Record<string, unknown>, "impressions_high") ??
      readRangeValue(metricRanges, "impressionsHigh") ??
      readRangeValue(csvRow, "impressionsHigh"),
    impressions: row.impressions as number | null,
    frequency: row.frequency as number | null,
    weakFrequencyLow:
      readRangeValue(row as Record<string, unknown>, "weak_frequency_low") ??
      readRangeValue(metricRanges, "weakFrequencyLow") ??
      readRangeValue(csvRow, "weakFrequencyLow"),
    weakFrequencyHigh:
      readRangeValue(row as Record<string, unknown>, "weak_frequency_high") ??
      readRangeValue(metricRanges, "weakFrequencyHigh") ??
      readRangeValue(csvRow, "weakFrequencyHigh"),
    spend: row.spend as number | null,
    spendLow:
      readRangeValue(row as Record<string, unknown>, "spend_low") ??
      readRangeValue(metricRanges, "spendLow") ??
      readRangeValue(csvRow, "spendLow"),
    spendHigh:
      readRangeValue(row as Record<string, unknown>, "spend_high") ??
      readRangeValue(metricRanges, "spendHigh") ??
      readRangeValue(csvRow, "spendHigh"),
    spendCurrency: row.spend_currency as string | null,
    source: row.source as string,
    labelQuality: row.label_quality as string,
    labelStrength:
      readStringValue(row as Record<string, unknown>, "label_strength") ??
      readStringValue(qualityFlags, "labelStrength") ??
      readStringValue(csvRow, "labelStrength") ??
      "STRONG",
    isLabelAligned: Boolean(row.is_label_aligned),
    alignmentNotes: (row.alignment_notes as string[]) ?? [],
    qualityFlags,
    retrievedAt: row.retrieved_at as string | null,
    openMetaUrl: row.ad_library_id ? `https://www.facebook.com/ads/library/?id=${row.ad_library_id}` : null,
  };});

  if (filters.alignedOnly ?? true) {
    rows = rows.filter((row) => row.isLabelAligned);
  }
  if (filters.country) {
    rows = rows.filter((row) => row.country === filters.country);
  }
  if (filters.platform) {
    rows = rows.filter((row) => row.platforms.includes(filters.platform!));
  }
  if (filters.creativeType) {
    rows = rows.filter((row) => row.creativeType === filters.creativeType);
  }
  if (filters.advertiser) {
    const advertiser = filters.advertiser.toLowerCase();
    rows = rows.filter((row) => (row.advertiserName ?? "").toLowerCase() === advertiser);
  }
  if (filters.labelStrength) {
    rows = rows.filter((row) => row.labelStrength === filters.labelStrength);
  }
  if (filters.hasReach) {
    rows = rows.filter((row) => row.reach != null || row.reachLow != null || row.reachHigh != null);
  }
  if (filters.hasImpressions) {
    rows = rows.filter((row) => row.impressions != null || row.impressionsLow != null || row.impressionsHigh != null);
  }
  if (filters.search) {
    const search = filters.search.toLowerCase();
    rows = rows.filter((row) =>
      [row.adLibraryId, row.advertiserName, row.country, row.creativeType].some((value) =>
        (value ?? "").toLowerCase().includes(search),
      ),
    );
  }

  const total = rows.length;
  const pageSize = Math.max(1, Math.min(filters.pageSize ?? 25, 100));
  const page = Math.max(1, filters.page ?? 1);
  const start = (page - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize);

  return { rows: paged, total, page, pageSize };
}

export async function getMetaTrainingDatasetStats(): Promise<MetaTrainingDatasetStats> {
  const { rows, total } = await listMetaTrainingRows({
    page: 1,
    pageSize: 10_000,
    alignedOnly: false,
  });
  const collection = readCollectionReport();
  const exactLabels = rows.filter((row) => row.labelStrength === "STRONG").length;
  const weakRangeLabels = rows.filter((row) => row.labelStrength === "WEAK_RANGE").length;
  const uniqueAdvertisers = new Set(
    rows.map((row) => row.advertiserName?.trim().toLowerCase()).filter((value): value is string => Boolean(value)),
  ).size;

  const targetRows = getTrainingTargetRows();
  const rawAdsScanned = Number(collection.rawAds ?? 0);
  const adsWithReach = Number(collection.adsWithReach ?? 0);
  const adsWithImpressions = Number(collection.adsWithImpressions ?? 0);
  const adsWithBoth = Number(collection.adsWithBoth ?? 0);
  const latestError =
    typeof collection.latestError === "string"
      ? collection.latestError
      : typeof collection.stopReasonMessage === "string"
        ? collection.stopReasonMessage
        : null;
  const stopReason =
    typeof collection.stopReason === "string"
      ? collection.stopReason
      : total >= targetRows
        ? "TARGET_REACHED"
        : latestError
          ? "APIFY_ERROR"
          : rawAdsScanned > 0
            ? "PAUSED"
            : "COLLECTING";
  const collectionStatus =
    typeof collection.collectionStatus === "string"
      ? collection.collectionStatus
      : stopReason === "TARGET_REACHED"
        ? "READY_FOR_MODELING"
        : stopReason === "APIFY_ERROR" || stopReason === "PAUSED"
          ? "PAUSED"
          : "COLLECTING_DATA";

  return {
    totalRows: total,
    exactLabels,
    weakRangeLabels,
    uniqueAdvertisers,
    countries: countBy(rows, (row) => row.country ?? "UNKNOWN"),
    platforms: countBy(rows, (row) => formatPlatformKey(row.platforms)),
    creativeTypes: countBy(rows, (row) => row.creativeType ?? "UNKNOWN"),
    targetRows,
    progress: targetRows > 0 ? Math.min(1, total / targetRows) : 0,
    rawAdsScanned,
    adsWithReach,
    adsWithImpressions,
    adsWithBoth,
    labelYield: rawAdsScanned > 0 ? adsWithBoth / rawAdsScanned : 0,
    collectionStatus,
    stopReason,
    latestError,
    modelStatus: "Not trained yet",
  };
}

export async function getMetaTrainingRow(recordId: string) {
  const { rows } = await listMetaTrainingRows({
    page: 1,
    pageSize: 10_000,
    alignedOnly: false,
  });
  return rows.find((row) => row.recordId === recordId || row.adLibraryId === recordId) ?? null;
}
