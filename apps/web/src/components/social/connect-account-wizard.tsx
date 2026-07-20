"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";

import type { SocialProviderKey } from "@/lib/social-schemas";

import { PlatformIcon } from "./platform-icon";

type DiscoveryResponse = {
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

const PROVIDERS: Array<{
  key: SocialProviderKey;
  title: string;
  description: string;
}> = [
  {
    key: "facebook",
    title: "Facebook",
    description: "Connect a Facebook Page through Meta Graph API authorization.",
  },
  {
    key: "instagram",
    title: "Instagram",
    description: "Connect an Instagram Professional Account with official Meta permissions.",
  },
  {
    key: "tiktok",
    title: "TikTok",
    description: "Connect a TikTok account through Login Kit and approved APIs.",
  },
  {
    key: "youtube",
    title: "YouTube",
    description: "Connect a YouTube channel through YouTube Data and Analytics APIs.",
  },
];

export function ConnectAccountWizard({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [provider, setProvider] = useState<SocialProviderKey>("facebook");
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<DiscoveryResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const selected = useMemo(
    () => PROVIDERS.find((item) => item.key === provider) ?? PROVIDERS[0],
    [provider],
  );

  async function discover() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/social/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, input }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Account discovery failed.");
      }
      setPreview(payload);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account discovery failed.");
    } finally {
      setBusy(false);
    }
  }

  async function authorize() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/social/connect/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          input,
          mode: preview?.mode ?? "sandbox",
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.authorizationUrl) {
        throw new Error(payload?.error?.message ?? "Authorization could not start.");
      }
      window.location.href = payload.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authorization could not start.");
      setBusy(false);
    }
  }

  return (
    <section className={`rounded-[2rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)] ${compact ? "" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Connect Social Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Public profile data can be previewed from a URL or handle, but detailed analytics
            require official account authorization.
          </p>
        </div>
        <span className="rounded-full bg-panel-soft px-3 py-2 text-xs text-muted-foreground">
          Step {step} of 3
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {PROVIDERS.map((item) => (
          <button
            key={item.key}
            className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
              provider === item.key
                ? "border-brand-red/40 bg-brand-red-soft"
                : "border-border bg-panel-soft hover:border-brand-red/25"
            }`}
            onClick={() => {
              setProvider(item.key);
              setPreview(null);
              setError(null);
              setStep(2);
            }}
            type="button"
          >
            <div className="flex items-center gap-3">
              <PlatformIcon provider={item.key} />
              <div>
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-[1.6rem] border border-border bg-panel-soft p-4">
        <p className="text-sm font-semibold text-foreground">Step 2: Enter account</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a full profile URL, `@username`, plain username, channel ID, or Page ID where supported.
        </p>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row">
          <input
            className="min-w-0 flex-1 rounded-full border border-border bg-white px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            onChange={(event) => setInput(event.target.value)}
            placeholder={`Enter ${selected.title} URL or username`}
            value={input}
          />
          <button
            className="rounded-full bg-sidebar px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy || input.trim().length < 2}
            onClick={discover}
            type="button"
          >
            {busy ? "Validating..." : "Validate account"}
          </button>
        </div>
      </div>

      {preview ? (
        <div className="mt-6 rounded-[1.6rem] border border-border bg-white p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <img
                alt={preview.preview.displayName}
                className="h-16 w-16 rounded-2xl object-cover"
                src={preview.preview.profileImageUrl}
              />
              <div>
                <p className="text-base font-semibold text-foreground">{preview.preview.displayName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  @{preview.preview.username} · {preview.preview.accountType}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {preview.preview.description}
                </p>
                <a
                  className="mt-2 inline-flex text-sm font-medium text-brand-red"
                  href={preview.preview.publicProfileUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open public profile
                </a>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-border bg-panel-soft px-4 py-3 text-sm text-muted-foreground">
              <p>Connection mode: {preview.mode === "sandbox" ? "Sandbox fixture" : "Official OAuth"}</p>
              <p className="mt-1">Verified: {preview.preview.verified ? "Yes" : "No"}</p>
            </div>
          </div>

          {preview.warnings.length > 0 ? (
            <div className="mt-4 rounded-[1.3rem] border border-warning/35 bg-warning-soft px-4 py-3 text-sm text-foreground">
              {preview.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}

          <div className="mt-5">
            <p className="text-sm leading-7 text-muted-foreground">
              Public profile information may be previewed from the supplied URL or username.
              Detailed analytics, audience metrics, reach, engagement, comments, and account-owned
              content require authorization from the account owner.
            </p>
            <button
              className="mt-4 rounded-full bg-brand-red px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              onClick={authorize}
              type="button"
            >
              {busy ? "Opening authorization..." : "Continue to authorization"}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-[1.4rem] border border-warning/35 bg-warning-soft px-4 py-3 text-sm text-foreground">
          {error}
        </div>
      ) : null}
    </section>
  );
}
