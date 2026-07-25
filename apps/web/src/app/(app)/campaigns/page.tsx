import Link from "next/link";

import { CampaignIcon, ClockIcon, GlobeIcon, ReportIcon } from "@/components/app/ui-icons";
import { getCampaignReportingData } from "@/lib/campaign-reporting";

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Ongoing";
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "active") return "bg-[#EAF8EF] text-[#15803D]";
  if (normalized === "completed") return "bg-[#EEF2FF] text-[#4338CA]";
  if (normalized === "scheduled") return "bg-[#FFF4E8] text-[#C2410C]";
  return "bg-[#F3F4F6] text-[#4B5563]";
}

export default async function CampaignsPage() {
  const data = await getCampaignReportingData();

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2.25rem] border border-white/85 bg-[radial-gradient(circle_at_top_left,rgba(244,0,9,0.16),transparent_28%),linear-gradient(135deg,#fff8f6_0%,#ffffff_46%,#fff4ef_100%)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-brand-red/15 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-red">
              Campaign Intelligence
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Campaigns</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-[15px]">
              View every live campaign across the platform together with the seeded last two years of campaign history,
              tracked spend, platform coverage, and export-ready reporting.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[28rem]">
            <SummaryBadge label="Last 2 years" value="24 months loaded" />
            <SummaryBadge label="Generated from" value="Real campaign tables" />
            <SummaryBadge label="Tracked brands" value={`${data.summary.totalBrands}`} />
            <SummaryBadge label="Last refresh" value={new Date(data.generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total Campaigns" value={String(data.summary.totalCampaigns)} note="Live plus the last two years of seeded history" />
          <KpiCard label="Live Campaigns" value={String(data.summary.liveCampaigns)} note="Currently active across platform modules" />
          <KpiCard label="Tracked Spend" value={formatCurrency(data.summary.totalTrackedSpend, data.currency)} note="Spend records and monitored TV detection costs" />
          <KpiCard label="Reports" value={String(data.brandReports.length)} note="Brand report cards with direct PDF and Excel export" />
        </div>
      </section>

      <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Platform Campaign Register</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              All live campaigns and the seeded platform history from July 25, 2024 to July 25, 2026.
            </p>
          </div>
          <Link className="inline-flex h-10 items-center justify-center rounded-full border border-border px-4 text-sm font-semibold text-foreground transition hover:bg-panel-soft" href="/reports">
            Open reports
          </Link>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {data.campaigns.length > 0 ? (
            data.campaigns.map((campaign) => (
              <article
                className="rounded-[1.7rem] border border-border bg-[linear-gradient(135deg,#ffffff_0%,#fcf7f3_100%)] p-5 shadow-[var(--shadow-soft)]"
                key={campaign.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white" style={{ backgroundColor: campaign.brandColor }}>
                        {campaign.brandName}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusTone(campaign.status)}`}>
                        {campaign.status}
                      </span>
                      {campaign.isLive ? <span className="rounded-full bg-[#FEF2F2] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-red">Live</span> : null}
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-foreground">{campaign.name}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{campaign.objective}</p>
                  </div>

                  <div className="rounded-[1.3rem] border border-brand-red/12 bg-[linear-gradient(180deg,#fff7f4,#fff1eb)] px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Tracked spend</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{formatCurrency(campaign.trackedSpend, data.currency)}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <MetricTile label="Budget" value={formatCurrency(campaign.budgetAmount ?? 0, campaign.currency)} />
                  <MetricTile label="Market" value={campaign.market} />
                  <MetricTile label="Platforms" value={String(campaign.platformNames.length)} />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {campaign.platformNames.length > 0 ? campaign.platformNames.map((platform) => (
                    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-panel-soft px-3 py-2 text-sm font-medium text-foreground" key={`${campaign.id}-${platform}`}>
                      <GlobeIcon className="h-4 w-4 text-brand-red" />
                      {platform}
                    </span>
                  )) : (
                    <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-border bg-panel-soft px-3 py-2 text-sm font-medium text-muted-foreground">
                      Platform mapping pending
                    </span>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
                  <span>
                    {formatDate(campaign.startDate)} to {formatDate(campaign.endDate)}
                  </span>
                  <Link className="font-semibold text-brand-red" href="/reports">
                    Brand report
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="xl:col-span-2 rounded-[1.6rem] border border-dashed border-border bg-panel-soft px-5 py-8 text-sm text-muted-foreground">
              No campaign records are available yet. Run the overview demo seed to load the last two years of campaign history.
            </div>
          )}
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

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] border border-border bg-panel-soft px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function KpiCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[1.6rem] border border-border bg-white/90 px-5 py-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-red text-white">
          {label.includes("Campaign") ? <CampaignIcon className="h-5 w-5" /> : label.includes("Reports") ? <ReportIcon className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />}
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}
