import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { ConnectAccountWizard } from "@/components/social/connect-account-wizard";
import { SocialExportButton } from "@/components/social/social-export-button";
import { SocialProfileAvatar } from "@/components/social/social-profile-avatar";
import { SocialTrendChart } from "@/components/social/social-trend-chart";
import { CategoryBarCard, ShareOfVoiceCard } from "@/components/states/insight-charts";
import {
  getSocialAccountDetail,
  getSocialPortfolioSummary,
  listSocialConnections,
  listSocialContent,
  type SocialAccountDetail,
  type SocialDashboardAccount,
} from "@/lib/social-data";
import { listSocialProviderAvailability } from "@/lib/social-providers";
import { formatNumber } from "@/lib/social-utils";

type TabKey = "brands" | "influencers" | "report";
type SubTabKey = "overview" | "content";
type RangeKey = "today" | "last7" | "last14" | "last30";
type PerformanceKey = "all" | "high" | "watchlist";

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseTab(value: string | undefined): TabKey {
  return value === "influencers" || value === "report" ? value : "brands";
}

function parseSubTab(value: string | undefined): SubTabKey {
  return value === "content" ? "content" : "overview";
}

function parseRange(value: string | undefined): RangeKey {
  return value === "today" || value === "last7" || value === "last14" || value === "last30" ? value : "last30";
}

function parsePerformance(value: string | undefined): PerformanceKey {
  return value === "high" || value === "watchlist" ? value : "all";
}

function rangeToDays(range: RangeKey) {
  if (range === "today") return 1 as const;
  if (range === "last7") return 7 as const;
  if (range === "last14") return 14 as const;
  return 30 as const;
}

function classifyPersona(account: SocialDashboardAccount) {
  const haystack = `${account.accountType} ${account.accountName} ${account.username}`.toLowerCase();
  if (/(creator|influencer|blogger|artist|personal|public figure|talent)/.test(haystack)) {
    return "influencer" as const;
  }
  return "brand" as const;
}

function passesPerformanceFilter(account: SocialDashboardAccount, filter: PerformanceKey) {
  const engagementRate = account.engagementRateByFollowers ?? 0;
  if (filter === "high") return engagementRate >= 2;
  if (filter === "watchlist") return engagementRate > 0 && engagementRate < 2;
  return true;
}

function buildQuery(base: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(base)) {
    if (!value || value === "all") continue;
    params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

function formatPercent(value: number | null | undefined) {
  if (value == null) return "Not available";
  const normalized = Math.abs(value) < 0.005 ? 0 : value;
  return `${normalized.toFixed(2)}%`;
}

function formatDisplayDate(value: string | null | undefined) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function aggregateDetailTrend(details: SocialAccountDetail[]) {
  const grouped = new Map<
    string,
    {
      followers: number;
      engagements: number;
      views: number;
      reach: number;
      likes: number;
      comments: number;
      rateSum: number;
      rateCount: number;
      platforms: Map<string, number>;
    }
  >();

  for (const detail of details) {
    for (const point of detail.trend) {
      const key = point.date.slice(0, 10);
      const current =
        grouped.get(key) ??
        {
          followers: 0,
          engagements: 0,
          views: 0,
          reach: 0,
          likes: 0,
          comments: 0,
          rateSum: 0,
          rateCount: 0,
          platforms: new Map<string, number>(),
        };
      current.followers += point.followers ?? 0;
      current.engagements += point.engagements ?? 0;
      current.views += point.views ?? 0;
      current.reach += point.reach ?? 0;
      current.likes += point.averageLikes ?? 0;
      current.comments += point.averageComments ?? 0;
      if (point.engagementRate != null) {
        current.rateSum += point.engagementRate;
        current.rateCount += 1;
      }
      current.platforms.set(detail.platformLabel, (current.platforms.get(detail.platformLabel) ?? 0) + 1);
      grouped.set(key, current);
    }
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      date: `${date}T00:00:00.000Z`,
      followers: value.followers,
      following: null,
      contentCount: null,
      engagements: value.engagements,
      views: value.views,
      reach: value.reach,
      impressions: null,
      averageLikes: value.likes,
      averageComments: value.comments,
      engagementRate: value.rateCount > 0 ? value.rateSum / value.rateCount : null,
    }));
}

