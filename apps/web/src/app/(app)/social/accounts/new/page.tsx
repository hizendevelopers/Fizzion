import { SocialProviderConnectPanel } from "@/components/social/social-provider-connect-panel";
import { listSocialProviderAvailability } from "@/lib/social-providers";

export default async function AddSocialAccountPage() {
  const providers = listSocialProviderAvailability();

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Connect Social Account</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          Start from an officially supported provider OAuth flow. This page intentionally avoids
          public-scrape shortcuts and sandbox-only fixture connections.
        </p>
      </section>
      <SocialProviderConnectPanel providers={providers} />
    </div>
  );
}
