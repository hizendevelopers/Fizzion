import test from "node:test";
import assert from "node:assert/strict";

import { isWebAdvertisingRunActiveStatus } from "@/lib/web-ad-data";
import { inferWebDetectionSize } from "@/lib/web-analytics";
import { extractImageUrlFromHtml, normalizeWebScreenshotUrl } from "@/lib/web-screenshot-url";

test("isWebAdvertisingRunActiveStatus detects active crawl states safely", () => {
  assert.equal(isWebAdvertisingRunActiveStatus("queued"), false);
  assert.equal(isWebAdvertisingRunActiveStatus("RUNNING"), true);
  assert.equal(isWebAdvertisingRunActiveStatus(" processing "), true);
  assert.equal(isWebAdvertisingRunActiveStatus("completed"), false);
  assert.equal(isWebAdvertisingRunActiveStatus("failed"), false);
  assert.equal(isWebAdvertisingRunActiveStatus(null), false);
});

test("inferWebDetectionSize normalizes and derives creative size labels", () => {
  assert.equal(inferWebDetectionSize({ dimensions: "300x250" }), "300 × 250");
  assert.equal(inferWebDetectionSize({ size: "970 x 250" }), "970 × 250");
  assert.equal(inferWebDetectionSize({ metadata: { width: 728, height: 90 } }), "728 × 90");
  assert.equal(inferWebDetectionSize({ bounding_box: { w: 160, h: 600 } }), "160 × 600");
  assert.equal(inferWebDetectionSize({ ad_format: "Display Banner" }), null);
});

test("normalizeWebScreenshotUrl resolves Google image redirect parameters safely", () => {
  assert.equal(
    normalizeWebScreenshotUrl(
      "https://www.google.com/imgres?imgurl=https%3A%2F%2Fexample.com%2Fcreative.jpg&imgrefurl=https%3A%2F%2Fexample.com",
    ),
    "https://example.com/creative.jpg",
  );

  assert.equal(
    normalizeWebScreenshotUrl(
      "https://www.google.com/url?sa=i&url=https%3A%2F%2Fexample.com%2Flanding&imgurl=https%3A%2F%2Fcdn.example.com%2Fbanner.png",
    ),
    "https://cdn.example.com/banner.png",
  );
});

test("extractImageUrlFromHtml reads common social and open graph image metadata", () => {
  assert.equal(
    extractImageUrlFromHtml(
      '<html><head><meta property="og:image" content="/images/creative.webp"></head></html>',
      "https://example.com/landing",
    ),
    "https://example.com/images/creative.webp",
  );
});
