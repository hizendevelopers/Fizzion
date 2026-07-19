"use client";

import { useState, useTransition } from "react";

import { buttonStyles } from "@/lib/button-styles";

type SourceControlPanelProps = {
  sourceId: string | null;
  channelSlug: string;
  canStart: boolean;
};

export function SourceControlPanel({
  sourceId,
  channelSlug,
  canStart,
}: SourceControlPanelProps) {
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(action: "test" | "start" | "stop") {
    if (!sourceId) {
      setResult("No source record is configured for this channel yet.");
      return;
    }

    startTransition(async () => {
      setResult(null);
      const response = await fetch(`/api/tv/sources/${sourceId}/${action}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ notes: `UI action for ${channelSlug}` }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; error?: { message?: string } }
        | null;

      setResult(payload?.message ?? payload?.error?.message ?? "Action completed.");
    });
  }

  return (
    <div className="rounded-[1.6rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center gap-3">
        <button
          className={buttonStyles.secondary}
          disabled={isPending || !sourceId}
          onClick={() => runAction("test")}
          type="button"
        >
          Test source
        </button>
        <button
          className={buttonStyles.primary}
          disabled={isPending || !sourceId || !canStart}
          onClick={() => runAction("start")}
          type="button"
        >
          Start recording
        </button>
        <button
          className={buttonStyles.dark}
          disabled={isPending || !sourceId}
          onClick={() => runAction("stop")}
          type="button"
        >
          Stop recording
        </button>
      </div>
      <p className="mt-3 text-xs leading-6 text-muted-foreground">
        Start recording remains blocked until the source authorization is approved. Sandbox source
        tests still run through the safe adapter contract.
      </p>
      {result ? <p className="mt-3 text-sm font-medium text-foreground">{result}</p> : null}
    </div>
  );
}
