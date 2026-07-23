"use client";

import { useState } from "react";

type SocialExportButtonProps = {
  connectionId?: string;
  reportType?: "portfolio" | "account";
  label?: string;
  format?: "csv" | "pdf";
  dateRange?: "today" | "last7" | "last14" | "last30" | "last60" | "last90" | "custom";
};

export function SocialExportButton({
  connectionId,
  reportType = connectionId ? "account" : "portfolio",
  label = "Export CSV Report",
  format = "csv",
  dateRange = "last30",
}: SocialExportButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportReport() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/social/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          connectionId,
          format,
          dateRange,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? "Report export failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const extension = format === "pdf" ? "pdf" : "csv";
      anchor.download = connectionId ? `social-account-${connectionId}.${extension}` : `social-portfolio.${extension}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report export failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        className="rounded-full border border-border bg-panel-soft px-4 py-2 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        disabled={busy}
        onClick={exportReport}
        type="button"
      >
        {busy ? "Exporting..." : label}
      </button>
      {error ? <p className="text-xs text-muted-foreground">{error}</p> : null}
    </div>
  );
}
