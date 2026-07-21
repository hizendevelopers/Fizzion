import test from "node:test";
import assert from "node:assert/strict";

import { listSocialProviderAvailability } from "@/lib/social-providers";

test("social provider availability reflects Apify-backed provider support", () => {
  const providers = listSocialProviderAvailability();

  assert.equal(providers.length >= 4, true);
  assert.equal(
    providers.every((provider) => provider.connectionMethod === "apify_scrape"),
    true,
  );
  assert.equal(
    providers.every((provider) => provider.actorId.length > 0),
    true,
  );
  assert.equal(
    providers.every((provider) => provider.available || provider.reasons.some((reason) => reason.includes("APIFY_API_TOKEN"))),
    true,
  );
});
