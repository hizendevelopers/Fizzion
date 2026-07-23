import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { StatusBadge } from "@/components/tv/status-badge";
import { getConnectedYouTubeTvChannel } from "@/lib/youtube-tv-data";

function formatCompactNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "Not available";
  }

  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }

  return parsed.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function TvChannelDetailPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  noStore();

  const { channelId } = await params;
  const channel = await getConnectedYouTubeTvChannel(channelId);

  if (!channel) {
    notFound();
  }

  const liveVideo = channel.feed.find((video) => video.liveStatus === "live") ?? null;

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex gap-4">
            {channel.thumbnailUrl ? (
              <img
                src={channel.thumbnailUrl}
                alt={channel.title}
                className="h-20 w-20 rounded-[1.6rem] border border-border object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-[1.6rem] border border-border bg-panel-soft text-sm text-muted-foreground">
                YT
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">{channel.title}</h1>
                {channel.handle ? <StatusBadge value={channel.handle} /> : null}
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                {channel.description || "No channel description returned by YouTube."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge value="youtube_api" />
                <StatusBadge value={liveVideo ? "live" : "active"} />
                <StatusBadge value="internal_monitoring_only" />
              </div>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-border bg-panel-soft px-4 py-3 text-sm text-muted-foreground">
            <p>Connected at: {formatDate(channel.connectedAt)}</p>
            <p className="mt-1">Last synced: {formatDate(channel.lastSyncedAt)}</p>
            <p className="mt-1">Subscriber count: {formatCompactNumber(channel.subscriberCount)}</p>
            <p className="mt-1">Video count: {formatCompactNumber(channel.videoCount)}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <MetricCard label="Subscribers" value={formatCompactNumber(channel.subscriberCount)} />
          <MetricCard label="Total videos" value={formatCompactNumber(channel.videoCount)} />
          <MetricCard label="Total views" value={formatCompactNumber(channel.viewCount)} />
          <MetricCard label="Live now" value={liveVideo ? "1 stream" : "No live stream"} />
        </div>
      </section>

      {liveVideo ? (
        <section className="rounded-[1.9rem] border border-brand-red/20 bg-[linear-gradient(135deg,#2f1217_0%,#5a171f_42%,#7e131b_100%)] p-5 text-white shadow-[var(--shadow-dark)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full bg-white/14 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                Pinned live stream
              </span>
              <h2 className="mt-3 text-2xl font-semibold">{liveVideo.title}</h2>
              <p className="mt-2 text-sm leading-7 text-white/72">
                {liveVideo.description || "No live-stream description returned by YouTube."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/70">
                <span className="rounded-full bg-white/10 px-3 py-1.5">Views {formatCompactNumber(liveVideo.viewCount)}</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5">Published {formatDate(liveVideo.publishedAt)}</span>
              </div>
            </div>
            <a
              href={liveVideo.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/16 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
            >
              Open live stream
            </a>
          </div>

          <div className="mt-5 overflow-hidden rounded-[1.4rem] border border-white/10 bg-black/15">
            {liveVideo.thumbnailUrl ? (
              <img src={liveVideo.thumbnailUrl} alt={liveVideo.title} className="h-[22rem] w-full object-cover" />
            ) : (
              <div className="flex h-[22rem] items-center justify-center text-sm text-white/70">No live thumbnail available</div>
            )}
          </div>
        </section>
      ) : null}

      <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Recent uploads and live history</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything returned by the connected YouTube channel feed appears here for TV-side monitoring.
            </p>
          </div>
          <Link href="/tv/channels" className="text-sm font-semibold text-brand-red">
            Back to TV channels
          </Link>
        </div>

        <div className="mt-5 grid gap-4">
          {channel.feed.length > 0 ? (
            channel.feed.map((video) => (
              <a
                key={video.id}
                href={video.url}
                target="_blank"
                rel="noreferrer"
                className="grid gap-4 rounded-[1.5rem] border border-border bg-panel-soft/65 p-4 transition hover:border-brand-red/35 md:grid-cols-[220px_1fr]"
              >
                <div className="overflow-hidden rounded-[1.2rem] border border-border bg-white">
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt={video.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full min-h-32 items-center justify-center text-sm text-muted-foreground">No thumbnail</div>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={video.liveStatus} />
                    <span className="text-xs text-muted-foreground">
                      {video.durationLabel ?? "Duration not provided"} · {formatCompactNumber(video.viewCount)} views
                    </span>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-foreground">{video.title}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Published {formatDate(video.publishedAt)}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {video.description || "No description returned by YouTube for this video."}
                  </p>
                </div>
              </a>
            ))
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-border bg-panel-soft px-4 py-8 text-center text-sm text-muted-foreground">
              No live stream or recent uploaded videos were returned for this connected channel yet.
            </div>
          )}
        </div>
      </section>
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
