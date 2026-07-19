"use client";

import { useState, useTransition } from "react";

import { buttonStyles } from "@/lib/button-styles";

type ReviewActionsPanelProps = {
  occurrenceId: string;
  currentStatus: string;
  currentClassification: string;
};

export function ReviewActionsPanel({
  occurrenceId,
  currentStatus,
  currentClassification,
}: ReviewActionsPanelProps) {
  const [reviewStatus, setReviewStatus] = useState(currentStatus);
  const [classification, setClassification] = useState(currentClassification);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitReview() {
    startTransition(async () => {
      setResult(null);
      const response = await fetch(`/api/tv/occurrences/${occurrenceId}/review`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          reviewStatus,
          classification,
          notes,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; error?: { message?: string } }
        | null;
      setResult(payload?.message ?? payload?.error?.message ?? "Review updated.");
    });
  }

  function queueRegeneration() {
    startTransition(async () => {
      setResult(null);
      const response = await fetch(`/api/tv/occurrences/${occurrenceId}/regenerate-clip`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          reason: "review_boundary_update",
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; error?: { message?: string } }
        | null;
      setResult(payload?.message ?? payload?.error?.message ?? "Clip regeneration queued.");
    });
  }

  return (
    <div className="rounded-[1.6rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-muted-foreground">
          Review status
          <select
            className="mt-2 h-11 w-full rounded-2xl border border-border bg-panel-soft px-4 text-sm text-foreground outline-none focus:border-brand-red"
            onChange={(event) => setReviewStatus(event.target.value)}
            value={reviewStatus}
          >
            <option value="pending">Pending</option>
            <option value="needs_review">Needs review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label className="text-sm text-muted-foreground">
          Classification
          <select
            className="mt-2 h-11 w-full rounded-2xl border border-border bg-panel-soft px-4 text-sm text-foreground outline-none focus:border-brand-red"
            onChange={(event) => setClassification(event.target.value)}
            value={classification}
          >
            <option value="commercial">Commercial</option>
            <option value="channel_promo">Channel promo</option>
            <option value="program_promo">Program promo</option>
            <option value="psa">PSA</option>
            <option value="non_commercial">Non-commercial</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
      </div>
      <label className="mt-4 block text-sm text-muted-foreground">
        Notes
        <textarea
          className="mt-2 min-h-28 w-full rounded-[1.4rem] border border-border bg-panel-soft px-4 py-3 text-sm text-foreground outline-none focus:border-brand-red"
          onChange={(event) => setNotes(event.target.value)}
          value={notes}
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-3">
        <button className={buttonStyles.primary} disabled={isPending} onClick={submitReview} type="button">
          Save review
        </button>
        <button className={buttonStyles.secondary} disabled={isPending} onClick={queueRegeneration} type="button">
          Regenerate clip
        </button>
      </div>
      {result ? <p className="mt-3 text-sm font-medium text-foreground">{result}</p> : null}
    </div>
  );
}
