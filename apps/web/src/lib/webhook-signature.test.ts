import { test } from "vitest";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { verifyMetaWebhookSignature } from "./webhook-signature";

const SECRET = "test-app-secret";

function sign(body: string, secret: string) {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

test("accepts a correctly signed payload", () => {
  const body = JSON.stringify({ object: "page", entry: [] });
  const signature = sign(body, SECRET);
  assert.equal(verifyMetaWebhookSignature(body, signature, SECRET), true);
});

test("rejects a payload signed with the wrong secret", () => {
  const body = JSON.stringify({ object: "page", entry: [] });
  const signature = sign(body, "a-different-secret");
  assert.equal(verifyMetaWebhookSignature(body, signature, SECRET), false);
});

test("rejects a signature computed over a different body (tampered payload)", () => {
  const originalBody = JSON.stringify({ object: "page", entry: [] });
  const signature = sign(originalBody, SECRET);
  const tamperedBody = JSON.stringify({ object: "page", entry: [{ injected: true }] });
  assert.equal(verifyMetaWebhookSignature(tamperedBody, signature, SECRET), false);
});

test("rejects a missing signature header", () => {
  const body = JSON.stringify({ object: "page" });
  assert.equal(verifyMetaWebhookSignature(body, null, SECRET), false);
});

test("rejects a malformed signature header", () => {
  const body = JSON.stringify({ object: "page" });
  assert.equal(verifyMetaWebhookSignature(body, "not-a-real-signature", SECRET), false);
  assert.equal(verifyMetaWebhookSignature(body, "sha1=deadbeef", SECRET), false);
});
