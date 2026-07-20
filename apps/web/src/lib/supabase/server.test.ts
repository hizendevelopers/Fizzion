import test from "node:test";
import assert from "node:assert/strict";

import {
  getOptionalSupabaseSecretKey,
  getSupabaseProjectId,
  getSupabaseUrl,
} from "@/lib/env";

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

test("optional supabase secret key stays null when no service key env is present", () => {
  const previousSecretKey = process.env.SUPABASE_SECRET_KEY;
  const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  assert.equal(getOptionalSupabaseSecretKey(), undefined);

  if (previousSecretKey === undefined) {
    delete process.env.SUPABASE_SECRET_KEY;
  } else {
    process.env.SUPABASE_SECRET_KEY = previousSecretKey;
  }

  if (previousServiceRoleKey === undefined) {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  } else {
    process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRoleKey;
  }
});
