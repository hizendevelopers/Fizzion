"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";

import type { ConnectedYouTubeTvChannel, YouTubeChannelSearchResult } from "@/lib/youtube-tv-data";

type YouTubeTvMonitorProps = {
  initialChannels: ConnectedYouTubeTvChannel[];
};

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

function feedBadgeClass(status: "live" | "upcoming" | "recorded") {
  if (status === "live") return "bg-brand-red text-white";
  if (status === "upcoming") return "bg-warning-soft text-warning";
  return "bg-panel-soft text-foreground";
}

export function YouTubeTvMonitor({ initialChannels }: YouTubeTvMonitorProps) {
  const [search, setSearch] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [connectBusyId, setConnectBusyId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<YouTubeChannelSearchResult[]>([]);
  const [channels, setChannels] = useState(initialChannels);
  const [status, setStatus] = useState<string | null>(null);

  const connectedIds = useMemo(() => new Set(channels.map((channel) => channel.channelId)), [channels]);

  async function runSearch() {
    const trimmed = search.trim();
    if (trimmed.length < 2) {
      setStatus("Type at least 2 characters to search for a YouTube channel.");
      setSearchResults([]);
      return;
    }

    setSearchBusy(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/tv/youtube/search?q=${encodeURIComponent(trimmed)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "Unable to search YouTube channels.");
      }

      setSearchResults(payload.items as YouTubeChannelSearchResult[]);
      if ((payload.items as YouTubeChannelSearchResult[]).length === 0) {
        setStatus("No channels matched your search. Try a different channel name or handle.");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to search YouTube channels.");
      setSearchResults([]);
    } finally {
      setSearchBusy(false);
    }
  }

  async function connectChannel(channel: YouTubeChannelSearchResult) {
    setConnectBusyId(channel.channelId);
    setStatus(null);
    try {
      const response = await fetch("/api/tv/youtube/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(channel),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "Unable to connect this YouTube channel.");
      }

      const refresh = await fetch("/api/tv/youtube/channels", { cache: "no-store" });
      const refreshedPayload = await refresh.json();
      if (!refresh.ok || !refreshedPayload.ok) {
        throw new Error(refreshedPayload.message ?? "Channel connected but refresh failed.");
      }

      setChannels(refreshedPayload.items as ConnectedYouTubeTvChannel[]);
      setStatus(`${channel.title} is now connected to TV Intelligence.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to connect this YouTube channel.");
    } finally {
      setConnectBusyId(null);
    }
  }

  return (
    <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full bg-info-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-info">
              YouTube monitoring
            </span>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">Connect any YouTube channel you want to monitor</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Search for a channel, connect it once, and TV Intelligence will show the channel&apos;s current live stream,
              upcoming broadcasts, and recent uploaded videos on this platform.
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-border bg-panel-soft px-4 py-3 text-sm text-muted-foreground">
            Connected channels: <span className="font-semibold text-foreground">{channels.length}</span>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-border bg-panel-soft/65 p-4">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_auto]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search YouTube channels by name or handle"
              className="rounded-2xl border border-border bg-white px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={runSearch}
              disabled={searchBusy}
              className="rounded-2xl bg-sidebar px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {searchBusy ? "Searching..." : "Search channels"}
            </button>
          </div>

          {status ? (
            <div className="mt-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground">
              {status}
            </div>
          ) : null}

          {searchResults.length > 0 ? (
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {searchResults.map((channel) => (
                <div key={channel.channelId} className="rounded-[1.4rem] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
                  <div className="flex gap-4">
                    <img
                      src={channel.thumbnailUrl ?? "/brand/fizzion-icon.svg"}
                      alt={channel.title}
                      className="h-16 w-16 rounded-2xl border border-border object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-foreground">{channel.title}</p>
                        {channel.handle ? (
                          <span className="rounded-full bg-panel-soft px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                            {channel.handle}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Subscribers {formatCompactNumber(channel.subscriberCount)} · Videos {formatCompactNumber(channel.videoCount)} · Views {formatCompactNumber(channel.viewCount)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {channel.description || "No channel description returned by YouTube."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <a
                      href={channel.customUrl ?? `https://www.youtube.com/channel/${channel.channelId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-brand-red underline-offset-4 hover:underline"
                    >
                      Open on YouTube
                    </a>
                    <button
                      type="button"
                      disabled={connectedIds.has(channel.channelId) || connectBusyId === channel.channelId}
                      onClick={() => connectChannel(channel)}
                      className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {connectedIds.has(channel.channelId)
                        ? "Connected"
                        : connectBusyId === channel.channelId
                          ? "Connecting..."
                          : "Connect channel"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {channels.map((channel) => (
            <article key={channel.id} className="rounded-[1.6rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-4">
                  <img
                    src={channel.thumbnailUrl ?? "/brand/fizzion-icon.svg"}
                    alt={channel.title}
                    className="h-[4.5rem] w-[4.5rem] rounded-[1.4rem] border border-border object-cover"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-foreground">{channel.title}</h3>
                      {channel.handle ? (
                        <span className="rounded-full bg-panel-soft px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                          {channel.handle}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Connected {formatDate(channel.connectedAt)} · Last synced {formatDate(channel.lastSyncedAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-panel-soft px-3 py-1.5">Subscribers {formatCompactNumber(channel.subscriberCount)}</span>
                      <span className="rounded-full bg-panel-soft px-3 py-1.5">Videos {formatCompactNumber(channel.videoCount)}</span>
                      <span className="rounded-full bg-panel-soft px-3 py-1.5">Views {formatCompactNumber(channel.viewCount)}</span>
                    </div>
                  </div>
                </div>
                <a
                  href={channel.customUrl ?? `https://www.youtube.com/channel/${channel.channelId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-border bg-panel-soft px-4 py-2 text-sm font-medium text-foreground"
                >
                  Open channel
                </a>
              </div>

              <div className="mt-5 grid gap-3">
                {channel.feed.length === 0 ? (
                  <div className="rounded-[1.4rem] border border-dashed border-border bg-panel-soft px-4 py-8 text-center text-sm text-muted-foreground">
                    No live stream or recent uploads were returned yet for this channel.
                  </div>
                ) : (
                  channel.feed.map((video) => (
                    <a
                      key={video.id}
                      href={video.url}
                      target="_blank"
                      rel="noreferrer"
                      className="grid gap-4 rounded-[1.4rem] border border-border bg-panel-soft/60 p-3 transition hover:border-brand-red/35 md:grid-cols-[188px_1fr]"
                    >
                      <div className="overflow-hidden rounded-[1.1rem] border border-border bg-white">
                        {video.thumbnailUrl ? (
                          <img src={video.thumbnailUrl} alt={video.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full min-h-28 items-center justify-center text-xs text-muted-foreground">No thumbnail</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${feedBadgeClass(video.liveStatus)}`}>
                            {video.liveStatus}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {video.durationLabel ?? "Duration not provided"} · {formatCompactNumber(video.viewCount)} views
                          </span>
                        </div>
                        <p className="mt-2 text-base font-semibold text-foreground">{video.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Published {formatDate(video.publishedAt)}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {video.description || "No video description returned by YouTube."}
                        </p>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
