import { unstable_noStore as noStore } from "next/cache";

import { ReviewActionsPanel } from "@/components/tv/review-actions-panel";
import { StatusBadge } from "@/components/tv/status-badge";
import { getTvOccurrenceDetail } from "@/lib/tv-data";

export default async function TvOccurrenceDetailPage({
  params,
}: {
  params: Promise<{ occurrenceId: string }>;
}) {
  noStore();

  const { occurrenceId } = await params;
  const occurrence = await getTvOccurrenceDetail(occurrenceId);

  if (!occurrence) {
    return (
      <div className="rounded-[2rem] border border-border bg-white p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-semibold text-foreground">Occurrence not found</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          The requested TV occurrence does not exist in the current environment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2.1rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">{occurrence.brand}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {occurrence.product} · {occurrence.campaign} · {occurrence.channel}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Iraq time: {occurrence.iraqTimeLabel ?? "Pending"} · UTC start: {occurrence.startedAtUtc ?? "Pending"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={occurrence.reviewStatus} />
            <StatusBadge value={occurrence.classification} />
            <StatusBadge value={occurrence.clip?.contextStatus ?? "pending"} />
          </div>
        </div>

        <div className="mt-6 rounded-[1.8rem] border border-border bg-panel-soft p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Review player</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Exact advertisement boundaries are preserved separately from the five-second context window.
              </p>
            </div>
            <span className="rounded-full bg-brand-red-soft px-3 py-1 text-xs font-semibold text-brand-red">
              {occurrence.clip?.generationStatus ?? "pending"}
            </span>
          </div>
          <div className="mt-5 rounded-[1.5rem] bg-sidebar p-5 text-white">
            <div className="flex items-center justify-between text-sm">
              <span>Context start: {occurrence.clip?.contextStartTimeUtc ?? "Pending"}</span>
              <span>Context end: {occurrence.clip?.contextEndTimeUtc ?? "Pending"}</span>
            </div>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="flex h-full">
                <div className="bg-white/25" style={{ width: `${((occurrence.clip?.preContextMs ?? 0) / Math.max(occurrence.clip?.clipDurationMs ?? 1, 1)) * 100}%` }} />
                <div className="bg-brand-red" style={{ width: `${(((occurrence.clip?.exactAdEndOffsetMs ?? 0) - (occurrence.clip?.exactAdStartOffsetMs ?? 0)) / Math.max(occurrence.clip?.clipDurationMs ?? 1, 1)) * 100}%` }} />
                <div className="bg-white/25" style={{ width: `${((occurrence.clip?.postContextMs ?? 0) / Math.max(occurrence.clip?.clipDurationMs ?? 1, 1)) * 100}%` }} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/70">
              <span>Pre-context: {(occurrence.clip?.preContextMs ?? 0) / 1000}s</span>
              <span>Exact ad duration: {Math.round(occurrence.durationMs / 1000)}s</span>
              <span>Post-context: {(occurrence.clip?.postContextMs ?? 0) / 1000}s</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <div className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-lg font-semibold text-foreground">Detection evidence</h2>
            <div className="mt-4 space-y-3">
              {occurrence.evidence.length > 0 ? (
                occurrence.evidence.map((item) => (
                  <div key={item.id} className="rounded-[1.3rem] border border-border bg-panel-soft px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.evidenceType}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.provider ?? "provider n/a"} · model {item.modelVersion ?? "n/a"}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {item.score ?? 0}
                      </span>
                    </div>
                    {item.detectedValue ? (
                      <p className="mt-2 text-sm text-muted-foreground">{item.detectedValue}</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No separate evidence rows exist yet for this occurrence.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-lg font-semibold text-foreground">Source recordings</h2>
            <div className="mt-4 space-y-3">
              {occurrence.sources.length > 0 ? (
                occurrence.sources.map((source) => (
                  <div key={`${source.recordingFileId}-${source.sequenceOrder}`} className="rounded-[1.3rem] border border-border bg-panel-soft px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">{source.filename}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sequence {source.sequenceOrder} · {source.sourceOffsetStartMs}ms to {source.sourceOffsetEndMs}ms
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Occurrence source references have not been generated yet.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <ReviewActionsPanel
            currentClassification={occurrence.classification}
            currentStatus={occurrence.reviewStatus}
            occurrenceId={occurrence.id}
          />

          <div className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-lg font-semibold text-foreground">Review history</h2>
            <div className="mt-4 space-y-3">
              {occurrence.reviewHistory.length > 0 ? (
                occurrence.reviewHistory.map((entry) => (
                  <div key={entry.id} className="rounded-[1.3rem] border border-border bg-panel-soft px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">{entry.actionType}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{entry.createdAt}</p>
                    {entry.notes ? <p className="mt-2 text-sm text-muted-foreground">{entry.notes}</p> : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No review actions have been recorded yet.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
