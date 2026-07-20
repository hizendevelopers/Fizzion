import test from "node:test";
import assert from "node:assert/strict";

import { getSupabaseProjectId, getSupabaseUrl } from "@/lib/env";

test("supabase project id fallback is stable", () => {
  assert.equal(getSupabaseProjectId(), "urhfqdjhecohdapynglm");
});

test("supabase url falls back to the project id when the direct url env is missing", () => {
  const previousPublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousServerUrl = process.env.SUPABASE_URL;
  const previousProjectId = process.env.SUPABASE_PROJECT_ID;

  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_URL;
  process.env.SUPABASE_PROJECT_ID = "urhfqdjhecohdapynglm";

  assert.equal(getSupabaseUrl(), "https://urhfqdjhecohdapynglm.supabase.co");

  if (previousPublicUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = previousPublicUrl;
  }

  if (previousServerUrl === undefined) {
    delete process.env.SUPABASE_URL;
  } else {
    process.env.SUPABASE_URL = previousServerUrl;
  }

  if (previousProjectId === undefined) {
    delete process.env.SUPABASE_PROJECT_ID;
  } else {
    process.env.SUPABASE_PROJECT_ID = previousProjectId;
  }
});
