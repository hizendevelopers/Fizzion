"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

import { AreaTrendCard, CategoryBarCard, ShareOfVoiceCard } from "@/components/states/insight-charts";
import { YouTubeLiveEmbed } from "@/components/tv/youtube-live-embed";
import { YouTubeTvMonitor } from "@/components/tv/youtube-tv-monitor";
import type { ConnectedYouTubeTvChannel } from "@/lib/youtube-tv-data";
import { cn } from "@/lib/utils";
import {
  FilterIcon,
  PlayIcon,
  RefreshIcon,
  SearchIcon,
  TvIcon,
  WebIcon,
} from "@/components/app/ui-icons";

export type TvDashboardAd = {
  id: string;
  brand: string;
  productOrCampaign: string;
  campaign: string;
  channel: string;
  category: string;
  detectedAt: string | null;
  startTimeLabel: string;
  endTimeLabel: string;
  durationMs: number;
  durationLabel: string;
  estimatedMediaValue: number;
  occurrenceCount: number;
  confidence: number;
  detectionConfidenceLabel: string;
  programName: string | null;
  transcript: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  timeSlot: string;
  dateKey: string | null;
  reportUrl: string;
  source: "real" | "preview" | "uploaded";
  fileSizeLabel?: string | null;
  resolutionLabel?: string | null;
  analysisSummary?: string | null;
  ingestionLabel?: string | null;
};

export type TvDashboardChannel = {
  id: string;
  name: string;
  logoLabel: string;
  logoTone: "red" | "amber" | "cyan";
  connectionStatus: string;
  liveStatus: "live" | "offline";
  totalDetectedAds: number;
  totalAdDurationMs: number;
  estimatedAdvertisingValue: number;
  lastDetectedAdTime: string;
  detailsHref: string;
  notes: string;
};

type TvIntelligenceDashboardProps = {
  channels: TvDashboardChannel[];
  ads: TvDashboardAd[];
  youtubeChannels: ConnectedYouTubeTvChannel[];
};

type TvTab = "channels" | "youtube" | "ads";
type DurationFilter = "today" | "last7" | "last14" | "last30";

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDurationLabel(durationMs: number) {
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

function buildDateSet(days: number) {
  const now = new Date();
  const dates = new Set<string>();
  for (let index = 0; index < days; index += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    dates.add(date.toISOString().slice(0, 10));
  }
  return dates;
}

function inDurationRange(ad: TvDashboardAd, duration: [number, number]) {
  const durationSeconds = Math.round(ad.durationMs / 1000);
  return durationSeconds >= duration[0] && durationSeconds <= duration[1];
}

function inPriceRange(ad: TvDashboardAd, range: [number, number]) {
  return ad.estimatedMediaValue >= range[0] && ad.estimatedMediaValue <= range[1];
}

function buildOccurrenceTrend(ads: TvDashboardAd[]) {
  const grouped = new Map<string, number>();
  for (const ad of ads) {
    if (!ad.dateKey) continue;
    grouped.set(ad.dateKey, (grouped.get(ad.dateKey) ?? 0) + 1);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      label: new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value,
    }));
}

function buildValueTrend(ads: TvDashboardAd[]) {
  const grouped = new Map<string, number>();
  for (const ad of ads) {
    if (!ad.dateKey) continue;
    grouped.set(ad.dateKey, (grouped.get(ad.dateKey) ?? 0) + ad.estimatedMediaValue);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      label: new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value,
    }));
}

function buildDurationTrend(ads: TvDashboardAd[]) {
  const grouped = new Map<string, number>();
  for (const ad of ads) {
    if (!ad.dateKey) continue;
    grouped.set(ad.dateKey, (grouped.get(ad.dateKey) ?? 0) + Math.round(ad.durationMs / 1000));
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      label: new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value,
    }));
}

function buildShareData(items: Array<{ label: string; value: number }>) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  return items.map((item) => ({
    label: item.label,
    share: item.value / total,
    valueLabel: `${Math.round((item.value / total) * 100)}%`,
    note: `${item.value.toLocaleString()} tracked units`,
  }));
}

function getChannelToneClass(tone: TvDashboardChannel["logoTone"]) {
  if (tone === "amber") return "from-[#ffbf58] to-[#ff8a00] text-[#4d2100]";
  if (tone === "cyan") return "from-[#9ce7e8] to-[#33c7c9] text-[#083d40]";
  return "from-[#ff6d63] to-[#f40009] text-white";
}

