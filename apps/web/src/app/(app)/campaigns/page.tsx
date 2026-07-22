import Link from "next/link";

import { CampaignIcon, GlobeIcon, ReportIcon, SocialIcon, TvIcon } from "@/components/app/ui-icons";
import { BottleShareOfVoiceCard, AreaTrendCard, CategoryBarCard, ShareOfVoiceCard } from "@/components/states/insight-charts";
import { KpiCard } from "@/components/states/kpi-card";
import { getMonitoringDashboardData } from "@/lib/monitoring-dashboard-data";

const channelIcons = {
  TV: TvIcon,
  Social: SocialIcon,
  Web: GlobeIcon,
  OOH: CampaignIcon,
} as const;

export default async function CampaignsPage() {
  const dashboard = await getMonitoringDashboardData();
  const totalBrandTouchpoints = Math.max(
    dashboard.distributions.brandTouchpoints.reduce((sum, item) => sum + item.value, 0),
    1,
  );
  const brandMix = dashboard.distributions.brandTouchpoints.map((item) => ({
    label: item.label,
    share: item.value / totalBrandTouchpoints,
    note: item.note,
    valueLabel: `${item.value} touchpoints`,
  }));

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2.25rem] border border-white/85 bg-[radial-gradient(circle_at_top_left,rgba(244,0,9,0.16),transparent_28%),linear-gradient(135deg,#fff8f6_0%,#ffffff_46%,#fff4ef_100%)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-brand-red/15 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-red">
              Cross-Channel Campaign Command
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Campaign Monitoring
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-[15px]">
              Track Coca-Cola priority campaigns, competitor activity, and channel coverage across TV,
              social, web advertising, and OOH from one executive monitoring surface.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[28rem]">
            <SummaryBadge label="Last monitoring refresh" value={formatDateTime(dashboard.summary.lastRefreshLabel)} />
            <SummaryBadge label="Competitor watchlist" value={`${dashboard.summary.competitorCount} tracked brands`} />
            <SummaryBadge label="Reports ready" value={`${dashboard.summary.reportCount} exports`} />
            <SummaryBadge label="Coverage sources" value={`${dashboard.summary.socialAccounts + dashboard.summary.webSources + 2} connected feeds`} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Active Campaigns" note="Currently monitored priorities" tone="brand" value={String(dashboard.summary.activeCampaigns)} />
          <KpiCard label="Touchpoints" note="All monitored presence records" tone="deep" value={String(dashboard.summary.totalTouchpoints)} />
          <KpiCard label="Reported Reach" note="Connected source total in current workspace" tone="soft" value={dashboard.summary.totalReach > 0 ? dashboard.summary.totalReach.toLocaleString() : "Not available"} />
          <KpiCard label="Engagements" note="Imported social engagement actions" tone="warning" value={dashboard.summary.totalEngagements > 0 ? dashboard.summary.totalEngagements.toLocaleString() : "Not available"} />
          <KpiCard label="Web Ad Pressure" note="Verified website advertisement detections" value={String(dashboard.summary.totalWebAds)} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <AreaTrendCard
            title="Campaign Pressure Trend"
            subtitle="Combined monitoring activity over the last 14 days"
            data={dashboard.trendSeries.campaignPressure}
            formatter={(value) => `${value} touches`}
          />
          <CategoryBarCard
            title="Channel Contribution"
            subtitle="How current monitoring volume is distributed across channels"
            data={dashboard.distributions.campaignChannels}
          />
        </div>

        <div className="space-y-6">
          <BottleShareOfVoiceCard
            title="Coca-Cola Share Of Voice"
            subtitle="Current monitored brand pressure across portfolio and competitors"
            brandLabel="Coca-Cola"
            share={dashboard.summary.cokeShareOfVoice}
            segments={brandMix}
            supportingLabel={`${Math.round(dashboard.summary.cokeShareOfVoice * 100)}% of tracked beverage attention`}
          />
          <ShareOfVoiceCard
            title="Competitor Split"
            subtitle="Competitor monitoring pressure mix"
            data={dashboard.distributions.competitorSov}
          />
        </div>
      </section>

      <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Campaign Watchboard</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Priority Coke and competitor campaigns prepared for leadership reporting and media monitoring.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Preview campaigns are clearly mixed with live workspace records when live data is still building out.
          </p>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {dashboard.campaigns.map((campaign) => (
            <article
              className="rounded-[1.7rem] border border-border bg-[linear-gradient(135deg,#ffffff_0%,#fcf7f3_100%)] p-5 shadow-[var(--shadow-soft)]"
              key={campaign.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-brand-red px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                      {campaign.brand}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-border bg-panel-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {campaign.status}
                    </span>
                    {campaign.isPreview ? (
                      <span className="inline-flex items-center rounded-full border border-brand-red/20 bg-brand-red/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-red">
                        Monitoring preview
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-foreground">{campaign.name}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{campaign.objective}</p>
                </div>

                <div className="rounded-[1.3rem] border border-brand-red/12 bg-[linear-gradient(180deg,#fff7f4,#fff1eb)] px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Monitoring score</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{campaign.monitoringScore}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MetricTile label="Touchpoints" value={campaign.touchpoints.toLocaleString()} />
                <MetricTile label="Share of voice" value={`${Math.round(campaign.shareOfVoice * 100)}%`} />
                <MetricTile label="Reach" value={campaign.estimatedReach.toLocaleString()} />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {campaign.channels.map((channel) => {
                  const Icon = channelIcons[channel as keyof typeof channelIcons] ?? CampaignIcon;
                  return (
                    <span
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-panel-soft px-3 py-2 text-sm font-medium text-foreground"
                      key={`${campaign.id}-${channel}`}
                    >
                      <Icon className="h-4 w-4 text-brand-red" />
                      {channel}
                    </span>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
                <span>
                  {campaign.startDate} to {campaign.endDate}
                </span>
                <Link className="font-semibold text-brand-red" href="/reports">
                  Open reporting
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <CategoryBarCard
          title="Brand Touchpoint Stack"
          subtitle="Portfolio and competitor volume mapped for campaign teams"
          data={dashboard.distributions.brandTouchpoints}
        />

        <article className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-red text-white">
              <ReportIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Campaign Reporting Queue</h3>
              <p className="text-sm text-muted-foreground">Ready-made outputs attached to these monitoring priorities.</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {dashboard.reports.slice(0, 4).map((report) => (
              <div className="rounded-[1.3rem] border border-border bg-panel-soft px-4 py-3" key={report.id}>
                <p className="text-sm font-semibold text-foreground">{report.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{report.coverageLabel}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {report.formats.map((format) => (
                    <span className="rounded-full border border-brand-red/18 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-red" key={`${report.id}-${format}`}>
                      {format}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

function SummaryBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-border bg-white/80 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] border border-border bg-panel-soft px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