function buildPlatformBars(details: SocialAccountDetail[]) {
  const grouped = new Map<string, { reach: number; engagements: number; views: number }>();
  for (const detail of details) {
    const current = grouped.get(detail.platformLabel) ?? { reach: 0, engagements: 0, views: 0 };
    current.reach += detail.reach ?? 0;
    current.engagements += detail.engagements ?? 0;
    current.views += detail.views ?? 0;
    grouped.set(detail.platformLabel, current);
  }

  return [...grouped.entries()].map(([label, value]) => ({
    label,
    value: value.engagements,
    note: `Reach ${formatNumber(value.reach)} | Views ${formatNumber(value.views)}`,
  }));
}

function buildContentTypeShare(items: Awaited<ReturnType<typeof listSocialContent>>["items"]) {
  const grouped = new Map<string, number>();
  for (const item of items) {
    const key = item.contentTypeLabel || "Other";
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }
  const total = Math.max(items.length, 1);
  return [...grouped.entries()].map(([label, value]) => ({
    label,
    share: value / total,
    valueLabel: `${value} post${value === 1 ? "" : "s"}`,
    note: "Filtered content mix",
  }));
}

function buildBrandShare(details: SocialAccountDetail[]) {
  const total = Math.max(
    details.reduce((sum, detail) => sum + (detail.engagements ?? 0), 0),
    1,
  );
  return details.map((detail) => ({
    label: detail.accountName,
    share: (detail.engagements ?? 0) / total,
    valueLabel: `${formatNumber(detail.engagements)} engagements`,
    note: detail.platformLabel,
  }));
}

