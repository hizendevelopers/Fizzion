import { DownloadIcon, ReportIcon } from "@/components/app/ui-icons";
import { getCampaignReportingData } from "@/lib/campaign-reporting";

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

export default async function ReportsPage() {
  const data = await getCampaignReportingData();

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2.25rem] border border-white/85 bg-[radial-gradient(circle_at_top_left,rgba(244,0,9,0.14),transparent_30%),linear-gradient(135deg,#fff8f6_0%,#ffffff_46%,#fff5ef_100%)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-brand-red/15 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-red">
              Brand Reporting
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Reports</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-[15px]">
              Download brand-level reports for every brand currently tracked in the platform. Each report bundles the
              latest two-year campaign history, live campaign counts, tracked spend, and platform coverage.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[28rem]">
            <SummaryBadge label="Brands with reports" value={`${data.brandReports.length}`} />
            <SummaryBadge label="Campaign coverage" value={`${data.summary.totalCampaigns} campaigns`} />
            <SummaryBadge label="Tracked spend" value={formatCurrency(data.summary.totalTrackedSpend, data.currency)} />
            <SummaryBadge label="Last refresh" value={new Date(data.generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {data.brandReports.length > 0 ? data.brandReports.map((brand) => (
          <article className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]" key={brand.brandId}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold text-white" style={{ backgroundColor: brand.color }}>
                    {brand.brandName.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{brand.brandName}</h2>
                    <p className="text-sm text-muted-foreground">{brand.category}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {brand.summary.liveCampaigns} live campaigns, {brand.summary.totalCampaigns} total campaigns, and{" "}
                  {formatCurrency(brand.summary.totalTrackedSpend, data.currency)} of tracked spend in the last two years.
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-panel-soft text-brand-red">
                <ReportIcon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MetricTile label="Live campaigns" value={String(brand.summary.liveCampaigns)} />
              <MetricTile label="Tracked spend" value={formatCurrency(brand.summary.totalTrackedSpend, data.currency)} />
              <MetricTile label="Budget total" value={formatCurrency(brand.summary.totalBudget, data.currency)} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {brand.summary.primaryPlatforms.length > 0 ? brand.summary.primaryPlatforms.map((platform) => (
                <span className="rounded-full border border-border bg-panel-soft px-3 py-2 text-sm font-medium text-foreground" key={`${brand.brandId}-${platform}`}>
                  {platform}
                </span>
              )) : (
                <span className="rounded-full border border-dashed border-border bg-panel-soft px-3 py-2 text-sm font-medium text-muted-foreground">
                  No platforms linked yet
                </span>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-red px-4 text-sm font-semibold text-white transition hover:opacity-90"
                href={`/api/reports/brands/${brand.brandId}?format=pdf`}
              >
                <DownloadIcon className="h-4 w-4" />
                Download PDF
              </a>
              <a
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-foreground transition hover:bg-panel-soft"
                href={`/api/reports/brands/${brand.brandId}?format=xlsx`}
              >
                <DownloadIcon className="h-4 w-4" />
                Download Excel
              </a>
            </div>
          </article>
        )) : (
          <div className="rounded-[1.6rem] border border-dashed border-border bg-panel-soft px-5 py-8 text-sm text-muted-foreground">
            No brand reports are available yet. Run the overview demo seed to load the platform report catalogue.
          </div>
        )}
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
