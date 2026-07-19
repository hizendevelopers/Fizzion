import test from "node:test";
import assert from "node:assert/strict";

import { cn } from "./utils";

test("cn joins truthy classes", () => {
  assert.equal(cn("alpha", undefined, "beta", false, "gamma"), "alpha beta gamma");
});

