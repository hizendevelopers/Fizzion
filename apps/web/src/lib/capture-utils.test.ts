import test from "node:test";
import assert from "node:assert/strict";

import {
  buildUploadReference,
  computeRetryScheduleMinutes,
  generateAccessToken,
  generateRegistrationCode,
  hashCaptureToken,
  nowPlusHours,
  nowPlusMinutes,
} from "@/lib/capture-utils";

test("hashCaptureToken is deterministic", () => {
  assert.equal(
    hashCaptureToken("abc123"),
    hashCaptureToken("abc123"),
  );
});

test("generateRegistrationCode returns short human-friendly code", () => {
  const code = generateRegistrationCode();
  assert.match(code, /^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
});

test("generateAccessToken returns opaque capture-agent token", () => {
  const token = generateAccessToken();
  assert.match(token, /^fca_[a-f0-9]+$/);
});

test("buildUploadReference sanitizes filenames", () => {
  const reference = buildUploadReference("device-1", "ary news #1.mkv");
  assert.match(reference, /^capture\/device-1\/\d+-ary-news-1\.mkv$/);
});

test("computeRetryScheduleMinutes matches expected escalating cadence", () => {
  assert.deepEqual(computeRetryScheduleMinutes(), [0.17, 0.5, 1, 5, 15, 30]);
});

test("nowPlus helpers return future ISO timestamps", () => {
  const now = Date.now();
  const plusMinutes = new Date(nowPlusMinutes(10)).getTime();
  const plusHours = new Date(nowPlusHours(1)).getTime();

  assert.ok(plusMinutes > now);
  assert.ok(plusHours > now);
});
