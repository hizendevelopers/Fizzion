import type { SocialProviderKey } from "@/lib/social-schemas";

export const APIFY_ACTORS = {
  tiktok: "GdWCkxBtKWOsKjdch",
  instagram: "shu8hvrXbJbY3Eb9W",
  youtube: "h7sDV53CddomktSi5",
  facebook: "4Hv5RhChiaDk6iwad",
} as const satisfies Record<SocialProviderKey, string>;

export const INSTAGRAM_PROFILE_APIFY_ACTOR = "dSCLg0C3YEZ83HzYX";
export const INSTAGRAM_PROFILE_APIFY_ACTOR_V2 = "bGApZ3CtTxA9fv2rl";
export const INSTAGRAM_SUPPLEMENTAL_PROFILE_ACTORS = [
  INSTAGRAM_PROFILE_APIFY_ACTOR,
  INSTAGRAM_PROFILE_APIFY_ACTOR_V2,
] as const;

export type ApifyActorPlatform = keyof typeof APIFY_ACTORS;

export function getActorId(platform: ApifyActorPlatform): string {
  return APIFY_ACTORS[platform];
}

export function getPlatformFromActorId(actorId: string): ApifyActorPlatform | null {
  const entry = Object.entries(APIFY_ACTORS).find(
    ([, id]) => id === actorId,
  );
  return entry ? (entry[0] as ApifyActorPlatform) : null;
}

