import { BrandIcon, CampaignIcon, GlobeIcon, SocialIcon } from "@/components/app/ui-icons";
import { AreaTrendCard, BottleShareOfVoiceCard, CategoryBarCard, ShareOfVoiceCard } from "@/components/states/insight-charts";
import { KpiCard } from "@/components/states/kpi-card";
import { getMonitoringDashboardData } from "@/lib/monitoring-dashboard-data";

export default async function BrandsPage() {
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
      <section className="overflow-hidden rounded-[2.25rem] border border-white/85 bg-[radial-gradient(circle_at_top_left,rgba(63,181,84,0.16),transparent_26%),linear-gradient(135deg,#fff8f6_0%,#ffffff_48%,#f4fff7_100%)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-brand-red/15 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-red">
              Brand and Competitor Command
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Brands and Competitors
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-[15px]">
              Monitor Coca-Cola portfolio brands, competitor pressure, search terms, owned domains,
              and cross-channel share of voice with a single beverage intelligence workspace.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[28rem]">
            <SummaryBadge label="Portfolio brands" value={`${dashboard.portfolioBrands.length}`} />
            <SummaryBadge label="Competitors" value={`${dashboard.competitorBrands.length}`} />
            <SummaryBadge label="Tracked touchpoints" value={`${dashboard.summary.totalTouchpoints}`} />
            <SummaryBadge label="Coca-Cola SOV" value={`${Math.round(dashboard.summary.cokeShareOfVoice * 100)}%`} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Portfolio Watch" note="Owned brands under active monitoring" tone="brand" value={String(dashboard.portfolioBrands.length)} />
          <KpiCard label="Competitor Watch" note="Tracked rival beverage brands" tone="deep" value={String(dashboard.competitorBrands.length)} />
          <KpiCard label="Keyword Signals" note="OCR and speech monitoring coverage" tone="soft" value={String(dashboard.brands.reduce((total, brand) => total + brand.keywordCount, 0))} />
          <KpiCard label="Campaign Links" note="Brands tied into campaign reporting" tone="warning" value={String(dashboard.summary.campaignCount)} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <BottleShareOfVoiceCard
          title="Coca-Cola Master Brand SOV"
          subtitle="Current brand pressure across the monitored beverage set"
          brandLabel="Coca-Cola"
          share={dashboard.summary.cokeShareOfVoice}
          segments={brandMix}
          supportingLabel="Measured from current touchpoints across TV, social, web, and OOH"
        />
        <CategoryBarCard
          title="Brand Touchpoint Distribution"
          subtitle="Current touchpoint volume by brand"
          data={dashboard.distributions.brandTouchpoints}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AreaTrendCard
          title="Competitor Watch Momentum"
          subtitle="Recent monitoring intensity for competitor coverage"
          data={dashboard.trendSeries.competitorWatch}
          formatter={(value) => `${value} signals`}
        />
        <ShareOfVoiceCard
          title="Competitor Share Split"
          subtitle="How the competitor watchlist is currently distributed"
          data={dashboard.distributions.competitorSov}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <BrandPanel
          brands={dashboard.portfolioBrands}
          eyebrow="Coca-Cola portfolio"
          title="Owned Brand Watchlist"
        />
        <BrandPanel
          brands={dashboard.competitorBrands}
          eyebrow="Competitor pressure"
          title="Competitor Intelligence"
        />
      </section>
    </div>
  );
}

function BrandPanel({
  eyebrow,
  title,
  brands,
}: {
  eyebrow: string;
  title: string;
  brands: Awaited<ReturnType<typeof getMonitoringDashboardData>>["brands"];
}) {
  return (
    <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-red">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold text-foreground">{title}</h2>

      <div className="mt-5 space-y-4">
        {brands.map((brand) => (
          <article
            className="rounded-[1.6rem] border border-border bg-[linear-gradient(135deg,#ffffff_0%,#fbf7f4_100%)] p-5"
            key={brand.id}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-red text-white">
                    <BrandIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{brand.name}</h3>
                    <p className="text-sm text-muted-foreground">{brand.category}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${brand.group === "portfolio" ? "bg-[#ebfff0] text-[#168c45]" : "bg-panel-soft text-muted-foreground"}`}>
                    {brand.group === "portfolio" ? "Portfolio" : "Competitor"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{brand.notes}</p>
              </div>

              <div className="rounded-[1.3rem] border border-brand-red/12 bg-panel-soft px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Momentum</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">+{brand.momentum}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MetricTile label="Touchpoints" value={brand.touchpoints.toLocaleString()} />
              <MetricTile label="SOV" value={`${Math.round(brand.shareOfVoice * 100)}%`} />
              <MetricTile label="Keywords" value={String(brand.keywordCount)} />
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <InfoList
                icon={<GlobeIcon className="h-4 w-4 text-brand-red" />}
                label="Domains"
                values={brand.domains}
              />
              <InfoList
                icon={<SocialIcon className="h-4 w-4 text-brand-red" />}
                label="Handles"
                values={brand.handles}
              />
              <InfoList
                icon={<CampaignIcon className="h-4 w-4 text-brand-red" />}
                label="Monitoring notes"
                values={[brand.isPreview ? "Preview watch profile" : "Workspace-backed profile"]}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function InfoList({
  icon,
  label,
  values,
}: {
  icon: React.ReactNode;
  label: string;
  values: string[];
}) {
  return (
    <div className="rounded-[1.3rem] border border-border bg-panel-soft px-4 py-3">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      </div>
      <div className="mt-3 space-y-1">
        {values.map((value) => (
          <p className="text-sm text-foreground" key={`${label}-${value}`}>{value}</p>
        ))}
      </div>
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

function SummaryBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-border bg-white/80 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
