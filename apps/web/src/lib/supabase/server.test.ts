import test from "node:test";
import assert from "node:assert/strict";

import {
  getOptionalSupabaseSecretKey,
  getSupabaseProjectId,
  getSupabasePublishableKey,
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

test("optional supabase secret key can resolve from server env files when process env is missing", () => {
  const previousSecretKey = process.env.SUPABASE_SECRET_KEY;
  const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  assert.equal(typeof getOptionalSupabaseSecretKey(), "string");

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

test("supabase publishable key falls back to the project default when env aliases are missing", () => {
  const previousPublicPublishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const previousPublicAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const previousPublicKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
  const previousServerPublishable = process.env.SUPABASE_PUBLISHABLE_KEY;
  const previousServerAnon = process.env.SUPABASE_ANON_KEY;
  const previousServerKey = process.env.SUPABASE_KEY;

  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_KEY;
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_KEY;

  assert.equal(
    getSupabasePublishableKey(),
    "sb_publishable_DnSUdzVV1z24mMrG-IvxNA_dW223WKV",
  );

  if (previousPublicPublishable === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousPublicPublishable;
  }

  if (previousPublicAnon === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousPublicAnon;
  }

  if (previousPublicKey === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_KEY;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_KEY = previousPublicKey;
  }

  if (previousServerPublishable === undefined) {
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
  } else {
    process.env.SUPABASE_PUBLISHABLE_KEY = previousServerPublishable;
  }

  if (previousServerAnon === undefined) {
    delete process.env.SUPABASE_ANON_KEY;
  } else {
    process.env.SUPABASE_ANON_KEY = previousServerAnon;
  }

  if (previousServerKey === undefined) {
    delete process.env.SUPABASE_KEY;
  } else {
    process.env.SUPABASE_KEY = previousServerKey;
  }
});
