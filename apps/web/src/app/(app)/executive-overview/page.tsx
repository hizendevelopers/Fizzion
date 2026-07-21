import Link from "next/link";

import { AreaTrendCard, CategoryBarCard, RadialStatCard } from "@/components/states/insight-charts";
import { KpiCard } from "@/components/states/kpi-card";
import { getExecutiveOverview } from "@/lib/executive-data";

export default async function ExecutiveOverviewPage() {
  const overview = await getExecutiveOverview({ range: "last30" });
  const channelTouchpointData = overview.channelBreakdown.map((channel) => ({
    label: channel.title,
    value: channel.touchpoints,
    note: `${channel.activeSources} sources · ${channel.campaigns} campaigns`,
  }));
  const activityTrend = buildRecentActivityTrend(overview.recentActivity);
  const healthData = [
    { label: "Stale sources", value: overview.dataHealth.staleSources, color: "#f59e0b" },
    { label: "Failed website scans", value: overview.dataHealth.failedWebsiteScans, color: "#ef4444" },
    { label: "OOH missing coordinates", value: overview.dataHealth.oohMissingCoordinates, color: "#06b6d4" },
    { label: "Social reauth required", value: overview.dataHealth.socialReauthRequired, color: "#8b5cf6" },
  ];
  const totalSources = Math.max(overview.kpis.totalConnectedDataSources, 1);
  const healthySources = Math.max(totalSources - overview.dataHealth.staleSources, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Executive Overview</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              Unified platform-wide view across OOH Intelligence, Social Intelligence, and Web
              Advertising using only connected internal and verified source records.
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-border bg-panel-soft px-4 py-3 text-sm text-muted-foreground">
            <p>Workspace: {overview.summary.workspaceName}</p>
            <p className="mt-1">Period: {overview.summary.rangeLabel}</p>
            <p className="mt-1">Last successful platform sync: {overview.summary.lastSuccessfulPlatformSync ?? "Awaiting first synchronization"}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Connected Data Sources" note="Active platform sources" tone="brand" value={String(overview.kpis.totalConnectedDataSources)} />
          <KpiCard label="Active Campaigns" note="Campaign records in selected range" tone="deep" value={String(overview.kpis.totalActiveCampaigns)} />
          <KpiCard label="Total Touchpoints" note="OOH assets + social touchpoints + web ad occurrences" tone="soft" value={String(overview.kpis.totalTouchpoints)} />
          <KpiCard label="Reported Reach Across Sources" note="Not deduplicated people" tone="warning" value={overview.kpis.totalReach ? overview.kpis.totalReach.toLocaleString() : "Not available"} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {overview.channelBreakdown.map((channel) => (
          <article className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]" key={channel.key}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{channel.title}</h2>
              <span className="rounded-full bg-panel-soft px-3 py-1 text-xs text-muted-foreground">
                {channel.freshness}
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <MetricTile label="Sources" value={String(channel.activeSources)} />
              <MetricTile label="Touchpoints" value={String(channel.touchpoints)} />
              <MetricTile label="Campaigns" value={String(channel.campaigns)} />
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <AreaTrendCard
          color="#F40009"
          data={activityTrend}
          subtitle="Recent platform activity events grouped by day"
          title="Platform Activity Trend"
        />
        <RadialStatCard
          color="#22c55e"
          subtitle="Connected sources that are not currently marked stale"
          title="Source Health"
          total={totalSources}
          value={healthySources}
          valueLabel={`${Math.round((healthySources / totalSources) * 100)}%`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <CategoryBarCard
          data={channelTouchpointData}
          subtitle="Touchpoint totals across each intelligence channel"
          title="Touchpoints by Channel"
        />
        <CategoryBarCard
          data={healthData}
          subtitle="Open operational issues that affect data quality and freshness"
          title="Data Health Breakdown"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <article className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Campaign Overview</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Campaigns from the existing unified campaign table, without fabricated spend or reach.
              </p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Campaign</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Start</th>
                  <th className="py-2 font-medium">End</th>
                </tr>
              </thead>
              <tbody>
                {overview.campaignPerformance.length > 0 ? (
                  overview.campaignPerformance.map((campaign) => (
                    <tr className="border-t border-border" key={campaign.id}>
                      <td className="py-3 pr-4 text-foreground">{campaign.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{campaign.status}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{campaign.startDate ?? "Not available"}</td>
                      <td className="py-3 text-muted-foreground">{campaign.endDate ?? "Not available"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-4 text-muted-foreground" colSpan={4}>
                      No campaigns matched the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <h2 className="text-lg font-semibold text-foreground">Alerts and Data Health</h2>
          <div className="mt-4 space-y-3 text-sm">
            <HealthRow label="Active alerts" value={String(overview.kpis.activeDataAlerts)} />
            <HealthRow label="Sources requiring reauthorization" value={String(overview.kpis.sourcesRequiringReauthorization)} />
            <HealthRow label="Stale sources" value={String(overview.dataHealth.staleSources)} />
            <HealthRow label="Failed website scans" value={String(overview.dataHealth.failedWebsiteScans)} />
            <HealthRow label="OOH records missing coordinates" value={String(overview.dataHealth.oohMissingCoordinates)} />
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
          <div className="mt-4 space-y-3">
            {overview.recentActivity.length > 0 ? (
              overview.recentActivity.map((activity) => (
                <div className="rounded-[1.2rem] border border-border bg-panel-soft px-4 py-3 text-sm" key={activity.id}>
                  <p className="font-medium text-foreground">{activity.action}</p>
                  <p className="mt-1 text-muted-foreground">{activity.entityType} {"\u00b7"} {activity.createdAt}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                No recent platform activity was available for this workspace.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Module Shortcuts</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <Shortcut href="/ooh-intelligence" label="Open OOH Intelligence" note="Inventory, placements, and audience metrics" />
            <Shortcut href="/social/accounts" label="Open Social Intelligence" note="Connected accounts, content, and metrics" />
            <Shortcut href="/web-advertising" label="Open Web Advertising" note="Monitored websites, scans, and ad evidence" />
          </div>
        </article>
      </section>
    </div>
  );
}

function buildRecentActivityTrend(items: Array<{ createdAt: string }>) {
  const byDay = new Map<string, number>();

  for (const item of items) {
    const day = item.createdAt.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  return [...byDay.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, value]) => ({ label, value }));
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] border border-border bg-panel-soft px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[1.1rem] border border-border bg-panel-soft px-4 py-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function Shortcut({ href, label, note }: { href: string; label: string; note: string }) {
  return (
    <Link className="rounded-[1.2rem] border border-border bg-panel-soft px-4 py-4" href={href}>
      <p className="font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>
    </Link>
  );
}
