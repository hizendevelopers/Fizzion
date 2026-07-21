"use client";

import { useState } from "react";

import type { OohImportPreview } from "@/lib/ooh/ooh-import";

export function OohImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<OohImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function submit(commit: boolean) {
    if (!file) {
      setStatus("Choose an XLSX file first.");
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("selectedSheets", JSON.stringify([]));
      formData.append("commit", String(commit));
      const response = await fetch("/api/ooh/import/excel", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "OOH import failed.");
      }

      setPreview(payload.preview as OohImportPreview);
      if (commit) {
        setStatus(`${payload.importedCount ?? 0} rows imported. Coordinate assignment can now continue from imported assets.`);
      } else {
        setStatus("Workbook preview generated successfully.");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to process the workbook.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="rounded-[1.8rem] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
      <summary className="cursor-pointer text-sm font-semibold text-foreground">Admin import tools</summary>
      <div className="mt-4 space-y-4">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto]">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm"
          />
          <button
            type="button"
            disabled={busy || !file}
            onClick={() => submit(false)}
            className="rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm font-medium text-foreground disabled:opacity-60"
          >
            {busy ? "Working..." : "Preview import"}
          </button>
          <button
            type="button"
            disabled={busy || !file}
            onClick={() => submit(true)}
            className="rounded-2xl bg-sidebar px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Importing..." : "Import workbook"}
          </button>
        </div>

        {status ? <div className="rounded-2xl bg-warning-soft px-4 py-3 text-sm text-foreground">{status}</div> : null}

        {preview ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-4">
              <PreviewCard label="Preview rows" value={String(preview.rows.length)} />
              <PreviewCard label="Warnings" value={String(preview.warningCount)} />
              <PreviewCard label="Skipped rows" value={String(preview.skippedCount)} />
              <PreviewCard label="Sheets" value={String(preview.sheets.length)} />
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-border">
              <div className="max-h-80 overflow-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-panel-soft text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Sheet</th>
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">City</th>
                      <th className="px-4 py-3">Media</th>
                      <th className="px-4 py-3">Warnings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {preview.rows.slice(0, 24).map((row) => (
                      <tr key={`${row.sourceSheet}-${row.sourceRow}`}>
                        <td className="px-4 py-3">{row.sourceSheet}</td>
                        <td className="px-4 py-3">{row.sourceRow}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{row.assetCode}</td>
                        <td className="px-4 py-3">{row.city || "Unknown"}</td>
                        <td className="px-4 py-3">{row.mediaType === "DIGITAL_SCREEN" ? "Digital Screen" : "Billboard"}</td>
                        <td className="px-4 py-3">{row.warnings.length > 0 ? row.warnings.join(" ") : "No warnings"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function PreviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-panel-soft px-4 py-3">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-semibold text-foreground">{value}</div>
    </div>
  );
}
