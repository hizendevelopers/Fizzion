import test from "node:test";
import assert from "node:assert/strict";

import { listSocialProviderAvailability } from "@/lib/social-providers";

test("social provider availability does not advertise unimplemented live OAuth providers", () => {
  const providers = listSocialProviderAvailability();

  assert.equal(providers.length >= 4, true);
  assert.equal(providers.some((provider) => provider.available), false);
  assert.equal(
    providers.every((provider) => provider.reasons.some((reason) => reason.includes("Official token exchange"))),
    true,
  );
});
