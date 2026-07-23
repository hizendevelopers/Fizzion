import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { StatusBadge } from "@/components/tv/status-badge";
import { getTvChannelOverview } from "@/lib/tv-data";
import { YouTubeTvMonitor } from "@/components/tv/youtube-tv-monitor";
import { listConnectedYouTubeTvChannels } from "@/lib/youtube-tv-data";

export default async function TvChannelsPage() {
  noStore();

  const [aryChannel, youtubeChannels] = await Promise.all([
    getTvChannelOverview("ary-news"),
    listConnectedYouTubeTvChannels(),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2.1rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-3xl font-semibold text-foreground">TV Channels</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          ARY News is configured as a channel-level monitoring surface with authorization gating,
          source health, sandbox fallback, and occurrence visibility.
        </p>
      </section>

      <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        {aryChannel ? (
          <Link
            className="flex flex-col gap-4 rounded-[1.6rem] border border-border bg-panel-soft p-5 transition hover:border-brand-red/35"
            href="/tv/channels/ary-news"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">ARY News</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {aryChannel.category} · {aryChannel.monitoringMarket} · {aryChannel.displayTimezone}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={aryChannel.source?.sourceType ?? "manual_upload"} />
                <StatusBadge value={aryChannel.sourceVerificationState} />
                <StatusBadge value={aryChannel.recordingStatus} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Ads today</p>
                <p className="mt-2 font-semibold text-foreground">{aryChannel.metrics.adsDetectedToday}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Unique creatives</p>
                <p className="mt-2 font-semibold text-foreground">{aryChannel.metrics.uniqueCreativesToday}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Needs review</p>
                <p className="mt-2 font-semibold text-foreground">{aryChannel.metrics.needsReviewAds}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Recording gaps</p>
                <p className="mt-2 font-semibold text-foreground">{aryChannel.metrics.recordingGapCount}</p>
              </div>
            </div>
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">
            The TV workspace is not ready yet. Check the latest Supabase migrations, TV seed data,
            and server-side environment variables first.
          </p>
        )}
      </section>

      <YouTubeTvMonitor initialChannels={youtubeChannels} />
    </div>
  );
}
