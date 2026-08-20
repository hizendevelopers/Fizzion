"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

import { PlatformIcon } from "./platform-icon";

type ProviderKey = "tiktok" | "instagram" | "youtube" | "facebook";
type WizardPersona = "brand" | "influencer";
type WizardTab = "brands" | "influencers";

type DiscoveryPreview = {
  provider: ProviderKey;
  normalizedUrl?: string;
  username?: string;
  handle?: string;
  inputType?: string;
  preview?: {
    displayName: string;
    username: string;
    description: string;
    profileImageUrl: string;
  };
};

const PROVIDERS: Array<{
  key: ProviderKey;
  title: string;
  description: string;
}> = [
  {
    key: "tiktok",
    title: "TikTok",
    description: "Import public TikTok profile data, videos, and metrics.",
  },
  {
    key: "instagram",
    title: "Instagram",
    description: "Import public Instagram posts, reels, profile details, and metrics.",
  },
  {
    key: "youtube",
    title: "YouTube",
    description: "Import public YouTube channel videos, shorts, and stats.",
  },
  {
    key: "facebook",
    title: "Facebook",
    description: "Import public Facebook Page posts and metrics.",
  },
];

export function ConnectAccountWizard({
  personaHint = "brand",
  redirectTab = "brands",
}: {
  personaHint?: WizardPersona;
  redirectTab?: WizardTab;
}) {
  const [provider, setProvider] = useState<ProviderKey>("tiktok");
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<DiscoveryPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const selected = PROVIDERS.find((item) => item.key === provider) ?? PROVIDERS[0];

  async function discover() {
    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/social/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, input }),
      });
      const payload = (await response.json()) as DiscoveryPreview & {
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(payload?.error?.message || "Discovery failed.");
      }
      setPreview(payload);
      setStep(3);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Discovery failed.");
    } finally {
      setBusy(false);
    }
  }

  async function connectAndScrape() {
    setImportBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/social/connections/apify-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: provider, input: input.trim(), persona: personaHint }),
      });
      const payload = (await response.json()) as {
        connectionId?: string;
        error?: { message?: string };
      };
      if (!response.ok || !payload.connectionId) {
        throw new Error(payload?.error?.message || "Failed to connect account.");
      }
      setSuccess(`Scraping started. Redirecting to the ${redirectTab === "influencers" ? "Influencer" : "Brand"} view...`);
      window.setTimeout(() => {
        window.location.href = `/social-intelligence?tab=${redirectTab}&selected=${payload.connectionId}`;
      }, 1200);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to connect account.");
    } finally {
      setImportBusy(false);
    }
  }

  function reset() {
    setProvider("tiktok");
    setInput("");
    setPreview(null);
    setError(null);
    setSuccess(null);
    setStep(1);
  }

  return (
    <div className="rounded-[2rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Connect Social Account</h2>
          <p className="text-sm text-muted-foreground">
            Enter a public profile URL, handle, or username to import publicly available account data.
          </p>
        </div>
        <span className="rounded-full bg-panel-soft px-3 py-1 text-xs text-muted-foreground">
          {success ? "Started" : `Step ${step} of 3`}
        </span>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {PROVIDERS.map((item) => {
          const active = provider === item.key;
          return (
            <button
              key={item.key}
              className={`rounded-xl border px-4 py-4 text-left transition ${
                active
                  ? "border-red-400 bg-red-50"
                  : "border-border bg-panel-soft hover:border-red-300"
              }`}
              onClick={() => {
                setProvider(item.key);
                setPreview(null);
                setError(null);
                setSuccess(null);
                setStep(2);
              }}
              type="button"
            >
              <div className="flex items-center gap-3">
                <PlatformIcon provider={item.key} />
                <div>
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mb-4 rounded-xl border border-border bg-panel-soft p-4">
        <p className="mb-2 text-sm font-semibold text-foreground">Enter URL, @handle, or username</p>
        <div className="flex flex-col gap-2 lg:flex-row">
          <input
            className="flex-1 rounded-full border border-border bg-white px-4 py-2 text-sm text-foreground"
            onChange={(event) => setInput(event.target.value)}
            placeholder={`Enter ${selected.title} URL or username`}
            value={input}
          />
          <div className="flex gap-2">
            <button
              className="rounded-full bg-gray-800 px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={busy || input.trim().length < 2}
              onClick={discover}
              type="button"
            >
              {busy ? "Validating..." : "Validate"}
            </button>
            <button
              className="rounded-full bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={importBusy || input.trim().length < 2}
              onClick={connectAndScrape}
              type="button"
            >
              {importBusy ? "Scraping..." : "Connect & Import"}
            </button>
          </div>
        </div>
        {!importBusy && !preview ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Click <strong>Connect &amp; Import</strong> to start pulling public account data.
          </p>
        ) : null}
      </div>

      {preview ? (
        <div className="mb-4 rounded-xl border border-border bg-white p-4">
          <div className="flex items-start gap-3">
            {preview.preview?.profileImageUrl ? (
              <img
                alt={preview.preview.displayName}
                className="h-14 w-14 rounded-xl object-cover"
                src={preview.preview.profileImageUrl}
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">
                {preview.preview?.displayName ?? preview.username ?? preview.handle ?? "Profile preview"}
              </p>
              <p className="text-sm text-muted-foreground">
                @{preview.preview?.username ?? preview.username ?? preview.handle ?? "unknown"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {preview.preview?.description ?? "Public account preview available from the normalized input."}
              </p>
              {preview.normalizedUrl ? (
                <p className="mt-2 break-all text-xs text-muted-foreground">{preview.normalizedUrl}</p>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className="rounded-full bg-red-600 px-5 py-2 text-sm text-white disabled:opacity-50"
              disabled={importBusy}
              onClick={connectAndScrape}
              type="button"
            >
              {importBusy ? "Scraping..." : "Connect & Import Now"}
            </button>
            <button
              className="rounded-full border border-border bg-panel-soft px-5 py-2 text-sm text-foreground"
              onClick={reset}
              type="button"
            >
              Start Over
            </button>
          </div>
        </div>
      ) : null}

      {success ? (
        <div className="mb-4 rounded-xl border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800">
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-900">
          {error}
        </div>
      ) : null}
    </div>
  );
}
