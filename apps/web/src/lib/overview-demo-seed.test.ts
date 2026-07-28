import test from "node:test";
import assert from "node:assert/strict";

import {
  buildOverviewDemoCampaigns,
  buildOverviewDemoSpendSeeds,
  OVERVIEW_DEMO_BRANDS,
  OVERVIEW_DEMO_SEED_END,
  OVERVIEW_DEMO_SEED_START,
} from "@/lib/overview-demo-seed";

test("overview demo campaigns are deterministic and cover realistic last two years", () => {
  const first = buildOverviewDemoCampaigns();
  const second = buildOverviewDemoCampaigns();

  assert.deepEqual(first, second);
  assert.ok(first.length >= 30);
  assert.ok(first.length <= 60);

  for (const campaign of first) {
    assert.ok(OVERVIEW_DEMO_BRANDS.some((brand) => brand.name === campaign.brandName));
    if (campaign.status === "scheduled") {
      assert.ok(campaign.startDate > OVERVIEW_DEMO_SEED_END);
    } else {
      assert.ok(campaign.startDate >= OVERVIEW_DEMO_SEED_START);
      assert.ok(campaign.startDate <= OVERVIEW_DEMO_SEED_END);
    }
    if (campaign.endDate) {
      assert.ok(campaign.endDate >= campaign.startDate);
    }
    if (campaign.status === "completed") {
      assert.ok(campaign.endDate);
    }
  }
});

test("overview demo spend seeds are deterministic, non-uniform, and stay within the 24 month window", () => {
  const campaigns = buildOverviewDemoCampaigns();
  const first = buildOverviewDemoSpendSeeds(campaigns);
  const second = buildOverviewDemoSpendSeeds(campaigns);

  assert.deepEqual(first, second);
  assert.ok(first.length > 4000);
  assert.equal(new Set(first.map((row) => row.currency)).size, 1);
  assert.equal(first[0]?.currency, "USD");

  const uniqueAmounts = new Set(first.slice(0, 500).map((row) => row.amount));
  assert.ok(uniqueAmounts.size > 100);

  for (const row of first) {
    assert.ok(row.spendDate >= OVERVIEW_DEMO_SEED_START);
    assert.ok(row.spendDate <= OVERVIEW_DEMO_SEED_END);
    assert.ok(row.amount > 0);
  }
});
