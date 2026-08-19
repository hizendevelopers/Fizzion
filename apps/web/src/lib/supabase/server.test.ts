import { afterEach, beforeEach, test } from "vitest";
import assert from "node:assert/strict";

import {
  __setEnvFileCacheForTests,
  getOptionalSupabaseSecretKey,
  getSupabaseProjectId,
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/env";

// These env accessors intentionally have NO hardcoded fallback credential
// (see the security audit: a hardcoded fallback previously pointed every
// unconfigured environment at the same live Supabase project). They read
// from process.env first, then — as a local dev convenience — from a
// .env.local/.env file on disk, cached at module scope. Each test pins
// that file-fallback cache to `{}` via __setEnvFileCacheForTests, so
// these tests exercise only process.env and behave identically whether
// or not a real .env.local happens to exist on the machine running them.

const MANAGED_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PROJECT_URL",
  "SUPABASE_PROJECT_ID",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {};
  for (const key of MANAGED_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  __setEnvFileCacheForTests({});
});

afterEach(() => {
  for (const key of MANAGED_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
  __setEnvFileCacheForTests(null);
});

test("supabase url resolves directly from NEXT_PUBLIC_SUPABASE_URL", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example-project.supabase.co";
  assert.equal(getSupabaseUrl(), "https://example-project.supabase.co");
});

test("supabase url falls back to building one from the project id", () => {
  process.env.SUPABASE_PROJECT_ID = "abcxyz123456";
  assert.equal(getSupabaseUrl(), "https://abcxyz123456.supabase.co");
});

test("supabase url throws a clear error when nothing is configured", () => {
  assert.throws(() => getSupabaseUrl(), /not configured/i);
});

test("supabase project id resolves from SUPABASE_PROJECT_ID", () => {
  process.env.SUPABASE_PROJECT_ID = "my-project-id";
  assert.equal(getSupabaseProjectId(), "my-project-id");
});

test("supabase publishable key resolves from any of its aliases", () => {
  process.env.SUPABASE_ANON_KEY = "anon-key-value";
  assert.equal(getSupabasePublishableKey(), "anon-key-value");
});

test("supabase publishable key throws a clear error when nothing is configured", () => {
  assert.throws(() => getSupabasePublishableKey(), /not configured/i);
});

test("optional supabase secret key returns undefined when unset, without throwing", () => {
  assert.equal(getOptionalSupabaseSecretKey(), undefined);
});

test("optional supabase secret key resolves once configured", () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-value";
  assert.equal(getOptionalSupabaseSecretKey(), "service-role-value");
});
