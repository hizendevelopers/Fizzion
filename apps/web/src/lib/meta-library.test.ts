import { test } from "node:test";
import assert from "node:assert/strict";

import {
  sanitizeMaxResults,
  buildMetaLibraryRunOptions,
  buildMetaLibraryActorInput,
  DEFAULT_MAX_RESULTS,
  MIN_MAX_RESULTS,
  MAX_MAX_RESULTS,
  extractAdvertisementRows,
  isAdvertisementRow,
  normalizeMetaLibraryAds,
  normalizeMetaLibraryAd,
  sanitizeRawRecord,
  readDate,
  readRange,
  readStringArray,
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

test("buildMetaLibraryRunOptions: only contains maxItems, never waitForFinish", () => {
  const options = buildMetaLibraryRunOptions(0);
  assert.ok(options.maxItems > 0);
  assert.equal(options.maxItems, DEFAULT_MAX_RESULTS);
  assert.deepEqual(Object.keys(options), ["maxItems"]);
  assert.ok(!("waitForFinish" in options));
  assert.ok(!("waitSecs" in options));
  assert.ok(!("timeout" in options));
  assert.ok(!("memory" in options));
  assert.ok(!("maxTotalChargeUsd" in options));
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

test("buildMetaLibraryActorInput: never contains Apify run options as input fields", () => {
  const input = buildMetaLibraryActorInput({ searchQuery: "nike" }, 25);
  for (const forbidden of ["waitForFinish", "waitSecs", "timeout", "memory", "maxTotalChargeUsd"]) {
    assert.ok(!(forbidden in input), `Actor input must not contain ${forbidden}`);
  }
  assert.equal(input.maxResults, 25);
});

/* -------------------------------------------------------------------------- */
/* Advertisement-row extraction & detection.                                   */
/* -------------------------------------------------------------------------- */

const SOURCE = { actorRunId: "run-123", datasetId: "ds-456" };

function nestedAdFixture() {
  return {
    advertiser: {
      id: "advertiser-1",
      name: "Nike Inc",
      profileImageUrl: "https://example.com/nike.png",
    },
    creative: {
      id: "creative-1",
      body: "Just do it. New collection.",
      title: "Nike Air Max",
      description: "Shop the new Nike Air Max collection.",
      imageUrl: "https://example.com/nike-ad.jpg",
      videoUrl: null,
    },
    snapshot: {
      id: "snapshot-1",
      pageId: "page-987",
      pageName: "Nike",
      startDate: "2024-01-01T00:00:00Z",
      endDate: "2024-06-01T00:00:00Z",
      publisherPlatforms: ["facebook", "instagram"],
      spend: { lowerBound: 1000, upperBound: 5000, currency: "USD" },
      impressions: { lowerBound: 10000, upperBound: 50000 },
      audienceSize: { lowerBound: 100000, upperBound: 500000 },
      body: {
        text: "Just do it. New collection.",
      },
      adActiveStatus: "active",
      adLibraryUrl: "https://www.facebook.com/ads/library/?id=12345",
    },
    ad: {
      id: "ad-777",
      startDate: "2024-01-01T00:00:00Z",
      endDate: "2024-06-01T00:00:00Z",
    },
  };
}

test("isAdvertisementRow: accepts a real nested ad row", () => {
  assert.equal(isAdvertisementRow(nestedAdFixture()), true);
});

test("isAdvertisementRow: rejects a metadata/status-only row", () => {
  assert.equal(
    isAdvertisementRow({ status: "SUCCEEDED", message: "done", input: {}, count: 5 }),
    false,
  );
});

test("extractAdvertisementRows: flattens nested ad rows and rejects metadata rows", () => {
  const rawItems = [
    { status: "SUCCEEDED", message: "done", count: 2 },
    { data: { ads: [nestedAdFixture()] } },
    { results: [{ node: nestedAdFixture() }, { status: "partial" }] },
    { ad: { id: "ad-888", pageName: "Adidas", startDate: "2024-01-01" } },
  ];

  const rows = extractAdvertisementRows(rawItems);
  assert.ok(rows.length >= 3, `expected at least 3 rows, got ${rows.length}`);
});

test("normalizeMetaLibraryAds: maps nested advertiser/creative/snapshot fields", () => {
  const { ads } = normalizeMetaLibraryAds([nestedAdFixture()], SOURCE);

  assert.equal(ads.length, 1);
  const ad = ads[0];

  assert.equal(ad.id, "ad-777");
  assert.equal(ad.advertiser.name, "Nike Inc");
  assert.equal(ad.advertiser.id, "advertiser-1");
  assert.equal(ad.advertiser.profileImageUrl, "https://example.com/nike.png");
  assert.equal(ad.creative.body, "Just do it. New collection.");
  assert.equal(ad.creative.title, "Nike Air Max");
  assert.equal(ad.creative.description, "Shop the new Nike Air Max collection.");
  assert.equal(ad.status, "ACTIVE");
  assert.deepEqual(ad.platforms, ["facebook", "instagram"]);
  assert.equal(ad.startDate, "2024-01-01T00:00:00.000Z");
  assert.equal(ad.endDate, "2024-06-01T00:00:00.000Z");
  assert.equal(ad.spend?.lowerBound, 1000);
  assert.equal(ad.spend?.upperBound, 5000);
  assert.equal(ad.spend?.currency, "USD");
  assert.equal(ad.impressions?.lowerBound, 10000);
  assert.equal(ad.impressions?.upperBound, 50000);
  assert.equal(ad.audienceSize?.lowerBound, 100000);
  assert.equal(ad.audienceSize?.upperBound, 500000);
  assert.equal(ad.source.actorRunId, "run-123");
  assert.equal(ad.source.datasetId, "ds-456");
});

test("normalizeMetaLibraryAds: handles a flat camelCase record", () => {
  const flat = {
    libraryID: "flat-1",
    brand: "Coca-Cola",
    body: "Taste the feeling",
    linkTitle: "Coca-Cola Zero",
    linkDescription: "Real magic.",
    brandLogo: "https://example.com/logo.png",
    platforms: ["facebook"],
    active: false,
    startDate: "1698796800",
    endDate: "2026-08-08T07:00:00.000Z",
    format: "image",
    ctaText: "Shop now",
    ctaUrl: "https://example.com/shop",
    sourceUrl: "https://www.facebook.com/ads/library/?country=US&q=coke",
    images: [{ url: "https://example.com/ad.jpg" }],
    totalPlatforms: 1,
    similarAdCount: 3,
    multipleVersions: true,
    scrapeDate: "2026-08-08T15:58:10.940Z",
  };

  const { ads } = normalizeMetaLibraryAds([flat], SOURCE);
  assert.equal(ads.length, 1);
  const ad = ads[0];
  assert.equal(ad.id, "flat-1");
  assert.equal(ad.advertiser.name, "Coca-Cola");
  assert.equal(ad.advertiser.profileImageUrl, "https://example.com/logo.png");
  assert.equal(ad.creative.body, "Taste the feeling");
  assert.equal(ad.creative.title, "Coca-Cola Zero");
  assert.equal(ad.creative.description, "Real magic.");
  assert.equal(ad.status, "INACTIVE");
  assert.equal(ad.startDate, "2023-11-01T00:00:00.000Z");
  assert.equal(ad.endDate, "2026-08-08T07:00:00.000Z");
  assert.equal(ad.format, "image");
  assert.equal(ad.callToAction?.text, "Shop now");
  assert.equal(ad.callToAction?.url, "https://example.com/shop");
  assert.equal(ad.adLibraryUrl, "https://www.facebook.com/ads/library/?id=flat-1");
  assert.equal(ad.sourceUrl, "https://www.facebook.com/ads/library/?country=US&q=coke");
  assert.equal(ad.scrapedAt, "2026-08-08T15:58:10.940Z");
  assert.equal(ad.totalPlatforms, 1);
  assert.equal(ad.similarAdCount, 3);
  assert.equal(ad.multipleVersions, true);
  assert.deepEqual(ad.creative.imageUrls, ["https://example.com/ad.jpg", "https://example.com/logo.png"]);
});

test("normalizeMetaLibraryAds: deduplicates by id", () => {
  const { ads } = normalizeMetaLibraryAds([nestedAdFixture(), nestedAdFixture()], SOURCE);
  assert.equal(ads.length, 1);
});

test("normalizeMetaLibraryAds: accepts a wrapper object with .items", () => {
  const { ads } = normalizeMetaLibraryAds({ items: [nestedAdFixture()] }, SOURCE);
  assert.equal(ads.length, 1);
});

test("normalizeMetaLibraryAds: product of empty input is empty", () => {
  const { ads, rawCount, extractedCount } = normalizeMetaLibraryAds([], SOURCE);
  assert.equal(ads.length, 0);
  assert.equal(rawCount, 0);
  assert.equal(extractedCount, 0);
});

test("normalizeMetaLibraryAd: null transparency stays null (never guessed)", () => {
  const ad = normalizeMetaLibraryAd({ id: "x", pageName: "Brand" }, SOURCE);
  assert.equal(ad.spend, null);
  assert.equal(ad.impressions, null);
  assert.equal(ad.audienceSize, null);
  assert.equal(ad.advertiser.name, "Brand");
  assert.equal(ad.creative.body, null);
});

test("sanitizeRawRecord: redacts tokens and cookies", () => {
  const scrubbed = sanitizeRawRecord({
    pageName: "Nike",
    cookies: "session=abc123",
    apifyToken: "apify_API_secret_123",
    nested: { access_token: "sha256:deadbeef" },
  });
  assert.equal(scrubbed.pageName, "Nike");
assert.equal(scrubbed.cookies, "[REDACTED]");
  assert.equal(scrubbed.apifyToken, "[REDACTED]");
  assert.equal((scrubbed.nested as Record<string, unknown>).access_token, "[REDACTED]");
});

test("readDate: parses ISO string and unix seconds", () => {
  assert.equal(readDate("2024-01-01T00:00:00Z"), "2024-01-01T00:00:00.000Z");
  assert.equal(readDate(1698796800), "2023-11-01T00:00:00.000Z");
  assert.equal(readDate(null), null);
});

test("readRange: parses bound objects and single values", () => {
  assert.deepEqual(readRange({ lowerBound: 1, upperBound: 5 }), { lowerBound: 1, upperBound: 5 });
  assert.deepEqual(readRange({ lower: 10, upper: 20 }), { lowerBound: 10, upperBound: 20 });
  assert.deepEqual(readRange({ USD: { lowerBound: 100, upperBound: 200 } }), {
    lowerBound: 100,
    upperBound: 200,
  });
  assert.deepEqual(readRange({ value: 99 }), { lowerBound: 99, upperBound: 99 });
  assert.equal(readRange(null), null);
});

test("readStringArray: accepts string, array, and comma-separated", () => {
  assert.deepEqual(readStringArray("facebook,instagram"), ["facebook", "instagram"]);
  assert.deepEqual(readStringArray(["facebook", "instagram"]), ["facebook", "instagram"]);
  assert.deepEqual(readStringArray("facebook"), ["facebook"]);
  assert.deepEqual(readStringArray(null), []);
});
