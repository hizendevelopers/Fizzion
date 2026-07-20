"use client";

import { useState } from "react";

export function SocialAccountActions({
  connectionId,
}: {
  connectionId: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function runAction(action: "sync" | "reconnect" | "disconnect") {
    setBusy(true);
    setStatus(null);

    try {
      if (action === "sync") {
        const response = await fetch(`/api/social/connections/${connectionId}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "refresh" }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error?.message ?? "Sync failed.");
        }
        setStatus("Data refresh queued successfully.");
        window.location.reload();
        return;
      }

      if (action === "reconnect") {
        const response = await fetch(`/api/social/connections/${connectionId}/reconnect`, {
          method: "POST",
        });
        const payload = await response.json();
        if (!response.ok || !payload?.authorizationUrl) {
          throw new Error(payload?.error?.message ?? "Reconnect could not start.");
        }
        window.location.href = payload.authorizationUrl;
        return;
      }

      const confirmed = window.confirm("Disconnect this account and stop future synchronization?");
      if (!confirmed) {
        setBusy(false);
        return;
      }

      const response = await fetch(`/api/social/connections/${connectionId}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Disconnect failed.");
      }
      setStatus("Account disconnected.");
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
          className="rounded-full bg-sidebar px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busy}
          onClick={() => runAction("sync")}
          type="button"
        >
          Refresh Data
        </button>
        <button
          className="rounded-full border border-border bg-panel-soft px-4 py-2 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busy}
          onClick={() => runAction("reconnect")}
          type="button"
        >
          Reconnect
        </button>
        <button
          className="rounded-full border border-warning/35 bg-warning-soft px-4 py-2 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busy}
          onClick={() => runAction("disconnect")}
          type="button"
        >
          Disconnect
        </button>
      </div>
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}
