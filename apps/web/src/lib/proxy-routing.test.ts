import { test } from "vitest";
import assert from "node:assert/strict";

import { isAdminPath, isPublicPath } from "./proxy-routing";

test("login, password reset, and invite pages are public", () => {
  assert.equal(isPublicPath("/login"), true);
  assert.equal(isPublicPath("/forgot-password"), true);
  assert.equal(isPublicPath("/set-password"), true);
  assert.equal(isPublicPath("/mfa"), true);
  assert.equal(isPublicPath("/auth/callback"), true);
});

test("social webhooks, the YouTube cron sync, and health checks are public", () => {
  assert.equal(isPublicPath("/api/social/webhooks/facebook"), true);
  assert.equal(isPublicPath("/api/tv/youtube/channels/scheduled-sync"), true);
  assert.equal(isPublicPath("/api/health/supabase"), true);
});

test("every other page and API route requires a session", () => {
  assert.equal(isPublicPath("/"), false);
  assert.equal(isPublicPath("/executive-overview"), false);
  assert.equal(isPublicPath("/meta-library"), false);
  assert.equal(isPublicPath("/api/meta-ads/scrape"), false);
  assert.equal(isPublicPath("/api/social/connections"), false);
  // A path merely starting with a public prefix's name but not matching
  // it exactly/by-prefix should not be treated as public.
  assert.equal(isPublicPath("/api/social/webhooksomething"), false);
});

test("admin pages and admin APIs require the extra admin check", () => {
  assert.equal(isAdminPath("/admin/users"), true);
  assert.equal(isAdminPath("/admin/roles"), true);
  assert.equal(isAdminPath("/api/admin/users"), true);
  assert.equal(isAdminPath("/api/admin/users/123"), true);
});

test("non-admin routes do not require the admin check, including near-miss path names", () => {
  assert.equal(isAdminPath("/settings"), false);
  assert.equal(isAdminPath("/api/meta-ads/scrape"), false);
  // Must match on a path-segment boundary, not a loose string prefix.
  assert.equal(isAdminPath("/administration"), false);
});
