import { test } from "vitest";
import assert from "node:assert/strict";

import {
  buildWebDemoCampaigns,
  buildWebDemoDetectionSeeds,
  buildWebDemoScreenshotSeeds,
  buildWebDemoSpendSeeds,
  WEB_DEMO_WEBSITES,
} from "@/lib/web-demo-seed";
import { OVERVIEW_DEMO_SEED_END, OVERVIEW_DEMO_SEED_START } from "@/lib/overview-demo-seed";

test("web demo campaigns are deterministic and cover realistic last two years", () => {
  const first = buildWebDemoCampaigns();
  const second = buildWebDemoCampaigns();

  assert.deepEqual(first, second);
  assert.ok(first.length >= 30);
  assert.ok(first.length <= 60);

  for (const campaign of first) {
    assert.ok(campaign.startDate >= OVERVIEW_DEMO_SEED_START);
    assert.ok(campaign.startDate <= OVERVIEW_DEMO_SEED_END);
    if (campaign.endDate) {
      assert.ok(campaign.endDate >= campaign.startDate);
    }
    assert.ok(campaign.websiteDomains.length >= 2);
    assert.ok(campaign.websiteDomains.every((domain) => WEB_DEMO_WEBSITES.some((website) => website.domain === domain)));
  }
});

test("web demo spend, screenshots, and detections are deterministic and within seeded range", () => {
  const campaigns = buildWebDemoCampaigns();
  const spendFirst = buildWebDemoSpendSeeds(campaigns);
  const spendSecond = buildWebDemoSpendSeeds(campaigns);
  const screenshotsFirst = buildWebDemoScreenshotSeeds();
  const screenshotsSecond = buildWebDemoScreenshotSeeds();
  const detectionsFirst = buildWebDemoDetectionSeeds(campaigns);
  const detectionsSecond = buildWebDemoDetectionSeeds(campaigns);

  assert.deepEqual(spendFirst, spendSecond);
  assert.deepEqual(screenshotsFirst, screenshotsSecond);
  assert.deepEqual(detectionsFirst, detectionsSecond);

  assert.ok(spendFirst.length > 2000);
  assert.ok(screenshotsFirst.length > 1500);
  assert.ok(detectionsFirst.length > 1000);

  for (const row of spendFirst) {
    assert.ok(row.spendDate >= OVERVIEW_DEMO_SEED_START);
    assert.ok(row.spendDate <= OVERVIEW_DEMO_SEED_END);
    assert.ok(row.amount > 0);
  }

  for (const row of screenshotsFirst) {
    const date = row.capturedAt.slice(0, 10);
    assert.ok(date >= OVERVIEW_DEMO_SEED_START);
    assert.ok(date <= OVERVIEW_DEMO_SEED_END);
    assert.ok(WEB_DEMO_WEBSITES.some((website) => website.domain === row.websiteDomain));
  }

  for (const row of detectionsFirst) {
    const date = row.detectedAt.slice(0, 10);
    assert.ok(date >= OVERVIEW_DEMO_SEED_START);
    assert.ok(date <= OVERVIEW_DEMO_SEED_END);
    assert.ok(row.spendAmount > 0);
  }
});
