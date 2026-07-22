"use client";

import { useState } from "react";

import { RefreshIcon, TrashIcon } from "@/components/app/ui-icons";

export function SocialAccountActions({
  connectionId,
}: {
  connectionId: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function runAction(action: "sync" | "remove") {
    setBusy(true);
    setStatus(null);

    try {
      if (action === "sync") {
        const response = await fetch(`/api/social/connections/${connectionId}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "refresh", resultsLimit: 2500 }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error?.message ?? "Sync failed.");
        }
        setStatus("Data refresh queued successfully.");
        window.location.reload();
        return;
      }

      const confirmed = window.confirm(
        "Remove this account from Social Intelligence and stop future synchronization?",
      );
      if (!confirmed) {
        setBusy(false);
        return;
      }

      const response = await fetch(`/api/social/connections/${connectionId}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Account removal failed.");
      }
      setStatus("Account removed from the workspace.");
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#251315_0%,#2f1418_56%,#1b0d12_100%)] px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-dark)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busy}
          onClick={() => runAction("sync")}
          type="button"
        >
          <RefreshIcon />
          Refresh Data
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-warning/35 bg-warning-soft px-4 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busy}
          onClick={() => runAction("remove")}
          type="button"
        >
          <TrashIcon />
          Remove Account
        </button>
      </div>
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}
