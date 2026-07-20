"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { PlatformIcon } from "./platform-icon";

const PROVIDERS = [
  { key: "tiktok", title: "TikTok", description: "Scrape public TikTok profile data, videos, and metrics via Apify." },
  { key: "instagram", title: "Instagram", description: "Scrape public Instagram profile posts, reels, and metrics via Apify." },
  { key: "youtube", title: "YouTube", description: "Scrape public YouTube channel videos, shorts, and stats via Apify." },
  { key: "facebook", title: "Facebook", description: "Scrape public Facebook Page posts and metrics via Apify." },
];

export function ConnectAccountWizard() {
  const [provider, setProvider] = useState("tiktok");
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [step, setStep] = useState(1);

  const selected = PROVIDERS.find((i) => i.key === provider) || PROVIDERS[0];

  async function discover() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const r = await fetch("/api/social/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, input }),
      });
      const p = await r.json();
      if (!r.ok) throw new Error(p?.error?.message || "Discovery failed.");
      setPreview(p);
      setStep(3);
    } catch (e) {
      setError(e.message || "Discovery failed.");
    } finally {
      setBusy(false);
    }
  }

  async function connectAndScrape() {
    setImportBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const r = await fetch("/api/social/connections/apify-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: provider, input: input.trim() }),
      });
      const p = await r.json();
      if (!r.ok) throw new Error(p?.error?.message || "Failed.");
      setSuccess("Scraping started! Redirecting...");
      setTimeout(() => {
        window.location.href = "/social/accounts/" + p.connectionId;
      }, 2000);
    } catch (e) {
      setError(e.message || "Failed.");
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
    <div className="rounded-2xl border border-border bg-white p-5 shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Connect Social Account</h2>
          <p className="text-sm text-muted-foreground">
            Enter URL or username. Uses Apify scrapers — no OAuth needed.
          </p>
        </div>
        <span className="rounded-full bg-panel-soft px-3 py-1 text-xs">
          {success ? "Connected!" : "Step " + step + " of 3"}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 mb-4">
        {PROVIDERS.map((item) => {
          const active = provider === item.key;
          const cls =
            "rounded-xl border px-4 py-4 text-left" +
            (active
              ? " border-red-400 bg-red-50"
              : " border-border bg-panel-soft hover:border-red-300");
          return (
            <button
              key={item.key}
              className={cls}
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
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-panel-soft p-4 mb-4">
        <p className="text-sm font-semibold mb-2">
          Enter URL, @handle, or username
        </p>
        <div className="flex flex-col gap-2 lg:flex-row">
          <input
            className="flex-1 rounded-full border border-border bg-white px-4 py-2 text-sm"
            onChange={(e) => setInput(e.target.value)}
            placeholder={"Enter " + selected.title + " URL or username"}
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
        {!importBusy && !preview && (
          <p className="mt-2 text-xs text-muted-foreground">
            Click <strong>Connect & Import</strong>. No OAuth.
          </p>
        )}
      </div>

      {preview && (
        <div className="rounded-xl border border-border bg-white p-4 mb-4">
          <div className="flex items-start gap-3">
            <img
              alt={preview.preview.displayName}
              className="h-14 w-14 rounded-xl object-cover"
              src={preview.preview.profileImageUrl}
            />
            <div>
              <p className="font-semibold">{preview.preview.displayName}</p>
              <p className="text-sm text-muted-foreground">
                @{preview.preview.username}
              </p>
              <p className="text-sm mt-1">{preview.preview.description}</p>
            </div>
          <div className="mt-3 p-2 bg-amber-50 rounded text-sm text-amber-800">
            Public data only via Apify
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
              className="rounded-full border border-border bg-panel-soft px-5 py-2 text-sm"
              onClick={reset}
              type="button"
            >
              Start Over
            </button>
          </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800 mb-4">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm mb-4">
          {error}
        </div>
      )}
    </div>
  );
}
