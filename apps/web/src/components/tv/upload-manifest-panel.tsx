"use client";

import { useState, useTransition } from "react";

import { buttonStyles } from "@/lib/button-styles";

type UploadManifestPanelProps = {
  sourcePartnerId?: string | null;
};

export function UploadManifestPanel({ sourcePartnerId }: UploadManifestPanelProps) {
  const [filename, setFilename] = useState("ary-news__2026-07-19__18-40-00__Asia-Karachi.ts");
  const [sourceStartTime, setSourceStartTime] = useState("2026-07-19T15:40:00.000Z");
  const [duration, setDuration] = useState(300);
  const [sha256, setSha256] = useState("sandboxfixturechecksum1234567890");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(mode: "initiate" | "complete") {
    startTransition(async () => {
      setResult(null);
      const response = await fetch(`/api/tv/uploads/${mode}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          channel_slug: "ary-news",
          source_partner_id: sourcePartnerId ?? undefined,
          source_start_time: sourceStartTime,
          source_timezone: "Asia/Karachi",
          expected_duration_seconds: duration,
          sha256,
          filename,
          storage_key: `tv/raw/ary-news/sandbox/${filename}`,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; error?: { message?: string }; recordingFileId?: string }
        | null;

      setResult(
        payload?.recordingFileId
          ? `${payload.message} Recording file id: ${payload.recordingFileId}`
          : payload?.message ?? payload?.error?.message ?? "Upload action completed.",
      );
    });
  }

  function uploadFile() {
    if (!selectedFile) {
      setResult("Choose a video file before starting direct upload.");
      return;
    }

    startTransition(async () => {
      setResult(null);
      const payload = new FormData();
      payload.set("file", selectedFile);
      payload.set("channel_slug", "ary-news");
      payload.set("source_partner_id", sourcePartnerId ?? "");
      payload.set("source_start_time", sourceStartTime);
      payload.set("source_timezone", "Asia/Karachi");
      payload.set("expected_duration_seconds", String(duration));

      const response = await fetch("/api/tv/uploads/file", {
        method: "POST",
        body: payload,
      });

      const responsePayload = (await response.json().catch(() => null)) as
        | {
            message?: string;
            error?: { message?: string };
            recordingFileId?: string;
            createdOccurrences?: number;
          }
        | null;

      setResult(
        responsePayload?.recordingFileId
          ? `${responsePayload.message} Recording file id: ${responsePayload.recordingFileId}. Created occurrences: ${responsePayload.createdOccurrences ?? 0}.`
          : responsePayload?.message ?? responsePayload?.error?.message ?? "Direct upload completed.",
      );
    });
  }

  return (
    <div className="rounded-[1.6rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-muted-foreground">
          Video file
          <input
            className="mt-2 block w-full rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm text-foreground outline-none file:me-3 file:rounded-full file:border-0 file:bg-brand-red-soft file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-red focus:border-brand-red"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setSelectedFile(file);
              if (file) {
                setFilename(file.name);
              }
            }}
            type="file"
          />
        </label>
        <label className="text-sm text-muted-foreground">
          Filename
          <input
            className="mt-2 h-11 w-full rounded-2xl border border-border bg-panel-soft px-4 text-sm text-foreground outline-none focus:border-brand-red"
            onChange={(event) => setFilename(event.target.value)}
            value={filename}
          />
        </label>
        <label className="text-sm text-muted-foreground">
          Source start time
          <input
            className="mt-2 h-11 w-full rounded-2xl border border-border bg-panel-soft px-4 text-sm text-foreground outline-none focus:border-brand-red"
            onChange={(event) => setSourceStartTime(event.target.value)}
            value={sourceStartTime}
          />
        </label>
        <label className="text-sm text-muted-foreground">
          Duration seconds
          <input
            className="mt-2 h-11 w-full rounded-2xl border border-border bg-panel-soft px-4 text-sm text-foreground outline-none focus:border-brand-red"
            onChange={(event) => setDuration(Number(event.target.value))}
            type="number"
            value={duration}
          />
        </label>
        <label className="text-sm text-muted-foreground">
          SHA-256
          <input
            className="mt-2 h-11 w-full rounded-2xl border border-border bg-panel-soft px-4 text-sm text-foreground outline-none focus:border-brand-red"
            onChange={(event) => setSha256(event.target.value)}
            value={sha256}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className={buttonStyles.primary}
          disabled={isPending || !selectedFile}
          onClick={uploadFile}
          type="button"
        >
          Upload video and process
        </button>
        <button
          className={buttonStyles.secondary}
          disabled={isPending}
          onClick={() => submit("initiate")}
          type="button"
        >
          Initiate upload
        </button>
        <button
          className={buttonStyles.primary}
          disabled={isPending}
          onClick={() => submit("complete")}
          type="button"
        >
          Complete upload
        </button>
      </div>
      <p className="mt-3 text-xs leading-6 text-muted-foreground">
        This panel supports direct manual video upload plus sandbox/manual-upload metadata flows.
        Live ARY News source capture remains blocked until authorization is approved. Source
        manifests should use Pakistan source timing, while approved monitoring views can still
        display Iraq-local time separately.
      </p>
      {result ? <p className="mt-3 text-sm font-medium text-foreground">{result}</p> : null}
    </div>
  );
}