export default async function SocialIntelligencePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  noStore();
  const resolvedSearchParams = (await searchParams) ?? {};
  const activeTab = parseTab(getSingleSearchParam(resolvedSearchParams.tab));
  const activeSubTab = parseSubTab(getSingleSearchParam(resolvedSearchParams.subtab));
  const range = parseRange(getSingleSearchParam(resolvedSearchParams.range));
  const performance = parsePerformance(getSingleSearchParam(resolvedSearchParams.performance));
  const platform = getSingleSearchParam(resolvedSearchParams.platform) ?? "all";
  const selectedId = getSingleSearchParam(resolvedSearchParams.selected) ?? "";
  const q = getSingleSearchParam(resolvedSearchParams.q) ?? "";
  const contentType = getSingleSearchParam(resolvedSearchParams.contentType) ?? "all";
  const days = rangeToDays(range);

  const [summary, connections] = await Promise.all([getSocialPortfolioSummary(), listSocialConnections()]);
  const providers = listSocialProviderAvailability();
  const availableProviders = providers.filter((provider) => provider.available);
  const filteredConnections = connections
    .filter((connection) => (platform === "all" ? true : connection.provider === platform))
    .filter((connection) => passesPerformanceFilter(connection, performance));

  const brands = filteredConnections.filter((connection) => classifyPersona(connection) === "brand");
  const influencers = filteredConnections.filter((connection) => classifyPersona(connection) === "influencer");
  const activeConnections = activeTab === "influencers" ? influencers : brands;
  const selectedConnection = activeConnections.find((connection) => connection.id === selectedId) ?? activeConnections[0] ?? null;

  const detailTargets =
    activeTab === "report"
      ? brands.slice(0, 5)
      : selectedConnection
        ? [selectedConnection]
        : [];

  const detailRecords = await Promise.all(
    detailTargets.map((connection) => getSocialAccountDetail(connection.id, { days })),
  );
  const availableDetails = detailRecords.filter((detail): detail is SocialAccountDetail => Boolean(detail));
  const selectedDetail = activeTab === "report" ? null : availableDetails[0] ?? null;
  const selectedContent =
    selectedDetail != null
      ? await listSocialContent(selectedDetail.id, {
          days,
          page: 1,
          limit: 8,
          sort: "engagements",
          q: q || undefined,
          contentType: contentType === "all" ? undefined : contentType,
        })
      : { items: [], total: 0 };

  const reportDetails =
    activeTab === "report"
      ? (
          await Promise.all(
            brands.slice(0, 5).map((connection) => getSocialAccountDetail(connection.id, { days })),
          )
        ).filter((detail): detail is SocialAccountDetail => Boolean(detail))
      : [];

  const aggregateTrend = aggregateDetailTrend(activeTab === "report" ? reportDetails : availableDetails);
  const platformBars = buildPlatformBars(activeTab === "report" ? reportDetails : availableDetails);
  const contentTypeShare = buildContentTypeShare(selectedContent.items);
  const brandShare = buildBrandShare(reportDetails);
  const totalReach = (activeTab === "report" ? reportDetails : availableDetails).reduce((sum, detail) => sum + (detail.reach ?? 0), 0);
  const totalEngagements = (activeTab === "report" ? reportDetails : availableDetails).reduce((sum, detail) => sum + (detail.engagements ?? 0), 0);
  const totalViews = (activeTab === "report" ? reportDetails : availableDetails).reduce((sum, detail) => sum + (detail.views ?? 0), 0);
  const totalFollowers = (activeTab === "report" ? reportDetails : availableDetails).reduce((sum, detail) => sum + (detail.followers ?? 0), 0);

  const commonParams = {
    range,
    platform,
    performance,
    q,
    contentType,
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-red">Unified social monitoring</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Social</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">
              Connect brand and influencer accounts, use the provided APIFY scrapers for Facebook,
              Instagram, YouTube, and TikTok, then review imported content and performance without
              leaving the platform.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <PillStat label="Connected accounts" value={String(summary.connectedAccounts)} />
            <PillStat label="Total followers" value={formatNumber(summary.totalFollowers)} />
            <PillStat label="Total engagements" value={formatNumber(summary.totalEngagements)} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{availableProviders.length} APIFY scrapers ready</span>
          {providers.map((provider) => (
            <span
              key={provider.provider}
              className={`rounded-full border px-3 py-1 ${
                provider.available
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {provider.label}
            </span>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3 rounded-[1.5rem] border border-border bg-panel-soft/65 p-2">
          <TabLink active={activeTab === "brands"} href={`/social-intelligence${buildQuery({ ...commonParams, tab: "brands", subtab: activeSubTab, selected: selectedConnection?.id })}`} label="Brands" />
          <TabLink active={activeTab === "influencers"} href={`/social-intelligence${buildQuery({ ...commonParams, tab: "influencers", subtab: activeSubTab, selected: selectedConnection?.id })}`} label="Influencers" />
          <TabLink active={activeTab === "report"} href={`/social-intelligence${buildQuery({ ...commonParams, tab: "report" })}`} label="Report" />
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
        <form className="grid gap-3 xl:grid-cols-[200px_220px_220px_220px_1fr_auto]" method="get">
          <input type="hidden" name="tab" value={activeTab} />
          <input type="hidden" name="subtab" value={activeSubTab} />
          {selectedConnection ? <input type="hidden" name="selected" value={selectedConnection.id} /> : null}
          <select className="rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm" defaultValue={range} name="range">
            <option value="today">Today</option>
            <option value="last7">Last 7 days</option>
            <option value="last14">Last 14 days</option>
            <option value="last30">Last 30 days</option>
          </select>
          <select className="rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm" defaultValue={platform} name="platform">
            <option value="all">All platforms</option>
            {[...new Set(connections.map((item) => item.provider))].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <select className="rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm" defaultValue={contentType} name="contentType">
            <option value="all">All content types</option>
            <option value="image">Images</option>
            <option value="carousel">Carousels</option>
            <option value="reel">Reels</option>
            <option value="video">Videos</option>
          </select>
          <select className="rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm" defaultValue={performance} name="performance">
            <option value="all">All performance</option>
            <option value="high">High performing</option>
            <option value="watchlist">Watchlist</option>
          </select>
          <input
            className="rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm"
            defaultValue={q}
            name="q"
            placeholder="Search caption, account, or brand"
            type="search"
          />
          <button className="rounded-full bg-brand-red px-5 py-3 text-sm font-semibold text-white" type="submit">
            Apply filters
          </button>
        </form>
      </section>

      {activeTab === "report" ? (
        <div className="space-y-6">
          <section className="grid gap-4 xl:grid-cols-5">
            <SummaryCard label="Brands compared" value={String(reportDetails.length)} note="Filtered connected brand accounts" />
            <SummaryCard label="Total reach" value={formatNumber(totalReach)} note="Shown only when sources provide it" />
            <SummaryCard label="Total engagements" value={formatNumber(totalEngagements)} note="Likes + comments + shares + saves" />
            <SummaryCard label="Total views" value={formatNumber(totalViews)} note="Current imported totals" />
            <SummaryCard label="Total followers" value={formatNumber(totalFollowers)} note="Latest stored account snapshots" />
          </section>

          <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Executive summary</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Period: {range.replace("last", "Last ").replace("today", "Today")} | Generated on Thursday, July 23, 2026
                </p>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">
                  This report compares connected brand accounts only. Unsupported metrics remain hidden instead of being zero-filled.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <SocialExportButton dateRange={range} format="pdf" label="Download PDF Report" />
                <SocialExportButton dateRange={range} format="csv" label="Download CSV" />
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <SocialTrendChart title="Reach comparison" metric="reach" points={aggregateTrend} color="#f40009" fill="rgba(244,0,9,0.12)" valueFormatter={formatNumber} />
            <SocialTrendChart title="Engagement comparison" metric="engagements" points={aggregateTrend} color="#18a957" fill="rgba(24,169,87,0.14)" valueFormatter={formatNumber} />
            <SocialTrendChart title="Views comparison" metric="views" points={aggregateTrend} color="#06b6d4" fill="rgba(6,182,212,0.14)" valueFormatter={formatNumber} />
            <SocialTrendChart title="Followers growth" metric="followers" points={aggregateTrend} color="#8b5cf6" fill="rgba(139,92,246,0.14)" valueFormatter={formatNumber} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <CategoryBarCard title="Platform contribution" subtitle="Engagement contribution by connected platform" data={platformBars} formatter={formatNumber} />
            <ShareOfVoiceCard title="Brand share" subtitle="Engagement-weighted brand share for the selected reporting scope" data={brandShare} />
          </section>

          <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-xl font-semibold text-foreground">Best-performing brands</h2>
            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              {reportDetails.map((detail) => (
                <article className="rounded-[1.5rem] border border-border bg-panel-soft p-4" key={detail.id}>
                  <div className="flex items-start gap-4">
                    <SocialProfileAvatar imageUrl={detail.profileImageUrl} name={detail.accountName} provider={detail.provider} size="md" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-foreground">{detail.accountName}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{detail.platformLabel} | @{detail.username}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MetricTile label="Followers" value={formatNumber(detail.followers)} />
                    <MetricTile label="Reach" value={formatNumber(detail.reach)} />
                    <MetricTile label="Engagements" value={formatNumber(detail.engagements)} />
                    <MetricTile label="Engagement Rate" value={formatPercent(detail.engagementRateByFollowers)} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 xl:grid-cols-5">
            <SummaryCard label="Accounts in scope" value={String(activeConnections.length)} note={`${activeTab === "brands" ? "Brand" : "Influencer"} accounts after filters`} />
            <SummaryCard label="Followers" value={formatNumber(totalFollowers)} note="Latest connected account totals" />
            <SummaryCard label="Reach" value={formatNumber(totalReach)} note="Availability-aware rollup" />
            <SummaryCard label="Engagements" value={formatNumber(totalEngagements)} note="Current filtered totals" />
            <SummaryCard label="Views" value={formatNumber(totalViews)} note="Imported views and plays" />
          </section>

          <ConnectAccountWizard />

          <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{activeTab === "brands" ? "Connected brand accounts" : "Connected influencer accounts"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select an account to review its overview and synchronized content without leaving the main Social page.
                </p>
              </div>
              <SocialExportButton dateRange={range} format="pdf" label="Download PDF" />
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {activeConnections.length > 0 ? (
                activeConnections.map((connection) => (
                  <article
                    className={`rounded-[1.6rem] border p-4 ${selectedConnection?.id === connection.id ? "border-brand-red/30 bg-brand-red-soft/40" : "border-border bg-panel-soft"}`}
                    key={connection.id}
                  >
                    <div className="flex items-start gap-4">
                      <SocialProfileAvatar imageUrl={connection.profileImageUrl} name={connection.accountName} provider={connection.provider} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground">{connection.accountName}</h3>
                          <span className="rounded-full bg-white px-3 py-1 text-xs text-muted-foreground">{connection.platformLabel}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">@{connection.username} | {connection.accountType}</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <MetricTile label="Followers" value={formatNumber(connection.followers)} />
                          <MetricTile label="Engagement" value={formatNumber(connection.engagements)} />
                          <MetricTile label="Views" value={formatNumber(connection.views)} />
                          <MetricTile label="Engagement Rate" value={formatPercent(connection.engagementRateByFollowers)} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedConnection?.id === connection.id ? "bg-brand-red text-white" : "border border-border bg-white text-foreground"}`}
                        href={`/social-intelligence${buildQuery({
                          ...commonParams,
                          tab: activeTab,
                          subtab: activeSubTab,
                          selected: connection.id,
                        })}`}
                      >
                        Open account
                      </Link>
                      <Link className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground" href={`/social/accounts/${connection.id}`}>
                        Deep detail
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyPanel
                  title={activeTab === "brands" ? "No brand accounts match the current filters" : "No influencer accounts match the current filters"}
                  description="Connect another account or widen the current platform and performance filters."
                />
              )}
            </div>
          </section>

          {selectedDetail ? (
            <>
              <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex items-start gap-4">
                    <SocialProfileAvatar imageUrl={selectedDetail.profileImageUrl} name={selectedDetail.accountName} provider={selectedDetail.provider} size="lg" />
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground">{selectedDetail.accountName}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">@{selectedDetail.username} | {selectedDetail.platformLabel}</p>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                        {selectedDetail.bio ?? "No bio was returned for this account."}
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Last successful sync: {formatDisplayDate(selectedDetail.lastSuccessfulSyncAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${activeSubTab === "overview" ? "bg-brand-red text-white" : "border border-border bg-panel-soft text-foreground"}`}
                      href={`/social-intelligence${buildQuery({ ...commonParams, tab: activeTab, subtab: "overview", selected: selectedDetail.id })}`}
                    >
                      Overview
                    </Link>
                    <Link
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${activeSubTab === "content" ? "bg-brand-red text-white" : "border border-border bg-panel-soft text-foreground"}`}
                      href={`/social-intelligence${buildQuery({ ...commonParams, tab: activeTab, subtab: "content", selected: selectedDetail.id })}`}
                    >
                      Content
                    </Link>
                  </div>
                </div>
              </section>

              {activeSubTab === "overview" ? (
                <>
                  <section className="grid gap-6 xl:grid-cols-2">
                    <SocialTrendChart title="Reach trend" metric="reach" points={selectedDetail.trend} color="#f40009" fill="rgba(244,0,9,0.12)" valueFormatter={formatNumber} />
                    <SocialTrendChart title="Engagement trend" metric="engagements" points={selectedDetail.trend} color="#18a957" fill="rgba(24,169,87,0.14)" valueFormatter={formatNumber} />
                    <SocialTrendChart title="Followers growth" metric="followers" points={selectedDetail.trend} color="#8b5cf6" fill="rgba(139,92,246,0.14)" valueFormatter={formatNumber} />
                    <SocialTrendChart title="Views trend" metric="views" points={selectedDetail.trend} color="#06b6d4" fill="rgba(6,182,212,0.14)" valueFormatter={formatNumber} />
                  </section>

                  <section className="grid gap-6 xl:grid-cols-2">
                    <CategoryBarCard title="Platform performance" subtitle="Performance concentration for the selected account scope" data={platformBars} formatter={formatNumber} />
                    <ShareOfVoiceCard title="Content-type performance" subtitle="Current filtered mix of synchronized content" data={contentTypeShare} />
                  </section>
                </>
              ) : (
                <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Synchronized Content</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Published, tagged, collaboration, and mentioned content returned by the connected source where available.
                      </p>
                    </div>
                    <span className="rounded-full bg-panel-soft px-3 py-2 text-xs text-muted-foreground">
                      {selectedContent.total} matching items
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    {selectedContent.items.length > 0 ? (
                      selectedContent.items.map((item) => (
                        <article className="rounded-[1.5rem] border border-border bg-panel-soft p-4" key={item.id}>
                          {item.thumbnailUrl || item.mediaUrl ? (
                            <div className="mb-4 overflow-hidden rounded-[1.2rem] border border-border bg-white">
                              {item.mediaUrl && /\.(mp4|webm|mov)(\?|$)/i.test(item.mediaUrl) ? (
                                <video className="h-64 w-full object-cover" controls poster={item.thumbnailUrl ?? undefined} preload="metadata" src={item.mediaUrl} />
                              ) : (
                                <img alt={item.title || item.caption || "Social content"} className="h-64 w-full object-cover" src={item.thumbnailUrl ?? item.mediaUrl ?? undefined} />
                              )}
                            </div>
                          ) : null}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-base font-semibold text-foreground">{item.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{selectedDetail.platformLabel}</p>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-xs text-muted-foreground">{item.contentTypeLabel}</span>
                          </div>
                          <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">
                            {item.caption || item.description || "No caption returned for this content item."}
                          </p>
                          {item.hashtags.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {item.hashtags.slice(0, 6).map((hashtag) => (
                                <span className="rounded-full border border-border bg-white px-3 py-1 text-xs text-muted-foreground" key={`${item.id}-${hashtag}`}>
                                  #{hashtag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <MetricTile label="Views" value={formatNumber(item.views)} />
                            <MetricTile label="Likes" value={formatNumber(item.likes)} />
                            <MetricTile label="Comments" value={formatNumber(item.comments)} />
                            <MetricTile label="Shares" value={formatNumber(item.shares)} />
                            <MetricTile label="Reach" value={formatNumber(item.reach)} />
                            <MetricTile label="Engagement Rate" value={item.engagementRateByFollowers != null ? `${item.engagementRateByFollowers.toFixed(2)}%` : "Not available"} />
                          </div>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <Link className="text-sm font-semibold text-brand-red" href={`/social/content/${item.id}`}>Open details</Link>
                            {item.permalink ? (
                              <a className="text-sm font-semibold text-foreground" href={item.permalink} rel="noreferrer" target="_blank">
                                Open original post
                              </a>
                            ) : null}
                          </div>
                        </article>
                      ))
                    ) : (
                      <EmptyPanel
                        title="No content returned for the current filters"
                        description="Try widening the date range or clearing the content-type search filters."
                      />
                    )}
                  </div>
                </section>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function TabLink({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link
      className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${active ? "bg-brand-red text-white shadow-[0_18px_34px_rgba(244,0,9,0.18)]" : "text-foreground hover:bg-white"}`}
      href={href}
    >
      {label}
    </Link>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-border bg-white px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function PillStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-border bg-panel-soft px-4 py-2 text-sm text-foreground">
      <span className="font-medium">{label}: </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[1.6rem] border border-dashed border-border bg-panel-soft px-5 py-8 text-center text-sm text-muted-foreground xl:col-span-2">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mt-2 leading-7">{description}</p>
    </div>
  );
}
