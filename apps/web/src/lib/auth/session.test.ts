import { test } from "vitest";
import assert from "node:assert/strict";

import { AuthError, authErrorResponse } from "./session";

test("authErrorResponse maps an AuthError to its declared status and code", async () => {
  const response = authErrorResponse(new AuthError("FORBIDDEN", "Administrator access is required.", 403));
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(body.error.code, "FORBIDDEN");
  assert.equal(body.error.message, "Administrator access is required.");
});

test("authErrorResponse defaults unknown errors to a 500 INTERNAL_ERROR", async () => {
  const response = authErrorResponse(new Error("Something else broke."));
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.error.code, "INTERNAL_ERROR");
  assert.equal(body.error.message, "Something else broke.");
});

test("authErrorResponse handles a thrown non-Error value", async () => {
  const response = authErrorResponse("a plain string throw");
  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.error.code, "INTERNAL_ERROR");
});
