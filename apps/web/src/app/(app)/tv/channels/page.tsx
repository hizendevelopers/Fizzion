import { unstable_noStore as noStore } from "next/cache";

import { TvIntelligenceDashboard, type TvDashboardAd, type TvDashboardChannel } from "@/components/tv/tv-intelligence-dashboard";
import { getTvChannelOverview, listTvOccurrences } from "@/lib/tv-data";
import { listConnectedYouTubeTvChannels } from "@/lib/youtube-tv-data";

function formatDurationLabel(durationMs: number) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function estimatedMediaValue(durationMs: number, multiplier = 3400) {
  return Math.round((durationMs / 1000) * multiplier);
}

function toDateLabel(value: string | null | undefined) {
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

function toTimeSlot(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);
  const hour = parsed.getHours();
  if (hour < 6) return "Late Night";
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  if (hour < 21) return "Prime Time";
  return "Evening";
}

export default async function TvChannelsPage() {
  noStore();

  const [aryChannel, occurrences, youtubeChannels] = await Promise.all([
    getTvChannelOverview("ary-news"),
    listTvOccurrences({ limit: 50, page: 1 }),
    listConnectedYouTubeTvChannels(),
  ]);

  const realAds: TvDashboardAd[] = occurrences.items.map((occurrence) => ({
    id: occurrence.id,
    brand: occurrence.brand,
    productOrCampaign: occurrence.campaign !== "Unassigned" ? occurrence.campaign : occurrence.product,
    campaign: occurrence.campaign,
    channel: "ARY News",
    category: occurrence.classification,
    detectedAt: occurrence.startedAtUtc,
    startTimeLabel: toDateLabel(occurrence.startedAtUtc),
    endTimeLabel: toDateLabel(occurrence.endedAtUtc),
    durationMs: occurrence.durationMs,
    durationLabel: formatDurationLabel(occurrence.durationMs),
    estimatedMediaValue: estimatedMediaValue(occurrence.durationMs, 3600),
    occurrenceCount: occurrence.isFirstSeen ? 1 : 2,
    confidence: occurrence.confidenceScore ?? 0,
    detectionConfidenceLabel: occurrence.confidenceScore != null ? `${Math.round(occurrence.confidenceScore * 100)}%` : "Not available",
    programName: "Live News Bulletin",
    transcript: null,
    thumbnailUrl: null,
    videoUrl: null,
    timeSlot: toTimeSlot(occurrence.startedAtUtc),
    dateKey: occurrence.startedAtUtc?.slice(0, 10) ?? null,
    reportUrl: `/tv/occurrences/${occurrence.id}`,
    source: "real",
  }));

  const sampleHumAd: TvDashboardAd = {
    id: "hum-news-sample-coke-1",
    brand: "Coca-Cola",
    productOrCampaign: "Coca-Cola Matchday Refresh",
    campaign: "Matchday Refresh",
    channel: "Hum News",
    category: "commercial",
    detectedAt: "2026-07-22T18:42:00.000Z",
    startTimeLabel: "Jul 22, 2026, 11:42 PM",
    endTimeLabel: "Jul 22, 2026, 11:43 PM",
    durationMs: 30000,
    durationLabel: "30s",
    estimatedMediaValue: 145000,
    occurrenceCount: 3,
    confidence: 0.96,
    detectionConfidenceLabel: "96%",
    programName: "Evening Headlines",
    transcript: "Coca-Cola Matchday Refresh celebrates togetherness, cold servings, and post-match celebrations.",
    thumbnailUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    timeSlot: "Prime Time",
    dateKey: "2026-07-22",
    reportUrl: "/tv/channels",
    source: "preview",
  };

  const sampleGeoAd: TvDashboardAd = {
    id: "geo-news-sample-sprite-1",
    brand: "Sprite",
    productOrCampaign: "Sprite Summer Splash",
    campaign: "Summer Splash",
    channel: "Geo News",
    category: "commercial",
    detectedAt: "2026-07-23T08:14:00.000Z",
    startTimeLabel: "Jul 23, 2026, 1:14 PM",
    endTimeLabel: "Jul 23, 2026, 1:14 PM",
    durationMs: 20000,
    durationLabel: "20s",
    estimatedMediaValue: 92000,
    occurrenceCount: 2,
    confidence: 0.92,
    detectionConfidenceLabel: "92%",
    programName: "Geo Pakistan",
    transcript: "Sprite Summer Splash highlights instant cooling and citrus-led refreshment moments.",
    thumbnailUrl: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=900&q=80",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    timeSlot: "Afternoon",
    dateKey: "2026-07-23",
    reportUrl: "/tv/channels",
    source: "preview",
  };

  const allAds = [sampleHumAd, sampleGeoAd, ...realAds];

  const channelCards: TvDashboardChannel[] = [
    {
      id: "ary-news",
      name: "ARY News",
      logoLabel: "ARY",
      logoTone: "red",
      connectionStatus: aryChannel?.sourceAuthorizationStatus ?? "connected",
      liveStatus: aryChannel?.recordingStatus === "active" ? "live" : "offline",
      totalDetectedAds: allAds.filter((ad) => ad.channel === "ARY News").length,
      totalAdDurationMs: allAds.filter((ad) => ad.channel === "ARY News").reduce((sum, ad) => sum + ad.durationMs, 0),
      estimatedAdvertisingValue: allAds.filter((ad) => ad.channel === "ARY News").reduce((sum, ad) => sum + ad.estimatedMediaValue, 0),
      lastDetectedAdTime: allAds.find((ad) => ad.channel === "ARY News")?.startTimeLabel ?? "Not available",
      detailsHref: "/tv/channels/ary-news",
      notes: "Connected monitoring surface with real occurrences and review workflow.",
    },
    {
      id: "geo-news",
      name: "Geo News",
      logoLabel: "GEO",
      logoTone: "amber",
      connectionStatus: "connected",
      liveStatus: "live",
      totalDetectedAds: allAds.filter((ad) => ad.channel === "Geo News").length,
      totalAdDurationMs: allAds.filter((ad) => ad.channel === "Geo News").reduce((sum, ad) => sum + ad.durationMs, 0),
      estimatedAdvertisingValue: allAds.filter((ad) => ad.channel === "Geo News").reduce((sum, ad) => sum + ad.estimatedMediaValue, 0),
      lastDetectedAdTime: sampleGeoAd.startTimeLabel,
      detailsHref: "/tv/channels",
      notes: "Connected as a newsroom watchlist channel for competitive ad spotting.",
    },
    {
      id: "hum-news",
      name: "Hum News",
      logoLabel: "HUM",
      logoTone: "cyan",
      connectionStatus: "connected",
      liveStatus: "live",
      totalDetectedAds: allAds.filter((ad) => ad.channel === "Hum News").length,
      totalAdDurationMs: allAds.filter((ad) => ad.channel === "Hum News").reduce((sum, ad) => sum + ad.durationMs, 0),
      estimatedAdvertisingValue: allAds.filter((ad) => ad.channel === "Hum News").reduce((sum, ad) => sum + ad.estimatedMediaValue, 0),
      lastDetectedAdTime: sampleHumAd.startTimeLabel,
      detailsHref: "/tv/channels",
      notes: "Includes a fully visible detected advertisement with in-platform playback and report summary.",
    },
  ];

  return (
    <TvIntelligenceDashboard
      ads={allAds}
      channels={channelCards}
      youtubeChannels={youtubeChannels}
    />
  );
}
