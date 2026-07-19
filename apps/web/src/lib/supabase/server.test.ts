import test from "node:test";
import assert from "node:assert/strict";

import { getSupabaseProjectId } from "@/lib/env";

test("supabase project id fallback is stable", () => {
  assert.equal(getSupabaseProjectId(), "urhfqdjhecohdapynglm");
});

