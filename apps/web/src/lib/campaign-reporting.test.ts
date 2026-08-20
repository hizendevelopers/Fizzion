import assert from "node:assert/strict";
import { test } from "vitest";

import {
  CAMPAIGN_REPORT_WINDOW_END,
  CAMPAIGN_REPORT_WINDOW_START,
  isCampaignRelevantToWindow,
} from "@/lib/campaign-reporting";

test("campaign reporting window includes active campaigns and historical overlap", () => {
  assert.equal(
    isCampaignRelevantToWindow({
      startDate: "2026-06-01",
      endDate: null,
      status: "active",
    }),
    true,
  );

  assert.equal(
    isCampaignRelevantToWindow({
      startDate: "2024-08-10",
      endDate: "2024-11-15",
      status: "completed",
    }),
    true,
  );

  assert.equal(
    isCampaignRelevantToWindow({
      startDate: "2023-01-01",
      endDate: "2024-01-10",
      status: "completed",
    }),
    false,
  );
});

test("campaign reporting window constants span the last two years", () => {
  assert.equal(CAMPAIGN_REPORT_WINDOW_START, "2024-07-25");
  assert.equal(CAMPAIGN_REPORT_WINDOW_END, "2026-07-25");
});
