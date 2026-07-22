import { getSocialPortfolioSummary, listSocialConnections } from "@/lib/social-data";
import { getWebAdvertisingAnalytics, listWebAdvertisingAds, listWebAdvertisingWebsites } from "@/lib/web-ad-data";
import { getOohAnalytics, listOohAssets } from "@/lib/ooh/ooh-data";
import { getOptionalSupabaseAdminClient } from "@/lib/supabase/server";

type ExecutiveRange = "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth" | "thisQuarter" | "custom";

type GenericRow = Record<string, unknown>;

function rowString(row: GenericRow, key: string, fallback = "") {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function rowNullableString(row: GenericRow, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function makeDateRange(range: ExecutiveRange, customStart?: string, customEnd?: string) {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  switch (range) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "last7":
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case "last30":
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    case "thisMonth":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "lastMonth":
      start.setMonth(start.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "thisQuarter": {
      const quarterStartMonth = Math.floor(start.getMonth() / 3) * 3;
      start.setMonth(quarterStartMonth, 1);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "custom":
      return {
        start: customStart ? new Date(customStart) : start,
        end: customEnd ? new Date(customEnd) : end,
      };
  }

  return { start, end };
}

function inRange(value: string | null | undefined, start: Date, end: Date) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return timestamp >= start.getTime() && timestamp <= end.getTime();
}

function buildDerivedActivityFeed(input: {
  socialConnections: Awaited<ReturnType<typeof listSocialConnections>>;
  websites: Awaited<ReturnType<typeof listWebAdvertisingWebsites>>;
  webAds: Awaited<ReturnType<typeof listWebAdvertisingAds>>;
  oohAssets: Awaited<ReturnType<typeof listOohAssets>>;
  start: Date;
  end: Date;
}) {
  const events: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
  }> = [];

  for (const connection of input.socialConnections) {
    if (connection.lastSuccessfulSyncAt && inRange(connection.lastSuccessfulSyncAt, input.start, input.end)) {
      events.push({
        id: `social-${connection.id}`,
        action: `Social sync completed for ${connection.accountName}`,
        entityType: "social_connection",
        createdAt: connection.lastSuccessfulSyncAt,
      });
    }
  }

  for (const website of input.websites) {
    if (website.lastScanAt && inRange(website.lastScanAt, input.start, input.end)) {
      events.push({
        id: `website-${website.id}`,
        action: `Website scan completed for ${website.name}`,
        entityType: "website_scan",
        createdAt: website.lastScanAt,
      });
    }
  }

  for (const ad of input.webAds.slice(0, 16)) {
    if (ad.capturedAt && inRange(ad.capturedAt, input.start, input.end)) {
      events.push({
        id: `webad-${ad.id}`,
        action: `Web advertisement captured on ${ad.websiteName}`,
        entityType: "web_ad_occurrence",
        createdAt: ad.capturedAt,
      });
    }
  }

  for (const asset of input.oohAssets.items.slice(0, 12)) {
    if (asset.installedAt && inRange(asset.installedAt, input.start, input.end)) {
      events.push({
        id: `ooh-${asset.id}`,
        action: `OOH asset monitored in ${asset.city}`,
        entityType: "ooh_asset",
        createdAt: asset.installedAt,
      });
    }
  }

  return events
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 18);
}

