"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { ScanIcon } from "./ui-icons";

type Props = {
  websiteId: string;
  compact?: boolean;
};

const ACTIVE_STATUSES = new Set(["queued", "running"]);
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40; // ~2 minutes

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function WebAdScanButton({ websiteId, compact = false }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pollUntilDone() {
    for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
      await sleep(POLL_INTERVAL_MS);

      try {
        const response = await fetch(`/api/web-advertising/websites/${websiteId}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | { website?: { runs?: Array<{ status?: string; ads_detected?: number }> } }
          | null;
        const latestRun = payload?.website?.runs?.[0];

        router.refresh();

        if (!latestRun || !ACTIVE_STATUSES.has(String(latestRun.status ?? "").toLowerCase())) {
          setMessage(
            latestRun?.status === "failed"
              ? "Website scan failed. Check the crawl history for details."
              : `Scan complete. ${latestRun?.ads_detected ?? 0} advertisement candidate(s) captured.`,
          );
          return;
        }
      } catch {
        // Keep polling — a single failed status check shouldn't abort.
      }
    }

    setMessage("The scan is taking longer than expected. Refresh to check its latest status.");
  }

  async function handleClick() {
    setMessage(null);
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch(`/api/web-advertising/websites/${websiteId}/scan`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; error?: { message?: string } }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Website scan could not be started.");
      }

      setMessage(payload?.message ?? "Website scan queued.");
      router.refresh();
      await pollUntilDone();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Website scan could not be started.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#ff554c_0%,#f40009_46%,#b30009_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] disabled:cursor-not-allowed disabled:opacity-60",
          compact ? "px-3 py-1.5 text-xs" : "min-w-[9.5rem]",
        )}
        aria-busy={isPending}
        disabled={isPending}
        onClick={handleClick}
        type="button"
      >
        <ScanIcon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {isPending ? "Running scan..." : compact ? "Scan now" : "Run fresh scan"}
      </button>
      <div aria-live="polite" className="min-h-[1rem]">
        {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
        {error ? <p className="text-xs text-amber-700">{error}</p> : null}
      </div>
    </div>
  );
}
