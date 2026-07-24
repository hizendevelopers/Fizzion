import { AreaTrendCard, CategoryBarCard, ShareOfVoiceCard } from "@/components/states/insight-charts";
import { KpiCard } from "@/components/states/kpi-card";
import { CreativeIcon, ReportIcon } from "@/components/app/ui-icons";
import { getMonitoringDashboardData } from "@/lib/monitoring-dashboard-data";

export default async function CreativesPage() {
  const dashboard = await getMonitoringDashboardData();
  const mediaTypeMix = buildMediaTypeMix(dashboard.creatives);
  const approvalMix = buildApprovalMix(dashboard.creatives);
  const brandShare = buildBrandShare(dashboard.creatives);
  const occurrenceTrend = buildOccurrenceTrend(dashboard.creatives);
  const hasCreatives = dashboard.creatives.length > 0;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2.25rem] border border-white/85 bg-[radial-gradient(circle_at_top_left,rgba(244,0,9,0.14),transparent_24%),linear-gradient(135deg,#fff8f6_0%,#ffffff_48%,#fff5f1_100%)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-brand-red/15 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-red">
              Cross-Media Creative Library
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Creative Library
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-[15px]">
              Unified view of workspace-backed creatives across TV, social, web advertising,
              and OOH-ready assets with approval state, occurrences, and monitoring metadata.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[28rem]">
            <SummaryBadge label="Creatives" value={`${dashboard.creatives.length}`} />
            <SummaryBadge label="Approved" value={`${dashboard.creatives.filter((item) => item.approvalState === "approved").length}`} />
            <SummaryBadge label="Needs review" value={`${dashboard.creatives.filter((item) => item.approvalState === "review" || item.approvalState === "pending").length}`} />
            <SummaryBadge label="Tracked occurrences" value={`${dashboard.creatives.reduce((sum, item) => sum + item.occurrences, 0)}`} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Creative Assets" note="Current cross-media library size" tone="brand" value={String(dashboard.creatives.length)} />
          <KpiCard label="Video Creatives" note="TV and digital motion assets" tone="deep" value={String(dashboard.creatives.filter((item) => item.mediaType === "Video").length)} />
          <KpiCard label="Static Creatives" note="Display and OOH-ready packshots" tone="soft" value={String(dashboard.creatives.filter((item) => item.mediaType === "Display").length)} />
          <KpiCard label="Occurrence Pressure" note="All monitored repeat airings and captures" tone="warning" value={String(dashboard.creatives.reduce((sum, item) => sum + item.occurrences, 0))} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AreaTrendCard
          title="Creative Occurrence Trend"
          subtitle="Recent occurrence pressure across the current creative library"
          data={occurrenceTrend}
          formatter={(value) => `${value} hits`}
        />
        <ShareOfVoiceCard
          title="Creative Share Of Voice"
          subtitle="Brand-weighted share of the current creative library footprint"
          data={brandShare}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <CategoryBarCard
          title="Media Type Distribution"
          subtitle="How the current creative library is split by media type"
          data={mediaTypeMix}
        />
        <CategoryBarCard
          title="Approval Queue"
          subtitle="Creative review and activation states"
          data={approvalMix}
        />
      </section>

      <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-red text-white">
            <CreativeIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Creative Library Shelf</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cross-media creative records captured from the current workspace.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {hasCreatives ? dashboard.creatives.map((creative) => (
            <article
              className="grid gap-4 rounded-[1.7rem] border border-border bg-[linear-gradient(135deg,#ffffff_0%,#fbf7f4_100%)] p-5 lg:grid-cols-[180px_1fr]"
              key={creative.id}
            >
              <div className="flex items-center justify-center rounded-[1.4rem] border border-border bg-white p-4">
                <img
                  alt={`${creative.name} creative preview`}
                  className="h-[140px] w-full object-contain"
                  src={creative.thumbnailUrl}
                />
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-red px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                        {creative.brand}
                      </span>
                      <span className="rounded-full border border-border bg-panel-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {creative.mediaType}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${approvalClassName(creative.approvalState)}`}>
                        {creative.approvalState}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-foreground">{creative.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{creative.product} · {creative.campaign}</p>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{creative.notes}</p>
                  </div>

                  <div className="rounded-[1.25rem] border border-border bg-panel-soft px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Occurrences</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{creative.occurrences}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricTile label="Aspect Ratio" value={creative.aspectRatio} />
                  <MetricTile label="Duration" value={creative.durationLabel} />
                  <MetricTile label="Last Seen" value={formatShortDate(creative.lastSeenAt)} />
                </div>

                <div className="flex flex-wrap gap-2">
                  {creative.tags.map((tag) => (
                    <span className="rounded-full border border-brand-red/14 bg-brand-red/5 px-3 py-1 text-xs font-semibold text-brand-red" key={`${creative.id}-${tag}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          )) : (
            <div className="xl:col-span-2 rounded-[1.4rem] border border-dashed border-border bg-panel-soft px-4 py-8 text-sm text-muted-foreground">
              No real creative records are available yet.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#d33a54,#b00020)] text-white">
            <ReportIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Creative Review Notes</h2>
            <p className="text-sm text-muted-foreground">Quick monitoring notes for approval and occurrence triage.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {dashboard.creatives.slice(0, 4).map((creative) => (
            <div className="rounded-[1.3rem] border border-border bg-panel-soft px-4 py-4" key={`${creative.id}-note`}>
              <p className="text-sm font-semibold text-foreground">{creative.name}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">{creative.brand} · {creative.mediaType}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                First seen {formatShortDate(creative.firstSeenAt)} and last captured {formatShortDate(creative.lastSeenAt)}.
              </p>
            </div>
          ))}
          {!hasCreatives ? (
            <div className="md:col-span-2 xl:col-span-4 rounded-[1.3rem] border border-dashed border-border bg-panel-soft px-4 py-6 text-sm text-muted-foreground">
              No creative review notes are available because the workspace has no real creative assets yet.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function buildMediaTypeMix(creatives: Awaited<ReturnType<typeof getMonitoringDashboardData>>["creatives"]) {
  const map = new Map<string, number>();
  for (const creative of creatives) {
    map.set(creative.mediaType, (map.get(creative.mediaType) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value, note: "Workspace creative count" }));
}

function buildApprovalMix(creatives: Awaited<ReturnType<typeof getMonitoringDashboardData>>["creatives"]) {
  const map = new Map<string, number>();
  for (const creative of creatives) {
    map.set(creative.approvalState, (map.get(creative.approvalState) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, value]) => ({
    label,
    value,
    note: "Creative workflow state",
    color: label === "approved" ? "#16a34a" : label === "active" ? "#F40009" : label === "review" ? "#f59e0b" : "#d33a54",
  }));
}

function buildBrandShare(creatives: Awaited<ReturnType<typeof getMonitoringDashboardData>>["creatives"]) {
  const total = Math.max(creatives.reduce((sum, creative) => sum + creative.occurrences, 0), 1);
  const byBrand = new Map<string, number>();
  for (const creative of creatives) {
    byBrand.set(creative.brand, (byBrand.get(creative.brand) ?? 0) + creative.occurrences);
  }

  return [...byBrand.entries()].map(([label, occurrences]) => ({
    label,
    share: occurrences / total,
    note: `${occurrences} occurrences`,
    valueLabel: `${occurrences} hits`,
  }));
}

function buildOccurrenceTrend(creatives: Awaited<ReturnType<typeof getMonitoringDashboardData>>["creatives"]) {
  return creatives
    .slice(0, 6)
    .map((creative) => ({
      label: formatShortDate(creative.lastSeenAt),
      value: creative.occurrences,
    }))
    .reverse();
}

function approvalClassName(state: string) {
  if (state === "approved") return "bg-[#ebfff0] text-[#168c45]";
  if (state === "active") return "bg-brand-red/10 text-brand-red";
  if (state === "review") return "bg-[#fff7e8] text-[#b57600]";
  return "bg-panel-soft text-muted-foreground";
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

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
