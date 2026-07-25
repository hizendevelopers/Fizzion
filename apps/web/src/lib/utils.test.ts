import test from "node:test";
import assert from "node:assert/strict";

import { cn } from "./utils";
import { convertAmountToUsd, formatCompactUsdFromCurrency, formatUsdFromCurrency } from "./display-currency";
import {
  buildTvRecordingFilename,
  calculateContextWindow,
  detectBoundaryCrossing,
  isSourceAuthorizedForRecording,
} from "./tv-utils";

test("cn joins truthy classes", () => {
  assert.equal(cn("alpha", undefined, "beta", false, "gamma"), "alpha beta gamma");
});

test("calculateContextWindow returns full context when boundaries are available", () => {
  const result = calculateContextWindow({
    adStartMs: 20_000,
    adEndMs: 50_000,
    segmentStartMs: 0,
    segmentEndMs: 80_000,
  });

  assert.equal(result.contextStartMs, 15_000);
  assert.equal(result.contextEndMs, 55_000);
  assert.equal(result.exactAdStartOffsetMs, 5_000);
  assert.equal(result.exactAdEndOffsetMs, 35_000);
  assert.equal(result.contextStatus, "full");
});

test("calculateContextWindow returns partial context near segment edges", () => {
  const result = calculateContextWindow({
    adStartMs: 2_000,
    adEndMs: 29_000,
    segmentStartMs: 0,
    segmentEndMs: 31_000,
  });

  assert.equal(result.preContextMs, 2_000);
  assert.equal(result.postContextMs, 2_000);
  assert.equal(result.contextStatus, "partial");
});

test("buildTvRecordingFilename formats Baghdad timestamps", () => {
  assert.equal(
    buildTvRecordingFilename("ary-news", "2026-07-19T13:40:00.000Z"),
    "ary-news__2026-07-19__16-40-00__Asia-Baghdad.ts",
  );
});

test("isSourceAuthorizedForRecording enforces approved status and permissions", () => {
  assert.equal(
    isSourceAuthorizedForRecording({
      authorizationStatus: "approved",
      permittedMonitoring: true,
      permittedRecording: true,
      permittedClipping: true,
      validFrom: "2026-07-01T00:00:00.000Z",
      validUntil: "2026-08-01T00:00:00.000Z",
    }, new Date("2026-07-19T00:00:00.000Z")),
    true,
  );

  assert.equal(
    isSourceAuthorizedForRecording({
      authorizationStatus: "pending",
      permittedMonitoring: true,
      permittedRecording: true,
      permittedClipping: true,
    }),
    false,
  );
});

test("detectBoundaryCrossing identifies ads spanning segment edges", () => {
  assert.equal(detectBoundaryCrossing(44_800, 45_180, 45_000), true);
  assert.equal(detectBoundaryCrossing(10_000, 20_000, 45_000), false);
});

test("display currency helpers convert PKR and IQD values into USD labels", () => {
  assert.equal(formatUsdFromCurrency(277.67, "PKR"), "$1");
  assert.equal(formatUsdFromCurrency(1310.17, "IQD"), "$1");
  assert.equal(convertAmountToUsd(555.34, "PKR"), 2);
  assert.equal(formatCompactUsdFromCurrency(2776700, "PKR"), "$10K");
});
