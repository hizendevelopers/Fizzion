import test from "node:test";
import assert from "node:assert/strict";

import { APIFY_ACTORS, INSTAGRAM_CONTENT_FALLBACK_ACTORS } from "@/lib/apify/actors";
import { buildInstagramInput, buildInstagramLegacyInput } from "@/lib/apify/input-builders/instagram";

test("instagram primary actor uses requested posts scraper", () => {
  assert.equal(APIFY_ACTORS.instagram, "fcz9izasQrM1LD56D");
});

test("instagram posts actor input uses username-based scrape payload", () => {
  const input = buildInstagramInput(
    {
      platform: "instagram",
      originalInput: "@bulebarbie_official",
      normalizedUrl: "https://www.instagram.com/bulebarbie_official",
      username: "bulebarbie_official",
      handle: "bulebarbie_official",
      inputType: "handle",
    },
    25,
  );

  assert.deepEqual(input, {
    scrapeType: "posts",
    username: "bulebarbie_official",
    hashtag: "",
    keyword: "",
    maxResults: 25,
    minLikes: 0,
    includeVideos: true,
    includeComments: false,
  });
});

test("instagram fallback actor list preserves legacy scraper", () => {
  assert.deepEqual(INSTAGRAM_CONTENT_FALLBACK_ACTORS, ["shu8hvrXbJbY3Eb9W"]);
});

test("instagram legacy actor input uses direct profile urls", () => {
  const input = buildInstagramLegacyInput(
    {
      platform: "instagram",
      originalInput: "@bulebarbie_official",
      normalizedUrl: "https://www.instagram.com/bulebarbie_official",
      username: "bulebarbie_official",
      handle: "bulebarbie_official",
      inputType: "handle",
    },
    25,
  );

  assert.deepEqual(input, {
    resultsType: "posts",
    directUrls: ["https://www.instagram.com/bulebarbie_official"],
    resultsLimit: 25,
    searchType: "hashtag",
    searchLimit: 10,
    addParentData: true,
  });
});
