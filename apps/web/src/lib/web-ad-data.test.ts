import test from "node:test";
import assert from "node:assert/strict";

import { isWebAdvertisingRunActiveStatus } from "@/lib/web-ad-data";

test("isWebAdvertisingRunActiveStatus detects active crawl states safely", () => {
  assert.equal(isWebAdvertisingRunActiveStatus("queued"), true);
  assert.equal(isWebAdvertisingRunActiveStatus("RUNNING"), true);
  assert.equal(isWebAdvertisingRunActiveStatus(" processing "), true);
  assert.equal(isWebAdvertisingRunActiveStatus("completed"), false);
  assert.equal(isWebAdvertisingRunActiveStatus("failed"), false);
  assert.equal(isWebAdvertisingRunActiveStatus(null), false);
});
