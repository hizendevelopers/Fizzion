import { test } from "vitest";
import assert from "node:assert/strict";

import {
  buildSignedOAuthState,
  decryptSocialToken,
  encryptSocialToken,
  verifySignedOAuthState,
} from "./social-security";

test("encryptSocialToken round-trips values", () => {
  const encrypted = encryptSocialToken("social-token-value");
  assert.notEqual(encrypted, "social-token-value");
  assert.equal(decryptSocialToken(encrypted), "social-token-value");
});

test("buildSignedOAuthState and verifySignedOAuthState remain stable", () => {
  const state = buildSignedOAuthState({
    provider: "facebook",
    mode: "sandbox",
    accountInput: "@cocacolairaq",
  });

  const verified = verifySignedOAuthState(state.token);
  assert.equal(verified.provider, "facebook");
  assert.equal(verified.mode, "sandbox");
  assert.equal(verified.accountInput, "@cocacolairaq");
});
