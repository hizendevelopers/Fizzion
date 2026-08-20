import { test } from "vitest";
import assert from "node:assert/strict";

import {
  calculateEngagementRateByFollowers,
  calculateEngagementRateByReach,
  calculateFollowerGrowthRate,
  calculateNormalizedEngagements,
  classifySentiment,
  normalizeSocialAccountInput,
} from "./social-utils";

test("normalizeSocialAccountInput handles platform urls and handles", () => {
  const instagram = normalizeSocialAccountInput("instagram", "@cocacolairaq");
  assert.equal(instagram.normalizedHandle, "cocacolairaq");
  assert.equal(instagram.normalizedUrl, "https://instagram.com/cocacolairaq");

  const youtube = normalizeSocialAccountInput("youtube", "channel/UC123");
  assert.equal(youtube.normalizedHandle, "UC123");
  assert.equal(youtube.normalizedUrl, "https://youtube.com/channel/UC123");
});

test("social engagement formulas remain deterministic", () => {
  assert.equal(
    calculateNormalizedEngagements({ likes: 10, comments: 5, shares: 3, saves: 2 }),
    20,
  );
  assert.equal(
    Number(calculateEngagementRateByFollowers({ engagements: 20, followers: 200 })?.toFixed(2)),
    10,
  );
  assert.equal(
    Number(calculateEngagementRateByReach({ engagements: 20, reach: 100 })?.toFixed(2)),
    20,
  );
  assert.equal(
    Number(calculateFollowerGrowthRate({ followersStart: 1000, followersEnd: 1100 })?.toFixed(2)),
    10,
  );
});

test("classifySentiment keeps a clear positive neutral negative split", () => {
  assert.equal(classifySentiment("Love this amazing drink"), "positive");
  assert.equal(classifySentiment("This was the worst"), "negative");
  assert.equal(classifySentiment("Can you share more details?"), "neutral");
});