export async function getExecutiveOverview(input?: {
  range?: ExecutiveRange;
  startDate?: string;
  endDate?: string;
}) {
  const range = input?.range ?? "last30";
  const { start, end } = makeDateRange(range, input?.startDate, input?.endDate);
  const rangeLabel = `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`;

  const [socialSummary, socialConnections, websites, webAds, webAnalytics, oohAssets, oohAnalytics, supabaseData] = await Promise.all([
    getSocialPortfolioSummary(),
    listSocialConnections(),
    listWebAdvertisingWebsites(),
    listWebAdvertisingAds(),
    getWebAdvertisingAnalytics(),
    listOohAssets({ limit: 500, page: 1 }),
    getOohAnalytics({ limit: 500, page: 1 }),
    getOptionalSupabaseAdminClient()
      ? Promise.all([
          getOptionalSupabaseAdminClient()!.from("campaigns").select("*").order("created_at", { ascending: false }),
          getOptionalSupabaseAdminClient()!.from("alerts").select("*").order("created_at", { ascending: false }).limit(20),
          getOptionalSupabaseAdminClient()!.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(20),
        ])
      : Promise.resolve([{ data: [] }, { data: [] }, { data: [] }]),
  ]);

  const [campaignsRes, alertsRes, auditRes] = supabaseData;
  const campaigns = ((campaignsRes.data ?? []) as GenericRow[]).filter((row) => {
    const startDate = rowNullableString(row, "start_date");
    const endDate = rowNullableString(row, "end_date");
    return (!startDate || new Date(startDate).getTime() <= end.getTime()) &&
      (!endDate || new Date(endDate).getTime() >= start.getTime());
  });
  const alerts = (alertsRes.data ?? []) as GenericRow[];
  const audit = (auditRes.data ?? []) as GenericRow[];

  const socialContentTouchpoints = socialSummary.totalPublishedContent;
  const socialAccountTouchpoints = socialConnections.length;
  const webOccurrenceTouchpoints = webAds.filter((ad) => inRange(ad.capturedAt, start, end)).length;
  const oohTouchpoints = oohAssets.items.length;
  const totalTouchpoints = socialContentTouchpoints + socialAccountTouchpoints + webOccurrenceTouchpoints + oohTouchpoints;

  const activeCampaigns = campaigns.filter((row) => rowString(row, "status").toLowerCase() === "active").length;
  const totalConnectedSources = socialConnections.length + websites.length + (oohAssets.items.length > 0 ? 1 : 0);
  const staleSources = [
    ...socialConnections.filter((row) => row.connectionStatus === "failed" || row.tokenStatus === "expired"),
    ...websites.filter((row) => row.currentStatus === "failed"),
  ].length;

  const latestSocialSync = socialConnections.map((item) => item.lastSuccessfulSyncAt).filter(Boolean).sort().at(-1) ?? null;
  const latestWebsiteSync = websites.map((item) => item.lastScanAt).filter(Boolean).sort().at(-1) ?? null;
  const latestOohUpdate = oohAssets.items.map((item) => item.installedAt).filter(Boolean).sort().at(-1) ?? null;
  const lastSuccessfulPlatformSync = [latestSocialSync, latestWebsiteSync, latestOohUpdate].filter(Boolean).sort().at(-1) ?? null;
  const derivedActivity = buildDerivedActivityFeed({
    socialConnections,
    websites,
    webAds,
    oohAssets,
    start,
    end,
  });
  const recentActivity = (audit.length > 0
    ? audit.slice(0, 10).map((row) => ({
        id: rowString(row, "id"),
        action: rowString(row, "action"),
        entityType: rowString(row, "entity_type"),
        createdAt: rowString(row, "created_at"),
      }))
    : derivedActivity);

  const topCampaigns = campaigns.slice(0, 8).map((row) => ({
    id: rowString(row, "id"),
    name: rowString(row, "name"),
    status: rowString(row, "status", "unknown"),
    startDate: rowNullableString(row, "start_date"),
    endDate: rowNullableString(row, "end_date"),
  }));

  return {
    summary: {
      workspaceName: "Coca-Cola Iraq",
      rangeLabel,
      lastSuccessfulPlatformSync,
      freshness: staleSources > 0 ? "Some sources are stale" : "Updated through module syncs",
    },
    kpis: {
      totalConnectedDataSources: totalConnectedSources,
      totalActiveCampaigns: activeCampaigns,
      totalTouchpoints,
      activeOohAssets: oohAssets.items.length,
      connectedSocialAccounts: socialConnections.length,
      publishedSocialContent: socialSummary.totalPublishedContent,
      detectedWebAdvertisements: webOccurrenceTouchpoints,
      totalReach: socialSummary.totalReach,
      totalImpressions: socialSummary.totalImpressions + oohAnalytics.estimatedDailyImpressions,
      totalEngagements: socialSummary.totalEngagements,
      averageEngagementRate: socialSummary.averageEngagementRate,
      activeDataAlerts: alerts.length,
      sourcesRequiringReauthorization: socialConnections.filter((row) => row.connectionStatus === "REAUTHORIZATION_REQUIRED" || row.tokenStatus === "expired").length,
    },
    channelBreakdown: [
      {
        key: "ooh",
        title: "OOH Intelligence",
        activeSources: oohAssets.items.length > 0 ? 1 : 0,
        touchpoints: oohTouchpoints,
        campaigns: activeCampaigns,
        freshness: latestOohUpdate ? `Updated ${latestOohUpdate}` : "Awaiting first synchronization",
      },
      {
        key: "social",
        title: "Social Intelligence",
        activeSources: socialConnections.length,
        touchpoints: socialAccountTouchpoints + socialContentTouchpoints,
        campaigns: activeCampaigns,
        freshness: latestSocialSync ? `Updated ${latestSocialSync}` : "Awaiting first synchronization",
      },
      {
        key: "web",
        title: "Web Advertising",
        activeSources: websites.length,
        touchpoints: webOccurrenceTouchpoints,
        campaigns: activeCampaigns,
        freshness: latestWebsiteSync ? `Updated ${latestWebsiteSync}` : "Awaiting first synchronization",
      },
    ],
    campaignPerformance: topCampaigns,
    topContent: webAds.slice(0, 5).map((ad) => ({
      id: ad.id,
      title: ad.websiteName,
      subtitle: ad.pageTitle ?? ad.pageUrl,
      confidence: ad.confidence,
      firstSeenAt: ad.firstSeenAt,
    })),
    recentActivity,
    alerts: alerts.slice(0, 8).map((row) => ({
      id: rowString(row, "id"),
      status: rowString(row, "status", "open"),
      title: rowString(row, "title", rowString(row, "rule_key", "Alert")),
      createdAt: rowString(row, "created_at"),
    })),
    dataHealth: {
      staleSources,
      failedWebsiteScans: websites.filter((row) => row.currentStatus === "failed").length,
      socialReauthRequired: socialConnections.filter((row) => row.connectionStatus === "REAUTHORIZATION_REQUIRED").length,
      oohMissingCoordinates: oohAssets.items.filter((row) => row.latitude == null || row.longitude == null).length,
    },
    freshness: {
      social: latestSocialSync,
      web: latestWebsiteSync,
      ooh: latestOohUpdate,
    },
    webAnalytics,
  };
}
