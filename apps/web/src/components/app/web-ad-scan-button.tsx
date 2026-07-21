"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

type Props = {
  websiteId: string;
  compact?: boolean;
};

export function WebAdScanButton({ websiteId, compact = false }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          "rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60",
          compact ? "px-3 py-1.5 text-xs" : "",
        )}
        disabled={isPending}
        onClick={handleClick}
        type="button"
      >
        {isPending ? "Queueing scan..." : "Scan Now"}
      </button>
      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-amber-700">{error}</p> : null}
    </div>
  );
}
