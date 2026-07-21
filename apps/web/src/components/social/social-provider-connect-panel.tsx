"use client";

import { useState } from "react";

import type { SocialProviderAvailability } from "@/lib/social-providers";

export function SocialProviderConnectPanel({
  providers,
}: {
  providers: SocialProviderAvailability[];
}) {
  const availableProviders = providers.filter((provider) => provider.available);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startConnect(provider: string) {
    setBusyProvider(provider);
    setError(null);

    try {
      const response = await fetch(`/api/social/connect/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: provider }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { authorizationUrl?: string; error?: { message?: string } }
        | null;

      if (!response.ok || !payload?.authorizationUrl) {
        throw new Error(payload?.error?.message ?? "Provider authorization could not be started.");
      }

      window.location.assign(payload.authorizationUrl);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Provider authorization could not be started.");
    } finally {
      setBusyProvider(null);
    }
  }

  return (
    <div className="rounded-[2rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Connect Social Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Only officially supported OAuth providers are shown here. Public-scrape or sandbox-only
            shortcuts are intentionally hidden from production Social Intelligence.
          </p>
        </div>
        <span className="rounded-full bg-panel-soft px-3 py-1 text-xs text-muted-foreground">
          {availableProviders.length} ready
        </span>
      </div>

      {availableProviders.length > 0 ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {availableProviders.map((provider) => (
            <article className="rounded-[1.5rem] border border-border bg-panel-soft p-4" key={provider.provider}>
              <p className="text-base font-semibold text-foreground">{provider.label}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Required scopes: {provider.requiredScopes.join(", ")}
              </p>
              <button
                className="mt-4 rounded-full bg-sidebar px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busyProvider === provider.provider}
                onClick={() => startConnect(provider.provider)}
                type="button"
              >
                {busyProvider === provider.provider ? "Redirecting..." : `Continue with ${provider.label}`}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[1.6rem] border border-dashed border-border bg-panel-soft px-5 py-6">
          <p className="text-sm font-medium text-foreground">
            No provider is currently ready for a real OAuth connection in this environment.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add a real provider app configuration and complete the live token-exchange implementation
            before connecting accounts.
          </p>
          <div className="mt-4 space-y-3">
            {providers.map((provider) => (
              <div className="rounded-[1.2rem] border border-border bg-white px-4 py-3" key={provider.provider}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{provider.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {provider.reasons.join(" ")}
                    </p>
                  </div>
                  <span className="rounded-full bg-warning-soft px-3 py-1 text-xs text-foreground">
                    Not available
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Expected next step: configure one provider app with callback URLs, token encryption, and
            approved scopes, then reopen this page.
          </p>
        </div>
      )}

      {error ? (
        <div className="mt-4 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-900">
          {error}
        </div>
      ) : null}
    </div>
  );
}
