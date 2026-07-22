import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { BottleShareOfVoiceCard } from "@/components/states/insight-charts";
import { SourceControlPanel } from "@/components/tv/source-control-panel";
import { UploadManifestPanel } from "@/components/tv/upload-manifest-panel";
import { StatusBadge } from "@/components/tv/status-badge";
import { getAuthorizationGateSummary, getTvChannelOverview } from "@/lib/tv-data";

export default async function AryNewsChannelPage() {
  noStore();

  const channel = await getTvChannelOverview("ary-news");

  if (!channel) {
    return (
      <div className="rounded-[2rem] border border-border bg-white p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-semibold text-foreground">ARY News</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          The TV workspace is not ready yet. Verify the latest Supabase migrations, TV seed data,
          and server-side environment variables before opening this page.
        </p>
      </div>
    );
  }

  const gate = getAuthorizationGateSummary(channel.source, channel.authorization);
  const brandDistribution = aggregateByBrand(channel.recentOccurrences);
  const totalBrandOccurrences = brandDistribution.reduce((sum, entry) => sum + entry.count, 0);
  const cokeCount = brandDistribution.find((entry) => entry.brand.toLowerCase().includes("coca-cola"))?.count ?? 0;
  const cokeShare = totalBrandOccurrences > 0 ? cokeCount / totalBrandOccurrences : 0;
  const bottleSegments = brandDistribution.map((entry) => ({
    label: entry.brand,
    share: totalBrandOccurrences > 0 ? entry.count / totalBrandOccurrences : 0,
    note: `${entry.count} recent TV occurrences`,
    valueLabel: `${entry.count} occurrences`,
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sidebar text-lg font-semibold text-white">
                ARY
              </span>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">ARY News</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pakistan source, Karachi source timezone, Iraq monitoring market
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge value={channel.sourceVerificationState} />
              <StatusBadge value={channel.recordingStatus} />
              <StatusBadge value={channel.currentSourceHealth} />
              <StatusBadge value={channel.source?.sourceType ?? "manual_upload"} />
            </div>
          </div>
          <div className="rounded-[1.6rem] border border-border bg-panel-soft px-4 py-3 text-sm text-muted-foreground">
            <p>Source time zone: {channel.sourceTimezone}</p>
            <p className="mt-1">Display time zone (Iraq): {channel.displayTimezone}</p>
            <p className="mt-1">Last heartbeat: {channel.lastHeartbeatAt ?? "No heartbeat yet"}</p>
            <p className="mt-1">Data freshness: {channel.lastProcessedAt ?? "Awaiting first processing run"}</p>
          </div>
        </div>

        <div className="mt-6 rounded-[1.6rem] border border-warning/25 bg-warning-soft px-5 py-4 text-sm text-foreground">
          <p className="font-semibold">Authorization gate</p>
          <p className="mt-2 leading-7">{gate.message}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Safe fallback remains available through sandbox fixtures and manual upload testing.
          </p>
          {gate.sandboxMode ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Synthetic or licensed test fixture — not live ARY News production monitoring.
            </p>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Ads detected today" value={String(channel.metrics.adsDetectedToday)} />
          <MetricCard label="Unique creatives today" value={String(channel.metrics.uniqueCreativesToday)} />
          <MetricCard label="Needs review" value={String(channel.metrics.needsReviewAds)} />
          <MetricCard label="Recording gaps" value={String(channel.metrics.recordingGapCount)} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <section className="space-y-6">
          <div className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Live monitoring panel</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Internal preview stays policy-aware and never proxies hidden public streams.
                </p>
              </div>
              <Link
                className="rounded-full border border-border bg-panel-soft px-4 py-2 text-sm font-medium text-foreground"
                href="https://live.arynews.tv/"
                target="_blank"
              >
                Open official ARY News live page
              </Link>
            </div>
            <div className="mt-5 rounded-[1.6rem] border border-border bg-[linear-gradient(180deg,#1b0d13,#3c1016)] p-6 text-white">
              <p className="text-sm font-semibold">
                {gate.previewAllowed
                  ? "Authorized internal preview can be enabled once the source adapter is active."
                  : "Live monitoring preview is unavailable under the current source authorization."}
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MiniStat label="Latency" value={channel.lastHeartbeatAt ? "Probe available" : "Awaiting"} />
                <MiniStat label="Resolution" value={channel.currentVideoResolution ?? "Pending source probe"} />
                <MiniStat label="Bitrate" value={channel.currentSourceHealth === "awaiting_authorized_feed" ? "Awaiting feed" : "Pending source probe"} />
                <MiniStat label="Audio" value={channel.currentAudioCodec ?? "Pending source probe"} />
              </div>
            </div>
          </div>

          <div className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Current timeline</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Latest recording segments, validation states, and deterministic sandbox activity.
                </p>
              </div>
              <StatusBadge value={channel.currentSourceHealth} />
            </div>
            <div className="mt-5 space-y-3">
              {channel.recentSegments.length > 0 ? (
                channel.recentSegments.map((segment) => (
                  <div
                    key={segment.id}
                    className="rounded-[1.4rem] border border-border bg-panel-soft px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{segment.filename}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {segment.startTimeUtc ?? "Unknown start"} → {segment.endTimeUtc ?? "Unknown end"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge value={segment.validationStatus} />
                        <StatusBadge value={segment.processingStatus} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-border bg-panel-soft px-4 py-5 text-sm text-muted-foreground">
                  No completed recording segments yet. Use the sandbox/manual upload flow below or
                  configure an authorized feed.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Recently detected advertisements</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Every airing remains an individual occurrence, even when the creative repeats.
                </p>
              </div>
              <Link className="text-sm font-semibold text-brand-red" href="/tv/occurrences">
                View all occurrences
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {channel.recentOccurrences.length > 0 ? (
                channel.recentOccurrences.map((occurrence) => (
                  <Link
                    key={occurrence.id}
                    className="flex flex-col gap-3 rounded-[1.4rem] border border-border bg-panel-soft px-4 py-4 transition hover:border-brand-red/30"
                    href={`/tv/occurrences/${occurrence.id}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-foreground">{occurrence.brand}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {occurrence.product} · {occurrence.campaign}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge value={occurrence.reviewStatus} />
                        <StatusBadge value={occurrence.classification} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>Iraq time: {occurrence.iraqTimeLabel ?? "Pending"}</span>
                      <span>Duration: {Math.round(occurrence.durationMs / 1000)}s</span>
                      <span>Confidence: {occurrence.confidenceScore ?? 0}</span>
                      <span>{occurrence.isFirstSeen ? "First seen" : "Known creative"}</span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-border bg-panel-soft px-4 py-5 text-sm text-muted-foreground">
                  No advertisements have been detected yet in this environment.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <SourceControlPanel
            canStart={gate.canRecord}
            channelSlug={channel.slug}
            sourceId={channel.source?.id ?? null}
            sourceType={channel.source?.sourceType ?? null}
          />
          <UploadManifestPanel />

          <div className="rounded-[1.6rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-lg font-semibold text-foreground">Source health</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>Source type: {channel.source?.sourceType ?? "Not configured"}</p>
              <p>Authorization status: {channel.authorization?.status ?? "pending"}</p>
              <p>Schedule: {channel.source?.expectedSchedule ?? channel.expectedSchedule ?? "Not set"}</p>
              <p>Last successful segment: {channel.metrics.lastSuccessfulSegment ?? "None yet"}</p>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <BottleShareOfVoiceCard
              title="Coca-Cola Share Of Voice"
              subtitle="Live TV brand mix from imported ad occurrences"
              brandLabel="Coca-Cola"
              share={cokeShare}
              segments={bottleSegments}
              supportingLabel={`${cokeCount} of ${totalBrandOccurrences} recent TV occurrences`}
            />
          </div>

          <div className="rounded-[1.6rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-lg font-semibold text-foreground">Brand distribution</h2>
            <div className="mt-4 space-y-3">
              {channel.recentOccurrences.length > 0 ? (
                brandDistribution.map((entry) => (
                  <div key={entry.brand}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{entry.brand}</span>
                      <span className="text-muted-foreground">{entry.count} occurrences</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-panel-soft">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-red to-brand-red-deep"
                        style={{ width: `${entry.width}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Brand distribution will appear once occurrence records are available.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-panel-soft px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] bg-white/8 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.14em] text-white/55">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function aggregateByBrand(
  occurrences: Array<{ brand: string }>,
): Array<{ brand: string; count: number; width: number }> {
  const counts = new Map<string, number>();
  for (const occurrence of occurrences) {
    counts.set(occurrence.brand, (counts.get(occurrence.brand) ?? 0) + 1);
  }

  const maxCount = Math.max(...counts.values(), 1);

  return [...counts.entries()].map(([brand, count]) => ({
    brand,
    count,
    width: (count / maxCount) * 100,
  }));
}
