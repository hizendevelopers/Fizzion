import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { SocialAccountActions } from "@/components/social/social-account-actions";
import { SocialExportButton } from "@/components/social/social-export-button";
import { SocialProfileAvatar } from "@/components/social/social-profile-avatar";
import { SocialTrendChart } from "@/components/social/social-trend-chart";
import { CategoryBarCard, RadialStatCard, ShareOfVoiceCard } from "@/components/states/insight-charts";
import { getSocialAccountDetail, listSocialContent } from "@/lib/social-data";
import { formatNumber } from "@/lib/social-utils";

export default async function SocialAccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ accountId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  noStore();
  const { accountId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const days = parseDaysFilter(resolvedSearchParams.range);
  const contentType = getSingleSearchParam(resolvedSearchParams.contentType) ?? "all";
  const sort = parseSortFilter(resolvedSearchParams.sort);
  const query = getSingleSearchParam(resolvedSearchParams.q) ?? "";
  const detail = await getSocialAccountDetail(accountId, { days });

  if (!detail) {
    return (
      <div className="rounded-[2rem] border border-border bg-white p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-semibold text-foreground">Social account not found</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          This account has not been connected yet, or it was removed from the current workspace.
        </p>
      </div>
    );
  }

  const content = await listSocialContent(accountId, {
    page: 1,
    limit: 8,
    sort,
    q: query || undefined,
    contentType: contentType === "all" ? undefined : contentType,
  });

  const sectionTabs = [
    { label: "Overview", href: "#overview" },
    { label: "Growth", href: "#growth" },
    { label: "Engagement", href: "#engagement" },
    { label: "History", href: "#history" },
    { label: "Posts", href: "#posts" },
  ];
  const dateRangeOptions = [
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
    { value: "90", label: "Last 90 days" },
    { value: "all", label: "All time" },
  ];
  const contentTypeOptions = [
    { value: "all", label: "All content" },
    { value: "image", label: "Images" },
    { value: "carousel", label: "Carousels" },
    { value: "reel", label: "Reels" },
    { value: "video", label: "Videos" },
    { value: "post", label: "Posts" },
  ];
  const metricAvailability = [
    { label: "Followers", value: detail.followers ?? 0, color: "#22c55e" },
    { label: "Engagements", value: detail.engagements ?? 0, color: "#ef4444" },
    { label: "Views", value: detail.views ?? 0, color: "#06b6d4" },
    { label: "Posts", value: detail.contentCount ?? 0, color: "#8b5cf6" },
  ];
  const hashtagPerformance = detail.topHashtags.slice(0, 6).map((item) => ({
    label: item.hashtag,
    value: item.engagements,
    note: `${item.postCount} posts · Reach ${formatNumber(item.reach)}`,
  }));
  const topPostConfidenceTotal = Math.max(content.items.length, 1);
  const postsWithMetrics = content.items.filter((item) => item.engagements != null || item.views != null).length;
  const contentTypeCounts = new Map<string, number>();
  for (const item of content.items) {
    const label = item.contentTypeLabel || "Other";
    contentTypeCounts.set(label, (contentTypeCounts.get(label) ?? 0) + 1);
  }
  const contentTypeShareOfVoice = [...contentTypeCounts.entries()]
    .map(([label, value]) => ({
      label,
      share: value / Math.max(content.items.length, 1),
      valueLabel: `${value} post${value === 1 ? "" : "s"}`,
      note: "Based on currently filtered content",
    }))
    .sort((left, right) => right.share - left.share);

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-5">
            <SocialProfileAvatar
              imageUrl={detail.profileImageUrl}
              name={detail.accountName}
              provider={detail.provider}
              size="lg"
            />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-panel-soft px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {detail.platformLabel}
                </span>
                {detail.verified ? (
                  <span className="rounded-full bg-brand-red/10 px-3 py-1 text-xs font-medium text-brand-red">
                    Verified
                  </span>
                ) : null}
                <span className="rounded-full bg-panel-soft px-3 py-1 text-xs text-muted-foreground">
                  {detail.syncStatus}
                </span>
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">{detail.username}</h1>
              <p className="mt-1 text-xl text-muted-foreground">{detail.accountName}</p>
              <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
                {detail.bio ?? "No description is available for this social account yet."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                {detail.publicProfileUrl ? (
                  <a href={detail.publicProfileUrl} rel="noreferrer" target="_blank" className="text-brand-red">
                    {detail.publicProfileUrl}
                  </a>
                ) : null}
                <span>
                  Tracked since {detail.insights.trackedSince ? formatDisplayDate(detail.insights.trackedSince) : "Not available"}
                </span>
                <span>Updated {detail.lastSuccessfulSyncAt ? formatRelativeTime(detail.lastSuccessfulSyncAt) : "Not available"}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 xl:min-w-[480px]">
            <div className="grid gap-4 md:grid-cols-3">
              <TopMetric
                label="Followers"
                value={formatNumber(detail.followers)}
                delta={formatDelta(detail.insights.weeklyFollowerGain)}
                positive={detail.insights.weeklyFollowerGain != null ? detail.insights.weeklyFollowerGain >= 0 : null}
              />
              <TopMetric label="Following" value={formatNumber(detail.following)} />
              <TopMetric
                label="Posts"
                value={formatNumber(detail.contentCount)}
                delta={formatDelta(detail.historyRows[0]?.mediaCountDelta ?? null)}
                positive={detail.historyRows[0]?.mediaCountDelta != null ? (detail.historyRows[0]?.mediaCountDelta ?? 0) >= 0 : null}
              />
            </div>

            <div className="rounded-[1.6rem] border border-border bg-panel-soft p-4" id="overview">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Real data coverage</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Imported through Apify public scraping. Metrics only appear when the source actually returns them.
                  </p>
                </div>
                <a
                  className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-foreground transition hover:bg-brand-red hover:text-white"
                  href="#connection-health"
                >
                  View sync health
                </a>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <SocialExportButton connectionId={detail.id} label="Export Account CSV" />
              {detail.publicProfileUrl ? (
                <a
                  className="rounded-full border border-border bg-panel-soft px-4 py-2 text-sm font-medium text-foreground"
                  href={detail.publicProfileUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open Public Profile
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-border bg-white p-3 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap gap-3">
          {sectionTabs.map((tab, index) => (
            <a
              className={
                "rounded-full px-4 py-2 text-sm transition hover:bg-panel-soft hover:text-foreground " +
                (index === 0 ? "bg-panel-soft font-semibold text-foreground" : "text-muted-foreground")
              }
              href={tab.href}
              key={tab.label}
            >
              {tab.label}
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
        <form className="grid gap-3 xl:grid-cols-[1fr_220px_220px_220px_auto]" method="get">
          <input
            className="rounded-[1rem] border border-border bg-panel-soft px-4 py-3 text-sm text-foreground outline-none ring-0 placeholder:text-muted-foreground"
            defaultValue={query}
            name="q"
            placeholder="Search caption or title"
            type="search"
          />
          <select
            className="rounded-[1rem] border border-border bg-panel-soft px-4 py-3 text-sm text-foreground outline-none"
            defaultValue={days == null ? "all" : String(days)}
            name="range"
          >
            {dateRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-[1rem] border border-border bg-panel-soft px-4 py-3 text-sm text-foreground outline-none"
            defaultValue={contentType}
            name="contentType"
          >
            {contentTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-[1rem] border border-border bg-panel-soft px-4 py-3 text-sm text-foreground outline-none"
            defaultValue={sort}
            name="sort"
          >
            <option value="engagements">Top engagements</option>
            <option value="views">Top views</option>
            <option value="reach">Top reach</option>
            <option value="engagement_rate">Top engagement rate</option>
            <option value="newest">Newest first</option>
          </select>
          <div className="flex gap-3">
            <button
              className="rounded-full bg-sidebar px-5 py-3 text-sm font-medium text-white"
              type="submit"
            >
              Apply filters
            </button>
            <Link
              className="rounded-full border border-border bg-panel-soft px-5 py-3 text-sm font-medium text-foreground"
              href={`/social/accounts/${accountId}`}
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="grid gap-5 xl:grid-cols-5" id="growth">
        <InsightCard
          label="Followers Growth Rate"
          note="30-day"
          value={formatPercent(detail.insights.followerGrowthRate30Days)}
        />
        <InsightCard
          label="Weekly Followers"
          note="Net gain over 7 days"
          value={formatNumber(detail.insights.weeklyFollowerGain)}
        />
        <InsightCard
          label="Engagement Rate"
          note="Average over 30 days"
          value={formatPercent(detail.insights.averageEngagementRateLast30Days)}
        />
        <InsightCard
          label="Average Likes"
          note="Last 30 days"
          value={formatNumber(detail.insights.averageLikesLast30Days)}
        />
        <InsightCard
          label="Average Comments"
          note="Last 30 days"
          value={formatNumber(detail.insights.averageCommentsLast30Days)}
        />
        <InsightCard
          label="Weekly Posts"
          note="Published in last 7 days"
          value={formatNumber(detail.insights.weeklyPosts)}
        />
        <InsightCard
          label="Followers Ratio"
          note="Followers / following"
          value={detail.insights.followersToFollowingRatio != null ? `${detail.insights.followersToFollowingRatio.toFixed(2)}x` : "Not available"}
        />
        <InsightCard
          label="Comments / Post"
          note="Last 30 days"
          value={detail.insights.commentsPerPostLast30Days != null ? detail.insights.commentsPerPostLast30Days.toFixed(2) : "Not available"}
        />
        <InsightCard
          label="Views"
          note="Current imported total"
          value={formatNumber(detail.views)}
        />
        <InsightCard
          label="Engagements"
          note="Current imported total"
          value={formatNumber(detail.engagements)}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2" id="engagement">
        <SocialTrendChart
          title="Followers"
          metric="followers"
          points={detail.trend}
          color="#22c55e"
          fill="rgba(34,197,94,0.14)"
          valueFormatter={formatNumber}
        />
        <SocialTrendChart
          title="Following"
          metric="following"
          points={detail.trend}
          color="#06b6d4"
          fill="rgba(6,182,212,0.14)"
          valueFormatter={formatNumber}
        />
        <SocialTrendChart
          title="Engagement Rate"
          metric="engagementRate"
          points={detail.trend}
          color="#fb923c"
          fill="rgba(251,146,60,0.14)"
          valueFormatter={(value) => formatPercent(value)}
        />
        <SocialTrendChart
          title="Average Likes"
          metric="averageLikes"
          points={detail.trend}
          color="#ef4444"
          fill="rgba(239,68,68,0.14)"
          valueFormatter={formatNumber}
        />
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <CategoryBarCard
          data={hashtagPerformance}
          subtitle="Top hashtags ranked by real imported engagement totals"
          title="Hashtag Performance"
          formatter={formatNumber}
          emptyLabel="No hashtag performance data is available for this account yet."
        />
        <RadialStatCard
          color="#8b5cf6"
          subtitle="Recent filtered content items that currently have real metric coverage"
          title="Content Metric Coverage"
          total={topPostConfidenceTotal}
          value={postsWithMetrics}
          valueLabel={`${Math.round((postsWithMetrics / topPostConfidenceTotal) * 100)}%`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <CategoryBarCard
          data={metricAvailability}
          subtitle="Current imported totals across the account summary"
          title="Account Metric Mix"
          formatter={formatNumber}
          emptyLabel="No account-level metric mix is available yet."
        />
        <ShareOfVoiceCard
          data={
            contentTypeShareOfVoice.length > 0
              ? contentTypeShareOfVoice
              : [{ label: "No content", share: 0, valueLabel: "0 posts", note: "No filtered content available" }]
          }
          subtitle="Share of the current filtered content mix by content type"
          title="Share Of Voice by Content Type"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-1">
        <CategoryBarCard
          data={content.items.slice(0, 5).map((item) => ({
            label: item.title || item.contentTypeLabel,
            value: item.engagements ?? item.views ?? 0,
            note: `${item.contentTypeLabel} · ${formatDisplayDate(item.publishedAt)}`,
          }))}
          subtitle="Top visible content items from the active filter set"
          title="Content Performance Snapshot"
          formatter={formatNumber}
          emptyLabel="No content performance snapshot is available for the current filters."
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]" id="history">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Historical Stats</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Each row comes from a real stored account snapshot. No interpolation or fabricated days are added.
              </p>
            </div>
            <span className="rounded-full bg-panel-soft px-3 py-2 text-xs text-muted-foreground">
              {detail.historyRows.length} snapshots
            </span>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Followers</th>
                  <th className="px-4 py-3">Following</th>
                  <th className="px-4 py-3">Media Count</th>
                  <th className="px-4 py-3">Engagement Rate</th>
                </tr>
              </thead>
              <tbody>
                {detail.historyRows.length > 0 ? (
                  detail.historyRows.map((row) => (
                    <tr className="border-b border-border/70 last:border-b-0" key={row.date}>
                      <td className="px-4 py-4 font-medium text-foreground">{formatDisplayDate(row.date)}</td>
                      <td className="px-4 py-4 text-muted-foreground">
                        <DeltaValue value={row.followers} delta={row.followersDelta} />
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        <DeltaValue value={row.following} delta={row.followingDelta} />
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        <DeltaValue value={row.mediaCount} delta={row.mediaCountDelta} />
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        <DeltaValue
                          value={row.engagementRate != null ? Number(row.engagementRate.toFixed(2)) : null}
                          delta={row.engagementRateDelta}
                          suffix="%"
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-5 text-muted-foreground" colSpan={5}>
                      No historical snapshots are available for this account yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          <div
            className="rounded-[1.7rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]"
            id="connection-health"
          >
            <h2 className="text-lg font-semibold text-foreground">Connection Health</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>Connection status: {detail.connectionStatus}</p>
              <p>Token status: {detail.tokenStatus}</p>
              <p>Sync status: {detail.syncStatus}</p>
              <p>Last successful sync: {detail.lastSuccessfulSyncAt ?? "Not available"}</p>
              <p>Next sync: {detail.nextSyncAt ?? "Not scheduled"}</p>
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <SocialAccountActions connectionId={detail.id} />
            </div>
          </div>

          <div className="rounded-[1.7rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-lg font-semibold text-foreground">Top Hashtags</h2>
            <div className="mt-4 space-y-3">
              {detail.topHashtags.length > 0 ? (
                detail.topHashtags.map((item) => (
                  <div className="rounded-[1.3rem] bg-panel-soft px-4 py-3" key={item.hashtag}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-foreground">{item.hashtag}</span>
                      <span className="text-xs text-muted-foreground">{item.postCount} posts</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Engagements: {formatNumber(item.engagements)} · Reach: {formatNumber(item.reach)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hashtags are available for this account yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]" id="posts">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Top Posts</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Real imported content sorted by engagements, with original caption and live imported metrics.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Showing {content.total} matching records for the current filters.
            </p>
          </div>
          <span className="rounded-full bg-panel-soft px-3 py-2 text-xs text-muted-foreground">
            Sorted by engagements
          </span>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {content.items.length > 0 ? (
            content.items.map((item) => (
              <Link
                className="rounded-[1.5rem] border border-border bg-panel-soft p-4 transition hover:border-brand-red/30"
                href={`/social/content/${item.id}`}
                key={item.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.contentTypeLabel} · {formatDisplayDate(item.publishedAt)}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-muted-foreground">
                    {formatNumber(item.engagements)} engagements
                  </span>
                </div>
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">
                  {item.caption || item.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Likes: {formatNumber(item.likes)}</span>
                  <span>Comments: {formatNumber(item.comments)}</span>
                  <span>Views: {formatNumber(item.views)}</span>
                  <span>Reach: {formatNumber(item.reach)}</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-border bg-panel-soft px-5 py-6 text-sm text-muted-foreground xl:col-span-2">
              No content has been synchronized for this account yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function TopMetric({
  label,
  value,
  delta,
  positive = null,
}: {
  label: string;
  value: string;
  delta?: string | null;
  positive?: boolean | null;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-white px-4 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      {delta ? (
        <p className={`mt-2 text-sm ${positive == null ? "text-muted-foreground" : positive ? "text-emerald-600" : "text-red-500"}`}>
          {delta}
        </p>
      ) : null}
    </div>
  );
}

function InsightCard({
  label,
  note,
  value,
}: {
  label: string;
  note: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-4 text-4xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

function DeltaValue({
  value,
  delta,
  suffix = "",
}: {
  value: number | null;
  delta: number | null;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium text-foreground">
        {value != null ? `${formatNumber(value)}${suffix}` : "Not available"}
      </span>
      {delta != null ? (
        <span
          className={`rounded-full px-2 py-1 text-xs ${
            delta >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
          }`}
        >
          {delta >= 0 ? "+" : ""}
          {suffix ? delta.toFixed(2) : formatNumber(delta)}
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

function formatPercent(value: number | null) {
  return value != null ? `${value.toFixed(2)}%` : "Not available";
}

function formatDelta(value: number | null) {
  if (value == null) {
    return null;
  }
  return `${value >= 0 ? "+" : ""}${formatNumber(value)}`;
}

function formatDisplayDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const hours = Math.round(diffMs / (1000 * 60 * 60));
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
    return `${minutes} minutes ago`;
  }
  if (hours < 24) {
    return `${hours} hours ago`;
  }
  const days = Math.round(hours / 24);
  return `${days} days ago`;
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDaysFilter(value: string | string[] | undefined) {
  const resolved = getSingleSearchParam(value);
  if (!resolved || resolved === "all") {
    return null;
  }

  const parsed = Number(resolved);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

function parseSortFilter(value: string | string[] | undefined) {
  const resolved = getSingleSearchParam(value);
  if (
    resolved === "newest" ||
    resolved === "reach" ||
    resolved === "views" ||
    resolved === "engagements" ||
    resolved === "engagement_rate"
  ) {
    return resolved;
  }

  return "engagements";
}
