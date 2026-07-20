import { getSocialFixture } from "./social-fixtures";
import { buildAppBaseUrl, consumeOAuthState, encryptSocialToken, persistOAuthState } from "./social-security";
import type { SocialProviderKey } from "./social-schemas";
import { normalizeSocialAccountInput } from "./social-utils";

export type AccountDiscoveryResult = {
  provider: SocialProviderKey;
  normalizedUrl: string;
  normalizedHandle: string;
  preview: {
    displayName: string;
    username: string;
    accountType: string;
    profileImageUrl: string;
    publicProfileUrl: string;
    verified: boolean;
    description: string;
  };
  mode: "live" | "sandbox";
  warnings: string[];
};

export type ConnectedAccountSelection = {
  externalAccountId: string;
  accountName: string;
  username: string;
  accountType: string;
  profileImageUrl: string;
  publicProfileUrl: string;
  grantedScopes: string[];
  mode: "live" | "sandbox";
};

export type NormalizedProfile = {
  externalAccountId: string;
  accountName: string;
  username: string;
  accountType: string;
  profileImageUrl: string;
  publicProfileUrl: string;
  description: string;
  verified: boolean;
};

export type SocialProvider = {
  provider: SocialProviderKey;
  validateInput(input: string): Promise<AccountDiscoveryResult>;
  getAuthorizationUrl(input: { accountInput: string; organizationId?: string | null }): Promise<{
    authorizationUrl: string;
    mode: "live" | "sandbox";
  }>;
  handleOAuthCallback(input: {
    code?: string;
    state: string;
  }): Promise<ConnectedAccountSelection[]>;
  refreshAccessToken(): Promise<{ accessToken: string; expiresAt: string }>;
  fetchProfile(): Promise<NormalizedProfile>;
};

function getProviderEnv(provider: SocialProviderKey) {
  if (provider === "facebook" || provider === "instagram") {
    return {
      clientId: process.env.META_APP_ID,
      clientSecret: process.env.META_APP_SECRET,
      redirectUri: process.env.META_REDIRECT_URI || `${buildAppBaseUrl()}/social/oauth/callback/${provider}`,
    };
  }
  if (provider === "tiktok") {
    return {
      clientId: process.env.TIKTOK_CLIENT_ID || process.env.TIKTOK_CLIENT_KEY,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET,
      redirectUri: process.env.TIKTOK_REDIRECT_URI || `${buildAppBaseUrl()}/social/oauth/callback/${provider}`,
    };
  }
  return {
    clientId: process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || `${buildAppBaseUrl()}/social/oauth/callback/${provider}`,
  };
}

class BaseSocialProvider implements SocialProvider {
  provider: SocialProviderKey;

  constructor(provider: SocialProviderKey) {
    this.provider = provider;
  }

  async validateInput(input: string): Promise<AccountDiscoveryResult> {
    const fixture = getSocialFixture(this.provider);
    const normalized = normalizeSocialAccountInput(this.provider, input);
    const env = getProviderEnv(this.provider);
    const liveConfigured = Boolean(env.clientId && env.clientSecret);

    return {
      provider: this.provider,
      normalizedUrl: normalized.normalizedUrl,
      normalizedHandle: normalized.normalizedHandle,
      preview: {
        displayName: fixture.accountName,
        username: fixture.username,
        accountType: fixture.accountType,
        profileImageUrl: fixture.profileImageUrl,
        publicProfileUrl: normalized.normalizedUrl,
        verified: fixture.verified,
        description: fixture.description,
      },
      mode: liveConfigured ? "live" : "sandbox",
      warnings: liveConfigured
        ? []
        : [
            "Official OAuth credentials are not configured in this environment, so the connection will run in clearly labeled sandbox mode.",
          ],
    };
  }

