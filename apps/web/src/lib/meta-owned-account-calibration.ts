import { META_IMPRESSIONS_GROUND_TRUTH_TABLE } from "@/lib/meta-impressions-ground-truth";
import { getOptionalSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Calibrates the impressions model's CPM benchmark from the
 * organization's OWN real, authorized Meta ad account data (imported
 * via meta-ads-insights-importer.ts / importAuthorizedMetaAdsInsights)
 * instead of generic public industry benchmarks. This is real,
 * first-party data the org already has legitimate access to — no
 * panel, no third-party purchase, no bypass of anything.
 *
 * Still an estimate for OTHER ads, not the calibrated ad itself: this
 * tells you "in this market, $1 of real spend from OUR campaigns
 * produced N real impressions," and applies that ratio to a different
 * ad's disclosed/estimated spend. It's a materially better-grounded
 * assumption than a public benchmark, but it is still an assumption
 * when applied to someone else's ad.
 */

export type CalibratedCpmBand = {
  low: number;
  high: number;
  median: number;
  sampleRows: number;
  totalSpend: number;
  totalImpressions: number;
  country: string | null;
  source: "OWN_ACCOUNT_DATA";
};

type GroundTruthCpmRow = {
  country: string | null;
  spend: number | null;
  impressions: number | null;
};

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes — real campaign data changes slowly.
const MIN_ROWS_FOR_BAND = 3;

let cachedRows: { fetchedAt: number; rows: GroundTruthCpmRow[] } | null = null;

async function loadAuthorizedCpmRows(): Promise<GroundTruthCpmRow[]> {
  if (cachedRows && Date.now() - cachedRows.fetchedAt < CACHE_TTL_MS) {
    return cachedRows.rows;
  }

  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(META_IMPRESSIONS_GROUND_TRUTH_TABLE)
    .select("country, spend, impressions")
    .eq("label_quality", "EXACT_AUTHORIZED_META")
    .eq("is_label_aligned", true)
    .gt("spend", 0)
    .gt("impressions", 0);

  if (error || !data) {
    return [];
  }

  const rows = data as GroundTruthCpmRow[];
  cachedRows = { fetchedAt: Date.now(), rows };
  return rows;
}

function quantile(sortedValues: number[], q: number): number {
  if (sortedValues.length === 0) return 0;
  const position = (sortedValues.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  const lower = sortedValues[base] ?? sortedValues[sortedValues.length - 1];
  const upper = sortedValues[base + 1] ?? lower;
  return lower + rest * (upper - lower);
}

function bandFromCpmValues(cpmValues: number[], country: string | null, totalSpend: number, totalImpressions: number): CalibratedCpmBand | null {
  if (cpmValues.length < MIN_ROWS_FOR_BAND) {
    return null;
  }

  const sorted = [...cpmValues].sort((a, b) => a - b);
  // Interquartile band rather than raw min/max, so one unusually cheap
  // or expensive campaign doesn't single-handedly define the range.
  const low = quantile(sorted, 0.25);
  const high = Math.max(low, quantile(sorted, 0.75));
  const median = quantile(sorted, 0.5);

  return {
    low,
    high,
    median,
    sampleRows: cpmValues.length,
    totalSpend,
    totalImpressions,
    country,
    source: "OWN_ACCOUNT_DATA",
  };
}

/**
 * Returns a CPM band built from the org's own real campaign data,
 * preferring an exact country match and falling back to a pooled
 * (all-country) band when there isn't enough country-specific data yet.
 * Returns null when there isn't enough real data at all — callers must
 * fall back to a generic public benchmark in that case.
 */
export async function getCalibratedCpmBenchmark(countryHint: string | null): Promise<CalibratedCpmBand | null> {
  const rows = await loadAuthorizedCpmRows();
  if (rows.length === 0) {
    return null;
  }

  const toCpm = (row: GroundTruthCpmRow) => ((row.spend as number) / (row.impressions as number)) * 1000;

  if (countryHint) {
    const countryRows = rows.filter((row) => row.country?.toUpperCase() === countryHint.toUpperCase());
    const countryBand = bandFromCpmValues(
      countryRows.map(toCpm),
      countryHint,
      countryRows.reduce((sum, row) => sum + (row.spend as number), 0),
      countryRows.reduce((sum, row) => sum + (row.impressions as number), 0),
    );
    if (countryBand) {
      return countryBand;
    }
  }

  // Pooled across every market we have real data for — still real data,
  // just not narrowed to this ad's specific country.
  return bandFromCpmValues(
    rows.map(toCpm),
    null,
    rows.reduce((sum, row) => sum + (row.spend as number), 0),
    rows.reduce((sum, row) => sum + (row.impressions as number), 0),
  );
}

/** Test-only: clears the in-memory cache between test cases. */
export function __resetCalibrationCacheForTests() {
  cachedRows = null;
}