function getSourceLabel(source: TvDashboardAd["source"]) {
  if (source === "real") return "Database-backed occurrence";
  if (source === "uploaded") return "User-supplied monitoring clip";
  return "Monitored preview ad";
}

function buildYouTubeTrend(channels: ConnectedYouTubeTvChannel[]) {
  const grouped = new Map<string, { views: number; count: number }>();
  for (const channel of channels) {
    for (const video of channel.feed) {
      if (!video.publishedAt || video.viewCount == null) continue;
      const key = video.publishedAt.slice(0, 10);
      const current = grouped.get(key) ?? { views: 0, count: 0 };
      current.views += video.viewCount;
      current.count += 1;
      grouped.set(key, current);
    }
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      label: new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: value.views,
    }));
}

export function TvIntelligenceDashboard({
  channels,
  ads,
  youtubeChannels,
}: TvIntelligenceDashboardProps) {
  const [activeTab, setActiveTab] = useState<TvTab>("channels");
  const [selectedChannelId, setSelectedChannelId] = useState<string>(channels[0]?.id ?? "");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("last30");
  const [brandFilter, setBrandFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [timeSlotFilter, setTimeSlotFilter] = useState("all");
  const [durationBand, setDurationBand] = useState("all");
  const [valueBand, setValueBand] = useState("all");
  const [youtubeChannelFilter, setYouTubeChannelFilter] = useState("all");
  const [youtubeStatusFilter, setYouTubeStatusFilter] = useState("all");
  const [youtubeModeFilter, setYouTubeModeFilter] = useState("all");
  const [selectedAdId, setSelectedAdId] = useState<string>(ads[0]?.id ?? "");

  const allowedDates = useMemo(() => {
    if (durationFilter === "today") return buildDateSet(1);
    if (durationFilter === "last7") return buildDateSet(7);
    if (durationFilter === "last14") return buildDateSet(14);
    return buildDateSet(30);
  }, [durationFilter]);

  const durationRange = useMemo<[number, number]>(() => {
    if (durationBand === "short") return [0, 15];
    if (durationBand === "medium") return [16, 30];
    if (durationBand === "long") return [31, 120];
    return [0, 120];
  }, [durationBand]);

  const valueRange = useMemo<[number, number]>(() => {
    if (valueBand === "low") return [0, 25000];
    if (valueBand === "mid") return [25001, 75000];
    if (valueBand === "high") return [75001, 200000];
    return [0, 200000];
  }, [valueBand]);

  const filteredAds = useMemo(
    () =>
      ads.filter((ad) => (brandFilter === "all" ? true : ad.brand === brandFilter))
        .filter((ad) => (channelFilter === "all" ? true : ad.channel === channelFilter))
        .filter((ad) => (categoryFilter === "all" ? true : ad.category === categoryFilter))
        .filter((ad) => (timeSlotFilter === "all" ? true : ad.timeSlot === timeSlotFilter))
        .filter((ad) => (ad.dateKey ? allowedDates.has(ad.dateKey) : true))
        .filter((ad) => inDurationRange(ad, durationRange))
        .filter((ad) => inPriceRange(ad, valueRange)),
    [ads, allowedDates, brandFilter, categoryFilter, channelFilter, durationRange, timeSlotFilter, valueRange],
  );

  const filteredChannels = useMemo(
    () =>
      channels.map((channel) => ({
        ...channel,
        adItems: filteredAds.filter((ad) => ad.channel === channel.name),
      })),
    [channels, filteredAds],
  );

  const selectedChannel = filteredChannels.find((channel) => channel.id === selectedChannelId) ?? filteredChannels[0] ?? null;
  const selectedAd = filteredAds.find((ad) => ad.id === selectedAdId) ?? filteredAds[0] ?? null;

  const adBrands = [...new Set(ads.map((ad) => ad.brand))];
  const adChannels = [...new Set(ads.map((ad) => ad.channel))];
  const adCategories = [...new Set(ads.map((ad) => ad.category))];
  const timeSlots = [...new Set(ads.map((ad) => ad.timeSlot))];

  const occurrenceTrend = buildOccurrenceTrend(filteredAds);
  const durationTrend = buildDurationTrend(filteredAds);
  const valueTrend = buildValueTrend(filteredAds);
  const brandShare = buildShareData(
    adBrands.map((brand) => ({
      label: brand,
      value: filteredAds.filter((ad) => ad.brand === brand).length,
    })).filter((entry) => entry.value > 0),
  );
  const channelShare = buildShareData(
    adChannels.map((channel) => ({
      label: channel,
      value: filteredAds.filter((ad) => ad.channel === channel).length,
    })).filter((entry) => entry.value > 0),
  );
  const timeSlotDistribution = timeSlots.map((slot) => ({
    label: slot,
    value: filteredAds.filter((ad) => ad.timeSlot === slot).length,
  })).filter((entry) => entry.value > 0);

  const totalAdDurationSeconds = filteredAds.reduce((sum, ad) => sum + Math.round(ad.durationMs / 1000), 0);
  const totalMediaValue = filteredAds.reduce((sum, ad) => sum + ad.estimatedMediaValue, 0);
  const topBrands = adBrands.map((brand) => ({
    label: brand,
    value: filteredAds.filter((ad) => ad.brand === brand).length,
    note: `${formatCurrency(filteredAds.filter((ad) => ad.brand === brand).reduce((sum, ad) => sum + ad.estimatedMediaValue, 0))} PKR`,
  })).filter((entry) => entry.value > 0);

  const filteredYouTubeChannels = youtubeChannels
    .filter((channel) => (youtubeChannelFilter === "all" ? true : channel.id === youtubeChannelFilter))
    .map((channel) => ({
      ...channel,
      feed: channel.feed.filter((video) => (youtubeStatusFilter === "all" ? true : video.liveStatus === youtubeStatusFilter)),
    }))
    .filter((channel) => (youtubeModeFilter === "all"
      ? true
      : youtubeModeFilter === "live"
        ? channel.feed.some((video) => video.liveStatus === "live")
        : channel.feed.some((video) => video.liveStatus !== "live")));

  const liveEntries = filteredYouTubeChannels.flatMap((channel) =>
    channel.feed.filter((video) => video.liveStatus === "live").map((video) => ({ channel, video })),
  );

  const youtubeViewsTrend = buildYouTubeTrend(filteredYouTubeChannels);
  const youtubeChannelShare = buildShareData(
    filteredYouTubeChannels.map((channel) => ({
      label: channel.title,
      value: channel.feed.reduce((sum, video) => sum + (video.viewCount ?? 0), 0),
    })).filter((entry) => entry.value > 0),
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2.1rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-red">Media Monitoring</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">TV</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">
              Monitor linear news channels, review detected advertisements, and watch connected YouTube live feeds
              from one clean intelligence surface without leaving the platform.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <SummaryPill icon={<TvIcon />} label="Connected channels" value={`${channels.length}`} />
            <SummaryPill icon={<PlayIcon />} label="Detected ads" value={`${filteredAds.length}`} />
            <SummaryPill icon={<WebIcon />} label="YouTube channels" value={`${youtubeChannels.length}`} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 rounded-[1.6rem] border border-border bg-panel-soft/60 p-2">
          <TabButton active={activeTab === "channels"} icon={<TvIcon />} label="TV Channels" onClick={() => setActiveTab("channels")} />
          <TabButton active={activeTab === "youtube"} icon={<WebIcon />} label="YouTube Live Channels" onClick={() => setActiveTab("youtube")} />
          <TabButton active={activeTab === "ads"} icon={<PlayIcon />} label="Ads Detected" onClick={() => setActiveTab("ads")} />
        </div>
      </section>

      {activeTab !== "youtube" ? (
        <>
          <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Filter toolbar</h2>
                <p className="mt-1 text-sm text-muted-foreground">Brand, channel, date, time, category, duration, and media value filters update everything below.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDurationFilter("last30");
                  setBrandFilter("all");
                  setChannelFilter("all");
                  setCategoryFilter("all");
                  setTimeSlotFilter("all");
                  setDurationBand("all");
                  setValueBand("all");
                }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-panel-soft px-4 py-2 text-sm font-medium text-foreground"
              >
                <RefreshIcon />
                Reset filters
              </button>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-7">
              <SegmentedRange
                label="Date"
                value={durationFilter}
                options={[
                  { label: "Today", value: "today" },
                  { label: "7 days", value: "last7" },
                  { label: "14 days", value: "last14" },
                  { label: "30 days", value: "last30" },
                ]}
                onChange={(value) => setDurationFilter(value as DurationFilter)}
              />
              <SelectFilter label="Brand" value={brandFilter} options={["all", ...adBrands]} onChange={setBrandFilter} />
              <SelectFilter label="Channel" value={channelFilter} options={["all", ...adChannels]} onChange={setChannelFilter} />
              <SelectFilter label="Category" value={categoryFilter} options={["all", ...adCategories]} onChange={setCategoryFilter} />
              <SelectFilter label="Time slot" value={timeSlotFilter} options={["all", ...timeSlots]} onChange={setTimeSlotFilter} />
              <SelectFilter
                label="Duration"
                value={durationBand}
                options={["all", "short", "medium", "long"]}
                labels={{ all: "All durations", short: "0-15 sec", medium: "16-30 sec", long: "31-120 sec" }}
                onChange={setDurationBand}
              />
              <SelectFilter
                label="Media value"
                value={valueBand}
                options={["all", "low", "mid", "high"]}
                labels={{ all: "All values", low: "0-25k", mid: "25k-75k", high: "75k+" }}
                onChange={setValueBand}
              />
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-4">
            <MetricCard label="Detected advertisements" value={String(filteredAds.length)} note="Updated by active filters" />
            <MetricCard label="Total ad duration" value={`${totalAdDurationSeconds}s`} note="Summed across filtered airings" />
            <MetricCard label="Estimated ad value" value={`${formatCurrency(totalMediaValue)} PKR`} note="Derived from stored or configured rate logic" />
            <MetricCard label="Top channel" value={channelShare[0]?.label ?? "Not available"} note={channelShare[0]?.valueLabel ?? "No filtered distribution"} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <AreaTrendCard
              title="Advertisement occurrences over time"
              subtitle="Filtered airings grouped by detection day"
              data={occurrenceTrend}
              color="#F40009"
              fill="rgba(244,0,9,0.12)"
            />
            <AreaTrendCard
              title="Estimated advertising value trend"
              subtitle="Estimated monitored value by day"
              data={valueTrend}
              color="#39bb1f"
              fill="rgba(57,187,31,0.14)"
              formatter={(value) => `${formatCompactNumber(value)} PKR`}
            />
            <AreaTrendCard
              title="Advertisement duration trend"
              subtitle="Total aired ad seconds by day"
              data={durationTrend}
              color="#33c7c9"
              fill="rgba(51,199,201,0.14)"
              formatter={(value) => `${value}s`}
            />
            <ShareOfVoiceCard
              title="Brand-wise advertisement share"
              subtitle="Share of filtered TV ad volume by brand"
              data={brandShare}
            />
            <CategoryBarCard
              title="Channel-wise advertisement volume"
              subtitle="How monitored ad volume is distributed by channel"
              data={channelShare.map((entry) => ({ label: entry.label, value: Math.round(entry.share * 100), note: entry.valueLabel }))}
            />
            <CategoryBarCard
              title="Ads by time of day"
              subtitle="Filtered airings grouped by broadcast time slot"
              data={timeSlotDistribution}
            />
          </section>
        </>
      ) : null}

      {activeTab === "channels" ? (
        <div className="space-y-6">
          <section className="grid gap-4 xl:grid-cols-3">
            {filteredChannels.map((channel) => (
              <article key={channel.id} className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
                <div className="flex items-start gap-4">
                  <div className={cn("flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-gradient-to-br text-lg font-bold shadow-[var(--shadow-soft)]", getChannelToneClass(channel.logoTone))}>
                    {channel.logoLabel}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-foreground">{channel.name}</h3>
                      <StatusDot label={channel.liveStatus === "live" ? "Live" : "Offline"} tone={channel.liveStatus === "live" ? "success" : "muted"} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{channel.notes}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <MetricMini label="Connection status" value={channel.connectionStatus} />
                  <MetricMini label="Total detected ads" value={String(channel.totalDetectedAds)} />
                  <MetricMini label="Total duration" value={formatDurationLabel(channel.totalAdDurationMs)} />
                  <MetricMini label="Estimated value" value={`${formatCurrency(channel.estimatedAdvertisingValue)} PKR`} />
                  <MetricMini label="Last detected ad" value={channel.lastDetectedAdTime} />
                  <MetricMini label="Status feed" value={channel.liveStatus} />
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedChannelId(channel.id)}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition",
                      selectedChannel?.id === channel.id ? "bg-brand-red text-white" : "border border-border bg-panel-soft text-foreground",
                    )}
                  >
                    View channel details
                  </button>
                  <Link href={channel.detailsHref} className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground">
                    Open channel page
                  </Link>
                </div>
              </article>
            ))}
          </section>

          {selectedChannel ? (
            <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">{selectedChannel.name} channel details</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Every detected advertisement for this channel is summarized below with clear clip, timing, confidence, and commercial value context.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <MetricMini label="Filtered ads" value={String(selectedChannel.adItems.length)} />
                  <MetricMini label="Ad duration" value={formatDurationLabel(selectedChannel.adItems.reduce((sum, ad) => sum + ad.durationMs, 0))} />
                  <MetricMini label="Ad value" value={`${formatCurrency(selectedChannel.adItems.reduce((sum, ad) => sum + ad.estimatedMediaValue, 0))} PKR`} />
                </div>
              </div>

              {selectedChannel.adItems.length > 0 ? (
                <div className="mt-5 grid gap-4">
                  {selectedChannel.adItems.map((ad) => (
                    <article key={ad.id} className="rounded-[1.5rem] border border-border bg-panel-soft/65 p-4">
                      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
                        <div className="overflow-hidden rounded-[1.3rem] border border-border bg-white">
                          {ad.videoUrl ? (
                            <video
                              className="h-full min-h-[220px] w-full object-cover"
                              controls
                              poster={ad.thumbnailUrl ?? undefined}
                              preload="metadata"
                              src={ad.videoUrl}
                            />
                          ) : ad.thumbnailUrl ? (
                            <img src={ad.thumbnailUrl} alt={ad.productOrCampaign} className="h-full min-h-[220px] w-full object-cover" />
                          ) : (
                            <div className="flex h-full min-h-[220px] items-center justify-center bg-panel-soft text-sm text-muted-foreground">
                              Recorded clip not yet available
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusDot label={ad.brand} tone="brand" />
                            <StatusDot label={ad.category} tone="muted" />
                            <StatusDot label={ad.detectionConfidenceLabel} tone="info" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-foreground">{ad.productOrCampaign}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{ad.channel} • {ad.programName ?? "Program unavailable"}</p>
                          </div>

                          <div className="grid gap-3 md:grid-cols-3">
                            <MetricMini label="Date" value={ad.startTimeLabel} />
                            <MetricMini label="End time" value={ad.endTimeLabel} />
                            <MetricMini label="Duration" value={ad.durationLabel} />
                            <MetricMini label="Occurrences" value={String(ad.occurrenceCount)} />
                            <MetricMini label="Media value" value={`${formatCurrency(ad.estimatedMediaValue)} PKR`} />
                            <MetricMini label="Confidence" value={ad.detectionConfidenceLabel} />
                          </div>

                          <details className="rounded-[1.2rem] border border-border bg-white px-4 py-3">
                            <summary className="cursor-pointer text-sm font-semibold text-foreground">View complete report</summary>
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                              <MetricMini label="Brand" value={ad.brand} />
                              <MetricMini label="Campaign" value={ad.campaign} />
                              <MetricMini label="Channel" value={ad.channel} />
                              <MetricMini label="Time slot" value={ad.timeSlot} />
                              <MetricMini label="Program" value={ad.programName ?? "Not available"} />
                              <MetricMini label="Report action" value={getSourceLabel(ad.source)} />
                              {ad.resolutionLabel ? <MetricMini label="Resolution" value={ad.resolutionLabel} /> : null}
                              {ad.fileSizeLabel ? <MetricMini label="File size" value={ad.fileSizeLabel} /> : null}
                              {ad.ingestionLabel ? <MetricMini label="Ingested as" value={ad.ingestionLabel} /> : null}
                            </div>
                            {ad.analysisSummary ? (
                              <div className="mt-4 rounded-[1rem] bg-panel-soft px-4 py-3 text-sm leading-7 text-muted-foreground">
                                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Analysis summary</span>
                                <p className="mt-2">{ad.analysisSummary}</p>
                              </div>
                            ) : null}
                            {ad.transcript ? (
                              <div className="mt-4 rounded-[1rem] bg-panel-soft px-4 py-3 text-sm leading-7 text-muted-foreground">
                                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Transcript</span>
                                <p className="mt-2">{ad.transcript}</p>
                              </div>
                            ) : null}
                            <div className="mt-4">
                              <Link href={ad.reportUrl} className="text-sm font-semibold text-brand-red">
                                View complete report action
                              </Link>
                            </div>
                          </details>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No detected advertisements for this channel"
                  description="Adjust the brand, date, category, or duration filters to widen the monitored result set."
                />
              )}
            </section>
          ) : null}
        </div>
      ) : null}

      {activeTab === "youtube" ? (
        <div className="space-y-6">
          <YouTubeTvMonitor initialChannels={youtubeChannels} />

          <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">YouTube Live Channels</h2>
                <p className="mt-1 text-sm text-muted-foreground">Connect channels, review live streams, and monitor completed or scheduled broadcasts without leaving the platform.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <SelectFilter
                  label="Channel"
                  value={youtubeChannelFilter}
                  options={["all", ...youtubeChannels.map((channel) => channel.id)]}
                  labels={Object.fromEntries(youtubeChannels.map((channel) => [channel.id, channel.title]))}
                  onChange={setYouTubeChannelFilter}
                />
                <SelectFilter label="Video status" value={youtubeStatusFilter} options={["all", "live", "upcoming", "recorded"]} onChange={setYouTubeStatusFilter} />
                <SelectFilter label="Live or recorded" value={youtubeModeFilter} options={["all", "live", "recorded"]} onChange={setYouTubeModeFilter} />
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-4">
            <MetricCard label="Connected YouTube channels" value={String(filteredYouTubeChannels.length)} note="After active filters" />
            <MetricCard label="Live streams now" value={String(liveEntries.length)} note="Currently active embedded players" />
            <MetricCard label="Upcoming streams" value={String(filteredYouTubeChannels.flatMap((channel) => channel.feed.filter((video) => video.liveStatus === "upcoming")).length)} note="Scheduled on connected feeds" />
            <MetricCard label="Recorded videos" value={String(filteredYouTubeChannels.flatMap((channel) => channel.feed.filter((video) => video.liveStatus === "recorded")).length)} note="Completed feed coverage" />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <AreaTrendCard
              title="Views over time"
              subtitle="Views returned by connected YouTube feeds"
              data={youtubeViewsTrend}
              color="#F40009"
              fill="rgba(244,0,9,0.12)"
              formatter={(value) => formatCompactNumber(value)}
            />
            <ShareOfVoiceCard
              title="Channel comparison"
              subtitle="View share contribution from connected YouTube channels"
              data={youtubeChannelShare}
            />
          </section>

          <section className="grid gap-5">
            {filteredYouTubeChannels.length > 0 ? (
              filteredYouTubeChannels.map((channel) => {
                const liveVideo = channel.feed.find((video) => video.liveStatus === "live") ?? null;
                return (
                  <article key={channel.id} className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex items-start gap-4">
                        {channel.thumbnailUrl ? (
                          <img src={channel.thumbnailUrl} alt={channel.title} className="h-16 w-16 rounded-[1.2rem] border border-border object-cover" />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-[1.2rem] border border-border bg-panel-soft text-sm text-muted-foreground">YT</div>
                        )}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-semibold text-foreground">{channel.title}</h3>
                            {channel.handle ? <StatusDot label={channel.handle} tone="muted" /> : null}
                            <StatusDot label={liveVideo ? "live" : "connected"} tone={liveVideo ? "brand" : "success"} />
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Subscribers {formatCompactNumber(channel.subscriberCount ?? 0)} • Videos {formatCompactNumber(channel.videoCount ?? 0)} • Views {formatCompactNumber(channel.viewCount ?? 0)}
                          </p>
                          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                            {channel.description || "No channel description returned by YouTube."}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/tv/channels/${channel.id}`} className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white">
                          Open detail
                        </Link>
                        <a
                          href={channel.customUrl ?? `https://www.youtube.com/channel/${channel.channelId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-border bg-panel-soft px-4 py-2 text-sm font-medium text-foreground"
                        >
                          Open original channel
                        </a>
                      </div>
                    </div>

                    {liveVideo ? (
                      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                        <YouTubeLiveEmbed embedUrl={liveVideo.embedUrl} title={liveVideo.title} />
                        <div className="rounded-[1.4rem] border border-border bg-panel-soft/60 p-4">
                          <div className="flex items-center gap-2">
                            <StatusDot label="Live" tone="brand" />
                            <p className="text-sm font-semibold text-foreground">{liveVideo.title}</p>
                          </div>
                          <p className="mt-3 text-sm leading-7 text-muted-foreground">
                            {liveVideo.description || "No live-stream description returned by YouTube."}
                          </p>
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <MetricMini label="Status" value={liveVideo.liveStatus} />
                            <MetricMini label="Published" value={liveVideo.publishedAt ? new Date(liveVideo.publishedAt).toLocaleString("en-US") : "Not available"} />
                            {liveVideo.viewCount != null ? <MetricMini label="Views" value={formatCompactNumber(liveVideo.viewCount)} /> : null}
                            {liveVideo.durationLabel ? <MetricMini label="Duration" value={liveVideo.durationLabel} /> : null}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {channel.feed.map((video) => (
                        <article key={video.id} className="rounded-[1.3rem] border border-border bg-panel-soft/65 p-3">
                          <div className="overflow-hidden rounded-[1rem] border border-border bg-white">
                            {video.thumbnailUrl ? (
                              <img src={video.thumbnailUrl} alt={video.title} className="h-40 w-full object-cover" />
                            ) : (
                              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No thumbnail</div>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <StatusDot label={video.liveStatus} tone={video.liveStatus === "live" ? "brand" : video.liveStatus === "upcoming" ? "info" : "muted"} />
                            {video.durationLabel ? <span className="text-xs text-muted-foreground">{video.durationLabel}</span> : null}
                          </div>
                          <p className="mt-2 text-sm font-semibold text-foreground">{video.title}</p>
                          <div className="mt-3 grid gap-2">
                            <MetricMini label="Views" value={video.viewCount != null ? formatCompactNumber(video.viewCount) : "Not available"} />
                            <MetricMini label="Published date" value={video.publishedAt ? new Date(video.publishedAt).toLocaleString("en-US") : "Not available"} />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <a href={video.url} target="_blank" rel="noreferrer" className="rounded-full border border-border bg-white px-3 py-2 text-xs font-medium text-foreground">
                              Open original video
                            </a>
                          </div>
                        </article>
                      ))}
                    </div>
                  </article>
                );
              })
            ) : (
              <EmptyState
                title="No connected YouTube channels match the selected filters"
                description="Connect a YouTube channel or widen the current status filters to view live, ended, or upcoming streams."
              />
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "ads" ? (
        <div className="space-y-6">
          <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Ads Detected</h2>
                <p className="mt-1 text-sm text-muted-foreground">A centralized view of all detected advertisements across connected TV channels.</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border bg-panel-soft px-4 py-2 text-sm text-muted-foreground">
                <FilterIcon />
                {brandFilter !== "all" || channelFilter !== "all" || categoryFilter !== "all" || timeSlotFilter !== "all" ? "Multiple filters applied" : "All filters"}
              </div>
            </div>

            <div className="mt-5 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-3">
                {filteredAds.length > 0 ? (
                  filteredAds.map((ad) => (
                    <button
                      type="button"
                      key={ad.id}
                      onClick={() => setSelectedAdId(ad.id)}
                      className={cn(
                        "block w-full rounded-[1.4rem] border p-4 text-left transition",
                        selectedAd?.id === ad.id
                          ? "border-brand-red/35 bg-brand-red-soft/60"
                          : "border-border bg-panel-soft/60 hover:border-brand-red/20",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-foreground">{ad.brand}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{ad.productOrCampaign}</p>
                        </div>
                        <StatusDot label={ad.channel} tone="muted" />
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        <MetricMini label="Duration" value={ad.durationLabel} />
                        <MetricMini label="Value" value={`${formatCurrency(ad.estimatedMediaValue)} PKR`} />
                      </div>
                    </button>
                  ))
                ) : (
                  <EmptyState
                    title="No advertisements matched the selected filters"
                    description="Try resetting the brand, channel, date, or time filters to view more detected ads."
                  />
                )}
              </div>

              <div className="rounded-[1.6rem] border border-border bg-panel-soft/55 p-4">
                {selectedAd ? (
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-[1.4rem] border border-border bg-white">
                      {selectedAd.videoUrl ? (
                        <video
                          className="h-[320px] w-full object-cover"
                          controls
                          poster={selectedAd.thumbnailUrl ?? undefined}
                          preload="metadata"
                          src={selectedAd.videoUrl}
                        />
                      ) : selectedAd.thumbnailUrl ? (
                        <img src={selectedAd.thumbnailUrl} alt={selectedAd.productOrCampaign} className="h-[320px] w-full object-cover" />
                      ) : (
                        <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">Playable recorded clip not available for this detection yet.</div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <StatusDot label={selectedAd.brand} tone="brand" />
                      <StatusDot label={selectedAd.channel} tone="muted" />
                      <StatusDot label={selectedAd.detectionConfidenceLabel} tone="info" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-foreground">{selectedAd.productOrCampaign}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedAd.category} • {selectedAd.programName ?? "Program unavailable"}
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <MetricMini label="Date" value={selectedAd.startTimeLabel} />
                      <MetricMini label="End time" value={selectedAd.endTimeLabel} />
                      <MetricMini label="Duration" value={selectedAd.durationLabel} />
                      <MetricMini label="Media value" value={`${formatCurrency(selectedAd.estimatedMediaValue)} PKR`} />
                      <MetricMini label="Occurrences" value={String(selectedAd.occurrenceCount)} />
                      <MetricMini label="Confidence" value={selectedAd.detectionConfidenceLabel} />
                      {selectedAd.resolutionLabel ? <MetricMini label="Resolution" value={selectedAd.resolutionLabel} /> : null}
                      {selectedAd.fileSizeLabel ? <MetricMini label="File size" value={selectedAd.fileSizeLabel} /> : null}
                      {selectedAd.ingestionLabel ? <MetricMini label="Ingested as" value={selectedAd.ingestionLabel} /> : null}
                    </div>
                    {selectedAd.analysisSummary ? (
                      <div className="rounded-[1.3rem] border border-border bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Analysis summary</p>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">{selectedAd.analysisSummary}</p>
                      </div>
                    ) : null}
                    {selectedAd.transcript ? (
                      <div className="rounded-[1.3rem] border border-border bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Ad transcript</p>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">{selectedAd.transcript}</p>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-3">
                      <Link href={selectedAd.reportUrl} className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white">
                        View details action
                      </Link>
                    </div>
                  </div>
                ) : (
                  <EmptyState title="Select a detected ad" description="Choose an advertisement from the list to view its clip, value, and monitoring details." />
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <ShareOfVoiceCard title="Brand share" subtitle="Filtered ad mix by brand" data={brandShare} />
            <CategoryBarCard title="Top brands" subtitle="Highest filtered ad counts" data={topBrands.slice(0, 6)} />
            <CategoryBarCard title="Channel distribution" subtitle="Filtered central ad listing by channel" data={channelShare.map((entry) => ({ label: entry.label, value: Math.round(entry.share * 100), note: entry.valueLabel }))} />
          </section>
        </div>
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition",
        active ? "bg-brand-red text-white shadow-[0_18px_34px_rgba(244,0,9,0.18)]" : "text-foreground hover:bg-white",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function SummaryPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-full border border-border bg-panel-soft px-4 py-2 text-sm text-foreground">
      <span className="inline-flex items-center gap-2">
        {icon}
        <span className="font-medium">{label}</span>
        <span className="font-semibold">{value}</span>
      </span>
    </div>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-border bg-white px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function StatusDot({ label, tone }: { label: string; tone: "success" | "muted" | "brand" | "info" }) {
  const className =
    tone === "success"
      ? "bg-brand-green-soft text-brand-green-deep"
      : tone === "brand"
        ? "bg-brand-red-soft text-brand-red"
        : tone === "info"
          ? "bg-cyan-soft text-cyan"
          : "bg-panel-soft text-muted-foreground";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${className}`}>{label}</span>;
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
  labels,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  labels?: Record<string, string>;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <SearchIcon className="h-4 w-4" />
        </span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-2xl border border-border bg-panel-soft py-3 pl-10 pr-4 text-sm text-foreground"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? `All ${label}` : labels?.[option] ?? option}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

function SegmentedRange({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-panel-soft p-2">
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full px-3 py-2 text-xs font-semibold transition",
              option.value === value ? "bg-brand-red text-white" : "bg-white text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[1.6rem] border border-dashed border-border bg-panel-soft px-5 py-10 text-center">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
    </div>
  );
}
