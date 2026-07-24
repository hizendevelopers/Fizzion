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

function plusDuration(value: string, durationMs: number) {
  return new Date(new Date(value).getTime() + durationMs).toISOString();
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

  const uploadedClipAds: TvDashboardAd[] = [
    {
      id: "hum-news-upload-bonus-02",
      brand: "Bonus",
      productOrCampaign: "Bonus Chocolate Reward",
      campaign: "Bonus Chocolate Reward",
      channel: "Hum News",
      category: "commercial",
      detectedAt: "2026-07-24T10:33:00.000Z",
      startTimeLabel: toDateLabel("2026-07-24T10:33:00.000Z"),
      endTimeLabel: toDateLabel(plusDuration("2026-07-24T10:33:00.000Z", 12395)),
      durationMs: 12395,
      durationLabel: formatDurationLabel(12395),
      estimatedMediaValue: estimatedMediaValue(12395, 3700),
      occurrenceCount: 1,
      confidence: 0.99,
      detectionConfidenceLabel: "User verified",
      programName: "Manual uploaded recording",
      transcript: null,
      thumbnailUrl: "/demo/tv/manual-detections/bonus-02.jpg",
      videoUrl: "/demo/tv/manual-detections/bonus-02.mp4",
      timeSlot: toTimeSlot("2026-07-24T10:33:00.000Z"),
      dateKey: "2026-07-24",
      reportUrl: "/tv/channels",
      source: "uploaded",
      fileSizeLabel: "13.6 MB",
      resolutionLabel: "1916×1060 source",
      ingestionLabel: "Manual clip ingestion",
      analysisSummary:
        "Imported from a user-supplied TV ad recording on Friday, July 24, 2026. Duration and source resolution were verified from the file metadata, and a web preview plus poster frame were generated for in-platform review.",
    },
    {
      id: "geo-news-upload-lifebuoy-01",
      brand: "Lifebuoy",
      productOrCampaign: "Lifebuoy Germ Protection",
      campaign: "Lifebuoy Germ Protection",
      channel: "Geo News",
      category: "commercial",
      detectedAt: "2026-07-24T10:30:35.000Z",
      startTimeLabel: toDateLabel("2026-07-24T10:30:35.000Z"),
      endTimeLabel: toDateLabel(plusDuration("2026-07-24T10:30:35.000Z", 23464)),
      durationMs: 23464,
      durationLabel: formatDurationLabel(23464),
      estimatedMediaValue: estimatedMediaValue(23464, 3650),
      occurrenceCount: 1,
      confidence: 0.99,
      detectionConfidenceLabel: "User verified",
      programName: "Manual uploaded recording",
      transcript: null,
      thumbnailUrl: "/demo/tv/manual-detections/lifebuoy-01.jpg",
      videoUrl: "/demo/tv/manual-detections/lifebuoy-01.mp4",
      timeSlot: toTimeSlot("2026-07-24T10:30:35.000Z"),
      dateKey: "2026-07-24",
      reportUrl: "/tv/channels",
      source: "uploaded",
      fileSizeLabel: "25.3 MB",
      resolutionLabel: "1916×1060 source",
      ingestionLabel: "Manual clip ingestion",
      analysisSummary:
        "Imported from a user-supplied monitoring clip and assigned to the Geo News watchlist. The platform generated a playable preview, a thumbnail frame, and a structured commercial report using verified file metadata.",
    },
    {
      id: "ary-news-upload-tapal-danedar-03",
      brand: "Tapal",
      productOrCampaign: "Tapal Danedar Strong Taste",
      campaign: "Tapal Danedar Strong Taste",
      channel: "ARY News",
      category: "commercial",
      detectedAt: "2026-07-24T10:34:10.000Z",
      startTimeLabel: toDateLabel("2026-07-24T10:34:10.000Z"),
      endTimeLabel: toDateLabel(plusDuration("2026-07-24T10:34:10.000Z", 17705)),
      durationMs: 17705,
      durationLabel: formatDurationLabel(17705),
      estimatedMediaValue: estimatedMediaValue(17705, 3600),
      occurrenceCount: 1,
      confidence: 0.99,
      detectionConfidenceLabel: "User verified",
      programName: "Manual uploaded recording",
      transcript: null,
      thumbnailUrl: "/demo/tv/manual-detections/tapal-danedar-03.jpg",
      videoUrl: "/demo/tv/manual-detections/tapal-danedar-03.mp4",
      timeSlot: toTimeSlot("2026-07-24T10:34:10.000Z"),
      dateKey: "2026-07-24",
      reportUrl: "/tv/channels",
      source: "uploaded",
      fileSizeLabel: "19.2 MB",
      resolutionLabel: "1916×1060 source",
      ingestionLabel: "Manual clip ingestion",
      analysisSummary:
        "Imported from a user-supplied Tapal Danedar TV spot. The TV Intelligence dashboard now serves this clip directly inside the detected-ad workflow with verified duration, poster frame, and commercial metadata for reporting.",
    },
  ];

  const allAds = [...uploadedClipAds, ...realAds].sort((left, right) => {
    const leftTime = left.detectedAt ? new Date(left.detectedAt).getTime() : 0;
    const rightTime = right.detectedAt ? new Date(right.detectedAt).getTime() : 0;
    return rightTime - leftTime;
  });

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
      lastDetectedAdTime: allAds.find((ad) => ad.channel === "Geo News")?.startTimeLabel ?? "Not available",
      detailsHref: "/tv/channels",
      notes: "Connected as a newsroom watchlist channel with uploaded and tracked competitor commercial clips.",
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
      lastDetectedAdTime: allAds.find((ad) => ad.channel === "Hum News")?.startTimeLabel ?? "Not available",
      detailsHref: "/tv/channels",
      notes: "Includes a fully visible uploaded advertisement with in-platform playback and a complete monitoring report summary.",
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
