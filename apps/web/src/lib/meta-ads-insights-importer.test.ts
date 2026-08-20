import { test } from "vitest";
import assert from "node:assert/strict";

import { buildGroundTruthRecord } from "./meta-ads-insights-importer";

test("buildGroundTruthRecord produces a distinct record id per country breakdown row", () => {
  const iraqRow = buildGroundTruthRecord("act_123", {
    ad_id: "999",
    date_start: "2026-07-01",
    date_stop: "2026-07-07",
    impressions: "100000",
    reach: "40000",
    spend: "150",
    country: "IQ",
  });
  const pakistanRow = buildGroundTruthRecord("act_123", {
    ad_id: "999",
    date_start: "2026-07-01",
    date_stop: "2026-07-07",
    impressions: "80000",
    reach: "30000",
    spend: "90",
    country: "PK",
  });

  // Same ad, same date range, different delivery country — must not
  // collide on upsert (organization_id, record_id), or one country's
  // real numbers would silently overwrite the other's.
  assert.notEqual(iraqRow.recordId, pakistanRow.recordId);
  assert.equal(iraqRow.country, "IQ");
  assert.equal(pakistanRow.country, "PK");
  assert.equal(iraqRow.impressions, 100_000);
  assert.equal(pakistanRow.impressions, 80_000);
});

test("buildGroundTruthRecord marks EXACT_AUTHORIZED_META as the strongest label quality", () => {
  const row = buildGroundTruthRecord("act_123", {
    ad_id: "1",
    date_start: "2026-07-01",
    date_stop: "2026-07-07",
    impressions: "100000",
    reach: "40000",
    spend: "150",
    country: "IQ",
  });

  assert.equal(row.labelQuality, "EXACT_AUTHORIZED_META");
  assert.equal(row.labelStrength, "STRONG");
  assert.equal(row.isLabelAligned, true);
});

test("buildGroundTruthRecord flags a row as not aligned when reach or impressions are missing", () => {
  const row = buildGroundTruthRecord("act_123", {
    ad_id: "1",
    date_start: "2026-07-01",
    date_stop: "2026-07-07",
    impressions: "100000",
    // reach missing
    spend: "150",
    country: "IQ",
  });

  assert.equal(row.isLabelAligned, false);
});
