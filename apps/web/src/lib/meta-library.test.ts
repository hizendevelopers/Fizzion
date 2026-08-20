import assert from "node:assert/strict";
import { test } from "vitest";

import {
  buildMetaAdsActorInput,
  DEFAULT_MAX_ADS,
  findMetricCandidates,
  normalizeMetaLibraryAd,
  normalizeMetaLibraryAds,
  parseMetaRange,
  sanitizeMaxAds,
  sanitizeRawRecord,
  validateMetaLibraryUrl,
} from "./meta-library";

const SOURCE = { actorRunId: "run-123", datasetId: "ds-456" };

function nikeFixture(): Record<string, unknown> {
  return {
    inputUrl:
      "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=nike&search_type=keyword_unordered",
    pageID: "15087023444",
    adArchiveID: "1249043200627555",
    startDateFormatted: "2026-03-17T07:00:00.000Z",
    endDateFormatted: "2026-08-08T07:00:00.000Z",
    adArchiveId: "1249043200627555",
    collationCount: 3,
    collationId: "col-1",
    pageId: "15087023444",
    snapshot: {
      pageName: "Nike",
      ctaText: "Shop now",
      ctaType: "SHOP_NOW",
      cards: [
        {
          body: "Celebrate your birthday with Nike.",
          linkDescription: "Unlock the latest from Nike & Jordan.",
          linkUrl: "https://www.nike.com/member/product-birthday",
          title: "Nike",
          ctaText: "Shop Now",
          originalImageUrl: "https://example.com/card-image.jpg",
        },
      ],
      body: { text: "Celebrate your birthday with Nike." },
      title: "Nike: Shoes, Apparel & Stories",
      linkDescription: "Unlock the latest from Nike & Jordan.",
      images: [{ originalImageUrl: "https://example.com/image.jpg" }],
      videos: [],
    },
    isActive: true,
    pageName: "Nike",
    impressionsWithIndex: {
      impressionsText: "175K - 200K",
      impressionsIndex: 7,
    },
    reachEstimate: "5K - 10K",
    currency: "USD",
    spend: "$3K - $3.5K",
    publisherPlatform: ["FACEBOOK", "INSTAGRAM", "AUDIENCE_NETWORK", "MESSENGER"],
    startDate: 1773730800,
    endDate: 1786172400,
    ad_details: {
      advertiser: {
        ad_library_page_info: {
          page_spend: {
            current_week: "$10K - $20K",
            is_political_page: false,
          },
        },
      },
    },
  };
}

test("sanitizeMaxAds clamps values safely", () => {
  assert.equal(sanitizeMaxAds(undefined), DEFAULT_MAX_ADS);
  assert.equal(sanitizeMaxAds(0), DEFAULT_MAX_ADS);
  assert.equal(sanitizeMaxAds(999), 500);
  assert.equal(sanitizeMaxAds(25), 25);
});

test("validateMetaLibraryUrl accepts a real Meta library URL and rejects bad hosts", () => {
  const valid = validateMetaLibraryUrl(
    "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=nike",
  );
  assert.equal(valid.ok, true);

  const invalid = validateMetaLibraryUrl("https://example.com/ads/library/?q=nike");
  assert.equal(invalid.ok, false);
});

test("buildMetaAdsActorInput preserves the Meta URL and uses details-per-ad mode", () => {
  const input = buildMetaAdsActorInput(
    "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=nike",
    250,
  );

  assert.deepEqual(input.startUrls, [
    {
      url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=nike",
    },
  ]);
  assert.equal(input.resultsLimit, 250);
  assert.equal(input.isDetailsPerAd, true);
  assert.equal(input.includeAboutPage, true);
  assert.equal(input.sorting, "");
});

test("parseMetaRange handles K/M ranges, comparators, and exact values", () => {
  assert.deepEqual(parseMetaRange("175K - 200K"), {
    raw: "175K - 200K",
    min: 175000,
    max: 200000,
  });
  assert.deepEqual(parseMetaRange("$3K - $3.5K"), {
    raw: "$3K - $3.5K",
    min: 3000,
    max: 3500,
  });
  assert.deepEqual(parseMetaRange(">1M"), {
    raw: ">1M",
    min: 1000000,
    max: null,
  });
  assert.deepEqual(parseMetaRange("<1K"), {
    raw: "<1K",
    min: null,
    max: 1000,
  });
});

test("findMetricCandidates discovers nested metric-like paths for debugging", () => {
  const candidates = findMetricCandidates({
    spend: "$3K - $3.5K",
    nested: {
      impressionsWithIndex: { impressionsText: "175K - 200K" },
      ad_details: { aaa_info: { eu_total_reach: 65623 } },
    },
  });

  assert.ok(candidates.some((candidate) => candidate.path === "spend"));
  assert.ok(candidates.some((candidate) => candidate.path === "nested.impressionsWithIndex"));
  assert.ok(candidates.some((candidate) => candidate.path === "nested.ad_details.aaa_info.eu_total_reach"));
});

