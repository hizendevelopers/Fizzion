import { afterEach, test, vi } from "vitest";
import assert from "node:assert/strict";

const mockSelectResult = { data: null as unknown, error: null as unknown };

function buildQueryChain() {
  // Mimics the small slice of the supabase-js query builder this module
  // actually calls: .from().select().eq().eq().gt().gt() — every method
  // returns the same thenable chain object.
  const chain: Record<string, unknown> = {};
  const methods = ["from", "select", "eq", "gt"];
  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = (resolve: (value: typeof mockSelectResult) => unknown) => resolve(mockSelectResult);
  return chain;
}

const mockAdminClient = buildQueryChain();

vi.mock("@/lib/supabase/server", () => ({
  getOptionalSupabaseAdminClient: vi.fn(() => mockAdminClient),
}));

const { getCalibratedCpmBenchmark, __resetCalibrationCacheForTests } = await import("./meta-owned-account-calibration");

afterEach(() => {
  __resetCalibrationCacheForTests();
  mockSelectResult.data = null;
  mockSelectResult.error = null;
});

test("returns null when there is no owned-account data yet", async () => {
  mockSelectResult.data = [];
  const band = await getCalibratedCpmBenchmark("IQ");
  assert.equal(band, null);
});

test("returns null when there are fewer than 3 rows (too small a sample to band)", async () => {
  mockSelectResult.data = [
    { country: "IQ", spend: 100, impressions: 100_000 },
    { country: "IQ", spend: 200, impressions: 190_000 },
  ];
  const band = await getCalibratedCpmBenchmark("IQ");
  assert.equal(band, null);
});

test("builds a country-specific band from real spend/impressions when enough rows exist", async () => {
  // CPM = spend / impressions * 1000
  mockSelectResult.data = [
    { country: "IQ", spend: 100, impressions: 100_000 }, // CPM 1.0
    { country: "IQ", spend: 150, impressions: 100_000 }, // CPM 1.5
    { country: "IQ", spend: 200, impressions: 100_000 }, // CPM 2.0
    { country: "IQ", spend: 250, impressions: 100_000 }, // CPM 2.5
  ];

  const band = await getCalibratedCpmBenchmark("IQ");
  assert.ok(band);
  assert.equal(band?.country, "IQ");
  assert.equal(band?.sampleRows, 4);
  assert.ok(band!.low >= 1.0 && band!.low <= 1.5);
  assert.ok(band!.high >= 2.0 && band!.high <= 2.5);
  assert.equal(band?.totalSpend, 700);
  assert.equal(band?.totalImpressions, 400_000);
});

test("falls back to a pooled (all-country) band when the requested country has no data of its own", async () => {
  mockSelectResult.data = [
    { country: "PK", spend: 100, impressions: 100_000 },
    { country: "PK", spend: 150, impressions: 100_000 },
    { country: "PK", spend: 200, impressions: 100_000 },
  ];

  const band = await getCalibratedCpmBenchmark("IQ"); // asking for Iraq, only Pakistan data exists
  assert.ok(band);
  assert.equal(band?.country, null); // pooled, not country-matched
});

test("returns a pooled band when no country hint is given at all", async () => {
  mockSelectResult.data = [
    { country: "PK", spend: 100, impressions: 100_000 },
    { country: "IQ", spend: 150, impressions: 100_000 },
    { country: null, spend: 200, impressions: 100_000 },
  ];

  const band = await getCalibratedCpmBenchmark(null);
  assert.ok(band);
  assert.equal(band?.sampleRows, 3);
});
