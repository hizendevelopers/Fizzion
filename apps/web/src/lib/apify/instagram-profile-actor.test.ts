import test from "node:test";
import assert from "node:assert/strict";

import { INSTAGRAM_SUPPLEMENTAL_PROFILE_ACTORS } from "@/lib/apify/actors";
import { buildInstagramProfileInput } from "@/lib/apify/input-builders/instagram-profile";
import { normalizeInstagramProfile } from "@/lib/apify/normalization/instagram";

test("instagram profile actor input uses username list", () => {
  const input = buildInstagramProfileInput({
    platform: "instagram",
    originalInput: "@humansofny",
    normalizedUrl: "https://www.instagram.com/humansofny",
    username: "humansofny",
    handle: "humansofny",
    inputType: "handle",
  });

  assert.deepEqual(input, {
    usernames: ["humansofny"],
    includeAboutSection: false,
  });
});

test("instagram supplemental profile actor list includes both supported actors", () => {
  assert.deepEqual(INSTAGRAM_SUPPLEMENTAL_PROFILE_ACTORS, [
    "dSCLg0C3YEZ83HzYX",
    "bGApZ3CtTxA9fv2rl",
  ]);
});

test("instagram profile normalization reads supplemental actor profile fields", () => {
  const profile = normalizeInstagramProfile([
    {
      username: "humansofny",
      fullName: "Humans of New York",
      biography: "Stories from the streets of New York.",
      profilePicUrl: "https://cdn.example.com/profile.jpg",
      followersCount: 12000000,
      followsCount: 998,
      postsCount: 8400,
      verified: true,
      inputUrl: "https://www.instagram.com/humansofny",
    },
  ]);

  assert.equal(profile.username, "humansofny");
  assert.equal(profile.displayName, "Humans of New York");
  assert.equal(profile.profileImageUrl, "https://cdn.example.com/profile.jpg");
  assert.equal(profile.followers, 12000000);
  assert.equal(profile.following, 998);
  assert.equal(profile.totalPosts, 8400);
  assert.equal(profile.verified, true);
});