  async getAuthorizationUrl(input: { accountInput: string; organizationId?: string | null }) {
    const env = getProviderEnv(this.provider);
    const liveConfigured = Boolean(env.clientId && env.clientSecret);
    const mode: "live" | "sandbox" = liveConfigured ? "live" : "sandbox";
    const state = await persistOAuthState({
      provider: this.provider,
      mode,
      accountInput: input.accountInput,
      organizationId: input.organizationId ?? null,
    });

    if (!liveConfigured) {
      return {
        authorizationUrl: `${buildAppBaseUrl()}/social/oauth/callback/${this.provider}?state=${encodeURIComponent(state.token)}&mode=sandbox`,
        mode,
      };
    }

    const redirectUri = encodeURIComponent(env.redirectUri!);
    const encodedState = encodeURIComponent(state.token);
    const scopes =
      this.provider === "facebook"
        ? encodeURIComponent("pages_show_list,pages_read_engagement,pages_read_user_content,business_management")
        : this.provider === "instagram"
          ? encodeURIComponent("instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement")
          : this.provider === "tiktok"
            ? encodeURIComponent("user.info.basic,video.list")
            : encodeURIComponent("https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly");

    const authorizationUrl =
      this.provider === "facebook" || this.provider === "instagram"
        ? `https://www.facebook.com/v21.0/dialog/oauth?client_id=${env.clientId}&redirect_uri=${redirectUri}&state=${encodedState}&scope=${scopes}`
        : this.provider === "tiktok"
          ? `https://www.tiktok.com/v2/auth/authorize/?client_key=${env.clientId}&response_type=code&redirect_uri=${redirectUri}&state=${encodedState}&scope=${scopes}`
          : `https://accounts.google.com/o/oauth2/v2/auth?client_id=${env.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&state=${encodedState}&access_type=offline&prompt=consent`;

    return { authorizationUrl, mode };
  }

  async handleOAuthCallback(input: { code?: string; state: string }) {
    const state = await consumeOAuthState(input.state);
    const fixture = getSocialFixture(this.provider);
    const sandboxMode = state.mode === "sandbox";
    const mode: "live" | "sandbox" = sandboxMode ? "sandbox" : "live";

    if (!sandboxMode) {
      if (!input.code) {
        throw new Error("OAuth callback code is missing.");
      }

      throw new Error(
        "Official OAuth authorization is available, but live provider token exchange and data import still require production provider credentials and app-review approval in this environment.",
      );
    }

    return [
      {
        externalAccountId: fixture.externalAccountId,
        accountName: fixture.accountName,
        username: fixture.username,
        accountType: fixture.accountType,
        profileImageUrl: fixture.profileImageUrl,
        publicProfileUrl: fixture.publicProfileUrl,
        grantedScopes:
          this.provider === "youtube"
            ? ["youtube.readonly", "yt-analytics.readonly"]
            : this.provider === "tiktok"
              ? ["user.info.basic", "video.list"]
              : ["pages_read_engagement", "pages_show_list", "instagram_manage_insights"],
        mode,
      },
    ];
  }

  async refreshAccessToken() {
    return {
      accessToken: encryptSocialToken(`refreshed-${this.provider}-${Date.now()}`),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    };
  }

  async fetchProfile(): Promise<NormalizedProfile> {
    const fixture = getSocialFixture(this.provider);
    return {
      externalAccountId: fixture.externalAccountId,
      accountName: fixture.accountName,
      username: fixture.username,
      accountType: fixture.accountType,
      profileImageUrl: fixture.profileImageUrl,
      publicProfileUrl: fixture.publicProfileUrl,
      description: fixture.description,
      verified: fixture.verified,
    };
  }
}

export class FacebookProvider extends BaseSocialProvider {
  constructor() {
    super("facebook");
  }
}

export class InstagramProvider extends BaseSocialProvider {
  constructor() {
    super("instagram");
  }
}

export class TikTokProvider extends BaseSocialProvider {
  constructor() {
    super("tiktok");
  }
}

export class YouTubeProvider extends BaseSocialProvider {
  constructor() {
    super("youtube");
  }
}

export function getSocialProvider(provider: SocialProviderKey): SocialProvider {
  switch (provider) {
    case "facebook":
      return new FacebookProvider();
    case "instagram":
      return new InstagramProvider();
    case "tiktok":
      return new TikTokProvider();
    case "youtube":
      return new YouTubeProvider();
  }
}
