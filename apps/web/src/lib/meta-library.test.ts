import { test } from "node:test";
import assert from "node:assert/strict";

import {
  sanitizeMaxResults,
  buildMetaLibraryRunOptions,
  buildMetaLibraryActorInput,
  DEFAULT_MAX_RESULTS,
  MIN_MAX_RESULTS,
  MAX_MAX_RESULTS,
} from "./meta-library";

test("sanitizeMaxResults: missing/undefined => default (50)", () => {
  assert.equal(sanitizeMaxResults(undefined), DEFAULT_MAX_RESULTS);
  assert.equal(sanitizeMaxResults(null), DEFAULT_MAX_RESULTS);
});

test("sanitizeMaxResults: 0 => default (50)", () => {
  assert.equal(sanitizeMaxResults(0), DEFAULT_MAX_RESULTS);
});

test("sanitizeMaxResults: empty string => default (50)", () => {
  assert.equal(sanitizeMaxResults(""), DEFAULT_MAX_RESULTS);
});

test("sanitizeMaxResults: NaN => default (50)", () => {
  assert.equal(sanitizeMaxResults(Number.NaN), DEFAULT_MAX_RESULTS);
});

test("sanitizeMaxResults: negative => default (50)", () => {
  assert.equal(sanitizeMaxResults(-5), DEFAULT_MAX_RESULTS);
});

test("sanitizeMaxResults: below min => min (10)", () => {
  assert.equal(sanitizeMaxResults(3), MIN_MAX_RESULTS);
  assert.equal(sanitizeMaxResults("4"), MIN_MAX_RESULTS);
});

test("sanitizeMaxResults: valid value passes through", () => {
  assert.equal(sanitizeMaxResults(25), 25);
  assert.equal(sanitizeMaxResults("25"), 25);
});

test("sanitizeMaxResults: above max clamps to max (500)", () => {
  assert.equal(sanitizeMaxResults(9999), MAX_MAX_RESULTS);
  assert.equal(sanitizeMaxResults("1000"), MAX_MAX_RESULTS);
});

test("sanitizeMaxResults: always returns a positive integer", () => {
  for (const value of [0, -1, NaN, null, undefined, "", "abc", 3.9, 9999]) {
    const result = sanitizeMaxResults(value);
    assert.ok(Number.isInteger(result), `expected integer for ${String(value)}`);
    assert.ok(result > 0, `expected positive for ${String(value)}`);
    assert.ok(result >= MIN_MAX_RESULTS && result <= MAX_MAX_RESULTS);
  }
});

test("buildMetaLibraryRunOptions: maxItems is always positive", () => {
  const options = buildMetaLibraryRunOptions(0);
  assert.ok(options.maxItems > 0);
  assert.equal(options.maxItems, DEFAULT_MAX_RESULTS);
  assert.ok(options.waitForFinish > 0);
});

test("buildMetaLibraryActorInput: includes positive maxResults field", () => {
  const input = buildMetaLibraryActorInput({ searchQuery: "nike" }, 0);
  assert.equal(input.maxResults, DEFAULT_MAX_RESULTS);
  assert.equal(input.country, "US");
  assert.equal(input.searchQuery, "nike");
  assert.equal(input.activeStatus, "active");
  assert.equal(input.adType, "all");
  assert.equal(input.mediaType, "all");
  assert.equal(input.sortMode, "total_impressions");
  assert.equal(input.sortDirection, "desc");
  assert.equal(input.maxConcurrency, 1);
  assert.equal(input.requestHandlerTimeoutSecs, 900);
});