test("normalizeMetaLibraryAd maps real Meta payload fields and keeps advertiser page_spend out of ad spend", () => {
  const ad = normalizeMetaLibraryAd(nikeFixture(), SOURCE);
  assert.ok(ad);

  assert.equal(ad?.adLibraryId, "1249043200627555");
  assert.equal(ad?.pageName, "Nike");
  assert.equal(ad?.status, "ACTIVE");
  assert.equal(ad?.cta, "Shop now");
  assert.equal(ad?.spend.raw, "$3K - $3.5K");
  assert.equal(ad?.spend.min, 3000);
  assert.equal(ad?.spend.max, 3500);
  assert.equal(ad?.spend.currency, "USD");
  assert.equal(ad?.spend.path, "spend");
  assert.equal(ad?.impressions.raw, "175K - 200K");
  assert.equal(ad?.impressions.path, "impressionsWithIndex.impressionsText");
  assert.equal(ad?.audienceSize.raw, "5K - 10K");
  assert.equal(ad?.audienceSize.path, "reachEstimate");
  assert.equal(ad?.creative.type, "image");
  assert.equal(ad?.creative.imageUrls[0], "https://example.com/image.jpg");
  assert.equal(ad?.adLibraryUrl, "https://www.facebook.com/ads/library/?id=1249043200627555");

  const raw = ad?.rawMetaData as Record<string, unknown>;
  const details = raw.ad_details as Record<string, unknown>;
  const advertiser = details.advertiser as Record<string, unknown>;
  const pageInfo = advertiser.ad_library_page_info as Record<string, unknown>;
  const pageSpend = pageInfo.page_spend as Record<string, unknown>;
  assert.equal(pageSpend.current_week, "$10K - $20K");
});

test("normalizeMetaLibraryAd uses ad_details.aaa_info.eu_total_reach as real audience when top-level reach is missing", () => {
  const fixture = nikeFixture();
  fixture.reachEstimate = null;
  fixture.ad_details = {
    aaa_info: {
      eu_total_reach: 65623,
    },
  };

  const ad = normalizeMetaLibraryAd(fixture, SOURCE);
  assert.ok(ad);
  assert.equal(ad?.audienceSize.min, 65623);
  assert.equal(ad?.audienceSize.max, 65623);
  assert.equal(ad?.audienceSize.path, "ad_details.aaa_info.eu_total_reach");
});

test("normalizeMetaLibraryAd never treats the advertiser page's total like count as ad-level reactions", () => {
  // Confirmed against a real Apify payload: snapshot.pageLikeCount is
  // the advertiser PAGE's total fan count (e.g. ~107M for a large
  // global brand), not engagement on one specific ad. Using it as a
  // "reactions" fallback previously produced a multi-billion-impression
  // estimate from the engagement cross-check model.
  const fixture = nikeFixture();
  (fixture.snapshot as Record<string, unknown>).pageLikeCount = 107_072_530;

  const ad = normalizeMetaLibraryAd(fixture, SOURCE);
  assert.ok(ad);
  assert.equal(ad?.engagement.reactions, null);
});

test("normalizeMetaLibraryAds deduplicates exact duplicate rows by primary ad id", () => {
  const normalized = normalizeMetaLibraryAds([nikeFixture(), nikeFixture()], SOURCE);
  assert.equal(normalized.rawCount, 2);
  assert.equal(normalized.ads.length, 1);
});

test("normalizeMetaLibraryAd keeps missing metrics in CHECKING instead of converting them to zero", () => {
  const fixture = nikeFixture();
  fixture.spend = null;
  fixture.currency = "";
  fixture.impressionsWithIndex = {
    impressionsText: null,
    impressionsIndex: -1,
  };
  fixture.reachEstimate = null;
  fixture.ad_details = {};

  const ad = normalizeMetaLibraryAd(fixture, SOURCE);
  assert.ok(ad);
  assert.equal(ad?.spend.status, "CHECKING");
  assert.equal(ad?.spend.min, null);
  assert.equal(ad?.impressions.status, "CHECKING");
  assert.equal(ad?.audienceSize.status, "CHECKING");
});

test("sanitizeRawRecord redacts secrets without removing public payload fields", () => {
  const sanitized = sanitizeRawRecord({
    pageName: "Nike",
    cookies: "secret-cookie",
    authorization: "Bearer abc",
    nested: {
      access_token: "token",
      publicField: "keep me",
    },
  });

  assert.equal(sanitized.pageName, "Nike");
  assert.equal(sanitized.cookies, "[REDACTED]");
  assert.equal(sanitized.authorization, "[REDACTED]");
  assert.equal((sanitized.nested as Record<string, unknown>).access_token, "[REDACTED]");
  assert.equal((sanitized.nested as Record<string, unknown>).publicField, "keep me");
});
