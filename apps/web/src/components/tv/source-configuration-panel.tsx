"use client";

import { useState, useTransition } from "react";

import { buttonStyles } from "@/lib/button-styles";

type SourceConfigurationPanelProps = {
  sourceId: string | null;
  initialSourceType: string;
  initialSecretReference: string;
  initialExpectedSchedule: string;
  initialSourceTimezone: string;
  initialVerificationStatus: string;
};

const sourceTypes = [
  "authorized_hls",
  "authorized_srt",
  "authorized_rtmp",
  "authorized_rtsp",
  "licensed_iptv",
  "satellite_receiver",
  "partner_file_upload",
  "manual_upload",
  "sandbox_fixture",
] as const;

const verificationStatuses = [
  "pending_authorization",
  "awaiting_authorized_feed",
  "verified",
  "sandbox_ready",
] as const;

export function SourceConfigurationPanel({
  sourceId,
  initialSourceType,
  initialSecretReference,
  initialExpectedSchedule,
  initialSourceTimezone,
  initialVerificationStatus,
}: SourceConfigurationPanelProps) {
  const [sourceType, setSourceType] = useState(initialSourceType);
  const [secretReference, setSecretReference] = useState(initialSecretReference);
  const [expectedSchedule, setExpectedSchedule] = useState(initialExpectedSchedule);
  const [sourceTimezone, setSourceTimezone] = useState(initialSourceTimezone);
  const [verificationStatus, setVerificationStatus] = useState(initialVerificationStatus);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function saveConfiguration() {
    if (!sourceId) {
      setResult("No source record exists for this channel yet.");
      return;
    }

    startTransition(async () => {
      setResult(null);
      const response = await fetch(`/api/tv/sources/${sourceId}/configure`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sourceType,
          secretReference,
          expectedSchedule,
          sourceTimezone,
          verificationStatus,
          notes,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; error?: { message?: string } }
        | null;

      setResult(payload?.message ?? payload?.error?.message ?? "Configuration saved.");
    });
  }

  return (
    <div className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Live Source Configuration</h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          Save source type, expected schedule, timezone, and a server-side secret reference for
          future authorized HLS, RTMP, SRT, RTSP, or IPTV activation. Do not store raw credentials
          in the browser or database.
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm text-muted-foreground">
          Source type
          <select
            className={`${buttonStyles.select} mt-2 w-full`}
            disabled={pending}
            onChange={(event) => setSourceType(event.target.value)}
            value={sourceType}
          >
            {sourceTypes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-muted-foreground">
          Verification status
          <select
            className={`${buttonStyles.select} mt-2 w-full`}
            disabled={pending}
            onChange={(event) => setVerificationStatus(event.target.value)}
            value={verificationStatus}
          >
            {verificationStatuses.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-muted-foreground">
          Secret reference
          <input
            className="mt-2 h-11 w-full rounded-2xl border border-border bg-panel-soft px-4 text-sm text-foreground outline-none focus:border-brand-red"
            disabled={pending}
            onChange={(event) => setSecretReference(event.target.value)}
            value={secretReference}
          />
        </label>

        <label className="text-sm text-muted-foreground">
          Expected schedule
          <input
            className="mt-2 h-11 w-full rounded-2xl border border-border bg-panel-soft px-4 text-sm text-foreground outline-none focus:border-brand-red"
            disabled={pending}
            onChange={(event) => setExpectedSchedule(event.target.value)}
            value={expectedSchedule}
          />
        </label>

        <label className="text-sm text-muted-foreground">
          Source timezone
          <input
            className="mt-2 h-11 w-full rounded-2xl border border-border bg-panel-soft px-4 text-sm text-foreground outline-none focus:border-brand-red"
            disabled={pending}
            onChange={(event) => setSourceTimezone(event.target.value)}
            value={sourceTimezone}
          />
        </label>

        <label className="text-sm text-muted-foreground md:col-span-2">
          Notes
          <textarea
            className="mt-2 min-h-24 w-full rounded-[1.4rem] border border-border bg-panel-soft px-4 py-3 text-sm text-foreground outline-none focus:border-brand-red"
            disabled={pending}
            onChange={(event) => setNotes(event.target.value)}
            value={notes}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className={buttonStyles.primary}
          disabled={pending || !sourceId}
          onClick={saveConfiguration}
          type="button"
        >
          Save source configuration
        </button>
      </div>

      {result ? <p className="mt-3 text-sm font-medium text-foreground">{result}</p> : null}
    </div>
  );
}
