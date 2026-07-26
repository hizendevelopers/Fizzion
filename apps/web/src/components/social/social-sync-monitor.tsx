"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SocialSyncMonitorProps = {
  connectionId: string;
  initialSyncStatus: string | null | undefined;
  initialConnectionStatus: string | null | undefined;
  initialLastError?: string | null | undefined;
  initialLastSuccessfulSyncAt?: string | null | undefined;
};

type SyncStatusPayload = {
  syncStatus?: string | null;
  lastSyncedAt?: string | null;
  lastSuccessfulSyncAt?: string | null;
  lastError?: string | null;
  latestJob?: {
    status?: string | null;
    recordsProcessed?: number | null;
    errorMessage?: string | null;
  } | null;
};

const ACTIVE_SYNC_STATES = new Set(["pending", "queued", "scraping", "syncing", "importing"]);

function shouldPoll(syncStatus: string | null | undefined, connectionStatus: string | null | undefined) {
  if (syncStatus && ACTIVE_SYNC_STATES.has(syncStatus)) {
    return true;
  }

  return connectionStatus === "pending" || connectionStatus === "importing";
}

export function SocialSyncMonitor({
  connectionId,
  initialSyncStatus,
  initialConnectionStatus,
  initialLastError,
  initialLastSuccessfulSyncAt,
}: SocialSyncMonitorProps) {
  const router = useRouter();
  const [syncStatus, setSyncStatus] = useState(initialSyncStatus ?? null);
  const [lastError, setLastError] = useState(initialLastError ?? null);
  const [lastSuccessfulSyncAt, setLastSuccessfulSyncAt] = useState(initialLastSuccessfulSyncAt ?? null);
  const [recordsProcessed, setRecordsProcessed] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(shouldPoll(initialSyncStatus, initialConnectionStatus));
  const refreshedOnceRef = useRef(false);

  useEffect(() => {
    if (!isPolling) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const response = await fetch(`/api/social/connections/${connectionId}/sync-status`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as SyncStatusPayload & {
          error?: { message?: string };
        };

        if (!response.ok) {
          throw new Error(payload?.error?.message ?? "Sync status could not be loaded.");
        }

        if (cancelled) {
          return;
        }

        const nextSyncStatus = payload.syncStatus ?? null;
        const nextLastError = payload.lastError ?? payload.latestJob?.errorMessage ?? null;
        const nextLastSuccessfulSyncAt = payload.lastSuccessfulSyncAt ?? null;
        const nextJobStatus = payload.latestJob?.status ?? null;
        const nextRecordsProcessed = payload.latestJob?.recordsProcessed ?? null;

        setSyncStatus(nextSyncStatus);
        setLastError(nextLastError);
        setLastSuccessfulSyncAt(nextLastSuccessfulSyncAt);
        setJobStatus(nextJobStatus);
        setRecordsProcessed(nextRecordsProcessed);

        const stillPolling = Boolean(nextSyncStatus && ACTIVE_SYNC_STATES.has(nextSyncStatus));
        setIsPolling(stillPolling);

        if (!stillPolling && !refreshedOnceRef.current) {
          refreshedOnceRef.current = true;
          router.refresh();
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        setLastError(error instanceof Error ? error.message : "Sync status could not be loaded.");
        setIsPolling(false);
      }
    };

    void run();
    const interval = window.setInterval(run, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [connectionId, isPolling, router]);

  const message = useMemo(() => {
    if (syncStatus === "failed") {
      return lastError ?? "Synchronization failed.";
    }

    if (isPolling) {
      if (recordsProcessed != null && recordsProcessed > 0) {
        return `Importing real account data... ${recordsProcessed} records processed so far.`;
      }

      return "Fetching real account data from Apify and importing it into Social.";
    }

    if (lastSuccessfulSyncAt) {
      return `Last successful sync: ${new Date(lastSuccessfulSyncAt).toLocaleString("en-US")}`;
    }

    return "Account sync is ready.";
  }, [isPolling, lastError, lastSuccessfulSyncAt, recordsProcessed, syncStatus]);

  const toneClass =
    syncStatus === "failed"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : isPolling
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  if (!isPolling && !lastError && !initialLastError && !initialLastSuccessfulSyncAt && !lastSuccessfulSyncAt) {
    return null;
  }

  return (
    <div className={`rounded-[1.4rem] border px-4 py-3 text-sm ${toneClass}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">
          {isPolling ? "Sync in progress" : syncStatus === "failed" ? "Sync failed" : "Sync ready"}
        </span>
        {syncStatus ? (
          <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] uppercase tracking-[0.14em]">
            {syncStatus}
          </span>
        ) : null}
        {jobStatus ? (
          <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] uppercase tracking-[0.14em]">
            job {jobStatus}
          </span>
        ) : null}
      </div>
      <p className="mt-2 leading-6">{message}</p>
    </div>
  );
}
