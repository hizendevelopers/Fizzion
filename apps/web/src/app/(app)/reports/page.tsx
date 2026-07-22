import { CalendarIcon, CampaignIcon, ReportIcon } from "@/components/app/ui-icons";
import { AreaTrendCard, CategoryBarCard, BottleShareOfVoiceCard } from "@/components/states/insight-charts";
import { KpiCard } from "@/components/states/kpi-card";
import { getMonitoringDashboardData } from "@/lib/monitoring-dashboard-data";

export default async function ReportsPage() {
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
      <section className="overflow-hidden rounded-[2.25rem] border border-white/85 bg-[radial-gradient(circle_at_top_left,rgba(63,181,84,0.12),transparent_26%),linear-gradient(135deg,#fff8f6_0%,#ffffff_52%,#f7fff8_100%)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-brand-red/12 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-red">
              Executive Reporting Center
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Reports
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-[15px]">
              Export-ready campaign reporting, competitor watch summaries, and cross-channel
              leadership packs prepared from the current media monitoring workspace.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[28rem]">
            <SummaryBadge label="Reports in queue" value={`${dashboard.reports.length}`} />
            <SummaryBadge label="Campaigns covered" value={`${dashboard.summary.campaignCount}`} />
            <SummaryBadge label="Latest generated" value={formatDateTime(dashboard.reports[0]?.lastGeneratedAt ?? dashboard.summary.lastRefreshLabel)} />
            <SummaryBadge label="Competitor packs" value={`${dashboard.summary.competitorCount} watchlists`} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Ready Reports" note="Available for export or circulation" tone="brand" value={String(dashboard.reports.filter((report) => report.status === "ready").length)} />
          <KpiCard label="Scheduled Reports" note="Upcoming monitoring deliverables" tone="deep" value={String(dashboard.reports.filter((report) => report.status === "scheduled").length)} />
          <KpiCard label="Campaign Coverage" note="Campaigns included in reporting plans" tone="soft" value={String(dashboard.summary.campaignCount)} />
          <KpiCard label="Share of Voice Focus" note="Coca-Cola leadership watch priority" tone="warning" value={`${Math.round(dashboard.summary.cokeShareOfVoice * 100)}%`} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <AreaTrendCard
          title="Report Output Trend"
          subtitle="Generated and scheduled reporting activity over the last 14 days"
          data={dashboard.trendSeries.reportOutput}
          formatter={(value) => `${value} jobs`}
        />
        <BottleShareOfVoiceCard
          title="Coca-Cola SOV in Reports"
          subtitle="Current report focus weighted by monitored share of voice"
          brandLabel="Coca-Cola"
          share={dashboard.summary.cokeShareOfVoice}
          segments={brandMix}
          supportingLabel="Pinned across executive and competitor report packs"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <CategoryBarCard
          title="Report Coverage Mix"
          subtitle="How many formats and channel packs each report currently supports"
          data={dashboard.distributions.reportCoverage}
        />

        <article className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-red text-white">
              <CampaignIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Campaign Snapshots</h3>
              <p className="text-sm text-muted-foreground">Quick view of the campaigns currently feeding reports.</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {dashboard.campaigns.slice(0, 4).map((campaign) => (
              <div className="rounded-[1.3rem] border border-border bg-panel-soft px-4 py-3" key={campaign.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{campaign.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{campaign.brand} · {campaign.channels.join(" + ")}</p>
                  </div>
                  <span className="rounded-full border border-brand-red/15 bg-white px-3 py-1 text-xs font-semibold text-brand-red">
                    {campaign.monitoringScore}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#F40009,#b00020)] text-white">
            <ReportIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Report Workspace</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Coca-Cola and competitor campaign reports staged for weekly, bi-weekly, and monthly executive circulation.
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-border">
          <table className="min-w-full divide-y divide-border text-left">
            <thead className="bg-panel-soft">
              <tr>
                {["Report", "Campaign", "Cadence", "Coverage", "Last generated", "Status", "Highlights"].map((column) => (
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground" key={column}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {dashboard.reports.map((report) => (
                <tr key={report.id}>
                  <td className="px-4 py-4 align-top">
                    <div className="min-w-[13rem]">
                      <p className="text-sm font-semibold text-foreground">{report.title}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {report.formats.map((format) => (
                          <span className="rounded-full border border-brand-red/15 bg-brand-red/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-red" key={`${report.id}-${format}`}>
                            {format}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-foreground">{report.campaign}</td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">{report.cadence}</td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">{report.coverageLabel}</td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-brand-red" />
                      {formatDateTime(report.lastGeneratedAt)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${report.status === "ready" ? "bg-[#ebfff0] text-[#168c45]" : "bg-panel-soft text-muted-foreground"}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {report.highlights.map((highlight) => (
                        <li key={`${report.id}-${highlight}`}>{highlight}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
