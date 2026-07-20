import { redirect } from "next/navigation";

import { completeSocialOAuthConnection } from "@/lib/social-data";

export default async function SocialOauthCallbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ platform: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { platform } = await params;
  const query = await searchParams;
  const state = typeof query.state === "string" ? query.state : "";
  const code = typeof query.code === "string" ? query.code : undefined;
  const isKnownProvider =
    platform === "facebook" ||
    platform === "instagram" ||
    platform === "tiktok" ||
    platform === "youtube";

  if (!state || !isKnownProvider) {
    return (
      <div className="rounded-[2rem] border border-border bg-white p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-semibold text-foreground">Connection failed</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          The OAuth callback is missing a signed state token or the provider is invalid.
        </p>
      </div>
    );
  }

  try {
    const result = await completeSocialOAuthConnection({
      provider: platform,
      state,
      code,
    });
    redirect(`/social/accounts/${result.connectionId}?connected=1&mode=${result.mode}`);
  } catch (error) {
    return (
      <div className="rounded-[2rem] border border-warning/35 bg-warning-soft p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-semibold text-foreground">Authorization could not complete</h1>
        <p className="mt-3 text-sm leading-7 text-foreground">
          {error instanceof Error ? error.message : "The social authorization callback failed."}
        </p>
      </div>
    );
  }
}
