"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OohAssetActions({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function removeAsset() {
    const confirmed = window.confirm("Delete this OOH asset and remove its marker from the inventory?");
    if (!confirmed) return;

    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/ooh/assets/${assetId}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Unable to delete this asset.");
      }
      router.push("/ooh-intelligence");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to delete this asset.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => router.push(`/ooh-intelligence/assets/${assetId}/edit`)}
          className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={removeAsset}
          className="rounded-full border border-warning/35 bg-warning-soft px-4 py-2 text-sm font-medium text-foreground"
        >
          Delete
        </button>
      </div>
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}
