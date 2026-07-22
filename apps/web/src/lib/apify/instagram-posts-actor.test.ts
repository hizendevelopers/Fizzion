import test from "node:test";
import assert from "node:assert/strict";

import { APIFY_ACTORS } from "@/lib/apify/actors";
import { buildInstagramInput } from "@/lib/apify/input-builders/instagram";

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
