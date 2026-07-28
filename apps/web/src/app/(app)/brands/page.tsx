import { BrandIcon, CampaignIcon, GlobeIcon, ReportIcon, SocialIcon } from "@/components/app/ui-icons";
import { AreaTrendCard, BottleShareOfVoiceCard, CategoryBarCard, ShareOfVoiceCard } from "@/components/states/insight-charts";
import { KpiCard } from "@/components/states/kpi-card";
import { getMonitoringDashboardData } from "@/lib/monitoring-dashboard-data";

function toPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function toSignedValue(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function ensureList(values: string[], fallback: string) {
  return values.length > 0 ? values : [fallback];
}

export default async function CompetitorsPage() {
  const dashboard = await getMonitoringDashboardData();
  const competitors = dashboard.competitorBrands ?? [];
  const totalCompetitorTouchpoints = competitors.reduce((sum, brand) => sum + brand.touchpoints, 0);
  const competitorKeywordCount = competitors.reduce((sum, brand) => sum + brand.keywordCount, 0);
  const averageMomentum = competitors.length > 0
    ? Math.round(competitors.reduce((sum, brand) => sum + brand.momentum, 0) / competitors.length)
    : 0;
  const topCompetitor = competitors
    .slice()
    .sort((left, right) => right.touchpoints - left.touchpoints)[0] ?? null;
  const activeCompetitorCampaigns = dashboard.campaigns.filter((campaign) =>
    competitors.some((brand) => brand.name.toLowerCase() === campaign.brand.toLowerCase()),
  );
  const competitorChannels = dashboard.distributions.campaignChannels.filter((item) => item.value > 0);
  const competitorSplit = dashboard.distributions.competitorSov ?? [];
  const competitorTouchpointData = competitors.map((brand) => ({
    label: brand.name,
    value: brand.touchpoints,
    note: `${toPercent(brand.shareOfVoice)} SOV`,
  }));
  const benchmarkSegments = competitorSplit.length > 0
    ? competitorSplit
    : competitors.map((brand) => ({
        label: brand.name,
        share: brand.shareOfVoice,
        note: brand.notes,
        valueLabel: `${brand.touchpoints} touchpoints`,
      }));

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2.25rem] border border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(244,0,9,0.10),transparent_24%),linear-gradient(135deg,#fff8f6_0%,#ffffff_50%,#f5fbff_100%)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-brand-red/15 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-red">
              Beverage competitor command
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Competitors
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-[15px]">
              Monitor Coca-Cola Iraq competitors across TV, social, web, and OOH with one focused watchlist. This page highlights rival brand pressure, share of voice, active campaigns, and monitoring signals in one place.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[28rem]">
            <SummaryBadge label="Tracked competitors" value={String(competitors.length)} />
            <SummaryBadge label="Coca-Cola SOV" value={toPercent(dashboard.summary.cokeShareOfVoice)} />
            <SummaryBadge label="Competitor touchpoints" value={String(totalCompetitorTouchpoints)} />
            <SummaryBadge label="Competitor campaigns" value={String(activeCompetitorCampaigns.length)} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Competitor Watch" note="Tracked rival beverage brands" tone="deep" value={String(competitors.length)} />
          <KpiCard label="Keyword Signals" note="OCR and speech monitoring coverage" tone="soft" value={String(competitorKeywordCount)} />
          <KpiCard label="Touchpoint Volume" note="Cross-channel competitor detections" tone="brand" value={String(totalCompetitorTouchpoints)} />
          <KpiCard label="Avg Momentum" note="Average competitor monitoring intensity" tone="warning" value={toSignedValue(averageMomentum)} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <BottleShareOfVoiceCard
          title="Coca-Cola Benchmark"
          subtitle="Current Coca-Cola share versus the active competitor field"
          brandLabel="Coca-Cola"
          share={dashboard.summary.cokeShareOfVoice}
          segments={benchmarkSegments}
          supportingLabel="Measured from current touchpoints across TV, social, web, and OOH"
        />
        <CategoryBarCard
          title="Competitor Touchpoint Distribution"
          subtitle="Current touchpoint volume by tracked competitor"
          data={competitorTouchpointData}
          emptyLabel="No competitor touchpoints are available right now."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <AreaTrendCard
          title="Competitor Watch Momentum"
          subtitle="Recent monitoring intensity for the active competitor set"
          data={dashboard.trendSeries.competitorWatch}
          formatter={(value) => `${value} signals`}
        />
        <ShareOfVoiceCard
          title="Competitor Share Split"
          subtitle="How competitor monitoring is distributed right now"
          data={competitorSplit}
          emptyLabel="No competitor share split is available yet."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-red">Priority watchlist</p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">Tracked Competitor Brands</h2>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {competitors.length > 0 ? competitors.map((brand) => (
              <article
                className="rounded-[1.6rem] border border-border bg-[linear-gradient(135deg,#ffffff_0%,#fbf7f4_100%)] p-5"
                key={brand.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-red text-white">
                        <BrandIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold text-foreground">{brand.name}</h3>
                        <p className="text-sm text-muted-foreground">{brand.category}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{brand.notes}</p>
                  </div>

                  <div className="rounded-[1.2rem] border border-brand-red/12 bg-panel-soft px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Momentum</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">{toSignedValue(brand.momentum)}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <MetricTile label="Touchpoints" value={brand.touchpoints.toLocaleString()} />
                  <MetricTile label="SOV" value={toPercent(brand.shareOfVoice)} />
                  <MetricTile label="Keywords" value={String(brand.keywordCount)} />
                </div>

                <div className="mt-5 grid gap-3">
                  <InfoList icon={<GlobeIcon className="h-4 w-4 text-brand-red" />} label="Domains" values={ensureList(brand.domains, "No tracked domains yet")} />
                  <InfoList icon={<SocialIcon className="h-4 w-4 text-brand-red" />} label="Handles" values={ensureList(brand.handles, "No tracked handles yet")} />
                </div>
              </article>
            )) : (
              <div className="rounded-[1.4rem] border border-dashed border-border bg-panel-soft px-4 py-6 text-sm text-muted-foreground">
                No competitor brand records are available yet.
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-red">Head-to-head snapshot</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">Competitive Summary</h2>
            <div className="mt-5 space-y-3">
              <SummaryRow icon={<BrandIcon className="h-4 w-4" />} label="Top competitor" value={topCompetitor?.name ?? "Awaiting data"} />
              <SummaryRow icon={<CampaignIcon className="h-4 w-4" />} label="Active competitor campaigns" value={String(activeCompetitorCampaigns.length)} />
              <SummaryRow icon={<ReportIcon className="h-4 w-4" />} label="Tracked reporting outputs" value={String(dashboard.summary.competitorCount)} />
              <SummaryRow icon={<SocialIcon className="h-4 w-4" />} label="Social competitor reach" value={dashboard.summary.totalReach.toLocaleString()} />
            </div>
          </section>

          <CategoryBarCard
            title="Channel Coverage"
            subtitle="Where competitor monitoring is currently strongest"
            data={competitorChannels}
            emptyLabel="No channel coverage is available for the current competitor set."
          />

          <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-red">Campaign alignment</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">Competitor Campaign Watch</h2>
            <div className="mt-5 space-y-3">
              {activeCompetitorCampaigns.length > 0 ? activeCompetitorCampaigns.slice(0, 6).map((campaign) => (
                <div
                  className="flex items-start justify-between gap-4 rounded-[1.25rem] border border-border bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFCFD_100%)] px-4 py-3"
                  key={campaign.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{campaign.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{campaign.brand} · {campaign.market}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{campaign.touchpoints}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">touchpoints</p>
                  </div>
                </div>
              )) : (
                <div className="rounded-[1.4rem] border border-dashed border-border bg-panel-soft px-4 py-6 text-sm text-muted-foreground">
                  No competitor campaigns are active right now.
                </div>
              )}
            </div>
          </section>
        </section>
      </section>
    </div>
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

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-border bg-panel-soft px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-red shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
          {icon}
        </span>
        <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="shrink-0 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
