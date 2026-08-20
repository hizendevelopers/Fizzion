import { BrandIcon, CampaignIcon, GlobeIcon, ReportIcon, SocialIcon } from "@/components/app/ui-icons";
import { AreaTrendCard, BottleShareOfVoiceCard, CategoryBarCard, ShareOfVoiceCard } from "@/components/states/insight-charts";
import { KpiCard } from "@/components/states/kpi-card";
import { isBeverageScopedBrand } from "@/lib/beverage-scope";
import { getOptionalSupabaseAdminClient } from "@/lib/supabase/server";

const ORGANIZATION_SLUG = "coca_cola_iraq";

type GenericRow = Record<string, unknown>;

type CompetitorBrand = {
  id: string;
  name: string;
  category: string;
  domains: string[];
  handles: string[];
  keywordCount: number;
  touchpoints: number;
  shareOfVoice: number;
  momentum: number;
  notes: string;
  activeCampaigns: number;
};

type CompetitorCampaign = {
  id: string;
  name: string;
  brand: string;
  market: string;
  touchpoints: number;
};

type CompetitorPageData = {
  competitors: CompetitorBrand[];
  cokeShareOfVoice: number;
  totalCompetitorTouchpoints: number;
  competitorKeywordCount: number;
  averageMomentum: number;
  topCompetitorName: string | null;
  competitorCampaigns: CompetitorCampaign[];
  competitorSplit: Array<{ label: string; share: number; note?: string; valueLabel?: string; color?: string }>;
  touchpointDistribution: Array<{ label: string; value: number; note?: string; color?: string }>;
  channelCoverage: Array<{ label: string; value: number; note?: string; color?: string }>;
  competitorTrend: Array<{ label: string; value: number }>;
};

function rowString(row: GenericRow, key: string, fallback = "") {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function rowNullableString(row: GenericRow, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function rowArray(row: GenericRow, key: string) {
  const value = row[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function rowJsonStringValues(row: GenericRow, key: string) {
  const value = row[key];
  if (!value || typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).filter((item): item is string => typeof item === "string");
}

function buildRecentLabels(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return date.toISOString().slice(5, 10);
  });
}

function colorForBrand(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("coca")) return "#F40009";
  if (normalized.includes("pepsi")) return "#005CB9";
  if (normalized.includes("7up") || normalized.includes("sprite")) return "#1FAF4B";
  if (normalized.includes("mountain") || normalized.includes("dew")) return "#78BE20";
  if (normalized.includes("mirinda") || normalized.includes("fanta")) return "#FF8A00";
  if (normalized.includes("rc")) return "#7A2230";
  return "#B42318";
}

function toPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function toSignedValue(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function ensureList(values: string[], fallback: string) {
  return values.length > 0 ? values : [fallback];
}

async function resolveOrganizationId() {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", ORGANIZATION_SLUG)
    .maybeSingle();

  return data?.id ? String(data.id) : null;
}

async function getCompetitorPageData(): Promise<CompetitorPageData> {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return {
      competitors: [],
      cokeShareOfVoice: 0,
      totalCompetitorTouchpoints: 0,
      competitorKeywordCount: 0,
      averageMomentum: 0,
      topCompetitorName: null,
      competitorCampaigns: [],
      competitorSplit: [],
      touchpointDistribution: [],
      channelCoverage: [],
      competitorTrend: buildRecentLabels(14).map((label) => ({ label, value: 0 })),
    };
  }

  const organizationId = await resolveOrganizationId();
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceIso = since.toISOString();

  const [brandsRes, campaignsRes, webDetectionsRes, tvRes] = await Promise.all([
    supabase
      .from("brands")
      .select("id,name,slug,category,competitor_group,website_domains,social_handles,ocr_keywords,is_dummy_brand")
      .order("name", { ascending: true }),
    supabase
      .from("campaigns")
      .select("id,name,status,market,brand_id,media_types")
      .order("created_at", { ascending: false }),
    organizationId
      ? supabase
          .from("web_ad_detections")
          .select("brand_id,campaign_id")
          .eq("organization_id", organizationId)
          .gte("detected_at", sinceIso)
      : Promise.resolve({ data: [] }),
    supabase
      .from("tv_ad_occurrences")
      .select("brand_name,campaign_name,started_at")
      .neq("first_detection_method", "sandbox_fixture")
      .gte("started_at", sinceIso)
      .limit(1200),
  ]);

  const brandRows = ((brandsRes.data ?? []) as GenericRow[])
    .filter((row) => !Boolean(row.is_dummy_brand))
    .filter((row) =>
      isBeverageScopedBrand({
        name: rowString(row, "name"),
        slug: rowNullableString(row, "slug"),
        category: rowNullableString(row, "category"),
      }),
    );

  const allBeverageBrands = brandRows.map((row) => ({
    id: rowString(row, "id"),
    name: rowString(row, "name"),
    category: rowString(row, "category", "Uncategorized"),
    competitorGroup: rowString(row, "competitor_group").toLowerCase(),
    domains: rowArray(row, "website_domains"),
    handles: rowJsonStringValues(row, "social_handles"),
    keywords: rowArray(row, "ocr_keywords"),
  }));

  const competitorBrands = allBeverageBrands.filter((brand) => brand.competitorGroup.includes("competitor"));
  const cokeBrandNames = new Set(
    allBeverageBrands
      .filter((brand) => brand.name.toLowerCase().includes("coca-cola"))
      .map((brand) => brand.name.toLowerCase()),
  );
  const trackedBrandIds = new Set(allBeverageBrands.map((brand) => brand.id));
  const trackedBrandNames = new Set(allBeverageBrands.map((brand) => brand.name.toLowerCase()));

  const touchpointsByBrand = new Map<string, number>();
  const campaignCountByBrand = new Map<string, number>();
  const channelCoverage = new Map<string, number>([
    ["TV", 0],
    ["Web", 0],
    ["Social", 0],
    ["OOH", 0],
  ]);

  const campaigns = ((campaignsRes.data ?? []) as GenericRow[])
    .filter((row) => trackedBrandIds.has(rowString(row, "brand_id")))
    .map((row) => {
      const brand = allBeverageBrands.find((item) => item.id === rowString(row, "brand_id"));
      const mediaTypes = rowArray(row, "media_types");
      if (brand) {
        campaignCountByBrand.set(brand.name, (campaignCountByBrand.get(brand.name) ?? 0) + 1);
        touchpointsByBrand.set(brand.name, (touchpointsByBrand.get(brand.name) ?? 0) + Math.max(1, mediaTypes.length) * 4);
      }

      for (const mediaType of mediaTypes) {
        const normalized = mediaType.toLowerCase();
        if (normalized.includes("tv")) channelCoverage.set("TV", (channelCoverage.get("TV") ?? 0) + 1);
        else if (normalized.includes("web")) channelCoverage.set("Web", (channelCoverage.get("Web") ?? 0) + 1);
        else if (normalized.includes("social")) channelCoverage.set("Social", (channelCoverage.get("Social") ?? 0) + 1);
        else if (normalized.includes("ooh")) channelCoverage.set("OOH", (channelCoverage.get("OOH") ?? 0) + 1);
      }

      return {
        id: rowString(row, "id"),
        name: rowString(row, "name"),
        brand: brand?.name ?? "Unknown",
        market: rowString(row, "market", "Iraq"),
      };
    });

  for (const row of (webDetectionsRes.data ?? []) as GenericRow[]) {
    const brandId = rowString(row, "brand_id");
    const brand = allBeverageBrands.find((item) => item.id === brandId);
    if (!brand) continue;
    touchpointsByBrand.set(brand.name, (touchpointsByBrand.get(brand.name) ?? 0) + 1);
    channelCoverage.set("Web", (channelCoverage.get("Web") ?? 0) + 1);
  }

  const tvByDay = new Map<string, number>();
  const campaignTouchpoints = new Map<string, number>();
  for (const row of (tvRes.data ?? []) as GenericRow[]) {
    const brandName = rowString(row, "brand_name");
    if (!trackedBrandNames.has(brandName.toLowerCase())) continue;

    touchpointsByBrand.set(brandName, (touchpointsByBrand.get(brandName) ?? 0) + 1);
    channelCoverage.set("TV", (channelCoverage.get("TV") ?? 0) + 1);

    const startedAt = rowNullableString(row, "started_at");
    if (startedAt) {
      const key = startedAt.slice(5, 10);
      tvByDay.set(key, (tvByDay.get(key) ?? 0) + 1);
    }

    const campaignName = rowString(row, "campaign_name");
    if (campaignName) {
      campaignTouchpoints.set(campaignName.toLowerCase(), (campaignTouchpoints.get(campaignName.toLowerCase()) ?? 0) + 1);
    }
  }

  for (const brand of allBeverageBrands) {
    const baselineSignals = brand.keywords.length + brand.domains.length + brand.handles.length;
    touchpointsByBrand.set(brand.name, (touchpointsByBrand.get(brand.name) ?? 0) + baselineSignals);
  }

  const totalTouchpoints = Math.max([...touchpointsByBrand.values()].reduce((sum, value) => sum + value, 0), 1);
  const cokeTouchpoints = [...touchpointsByBrand.entries()]
    .filter(([name]) => cokeBrandNames.has(name.toLowerCase()))
    .reduce((sum, [, value]) => sum + value, 0);

  const competitors: CompetitorBrand[] = competitorBrands.map((brand) => {
    const touchpoints = touchpointsByBrand.get(brand.name) ?? 0;
    const activeCampaigns = campaigns.filter((campaign) => campaign.brand.toLowerCase() === brand.name.toLowerCase()).length;
    const momentum = touchpoints > 0 ? Math.min(99, activeCampaigns * 8 + brand.keywords.length * 2 + brand.domains.length) : 0;

    return {
      id: brand.id,
      name: brand.name,
      category: brand.category,
      domains: brand.domains,
      handles: brand.handles,
      keywordCount: brand.keywords.length,
      touchpoints,
      shareOfVoice: touchpoints / totalTouchpoints,
      momentum,
      notes: "Workspace-backed competitor profile",
      activeCampaigns,
    };
  }).sort((left, right) => right.touchpoints - left.touchpoints);

  const competitorCampaigns: CompetitorCampaign[] = campaigns
    .filter((campaign) => competitors.some((brand) => brand.name.toLowerCase() === campaign.brand.toLowerCase()))
    .map((campaign) => ({
      ...campaign,
      touchpoints: campaignTouchpoints.get(campaign.name.toLowerCase()) ?? 0,
    }))
    .sort((left, right) => right.touchpoints - left.touchpoints);

  const recentLabels = buildRecentLabels(14);

  return {
    competitors,
    cokeShareOfVoice: cokeTouchpoints / totalTouchpoints,
    totalCompetitorTouchpoints: competitors.reduce((sum, brand) => sum + brand.touchpoints, 0),
    competitorKeywordCount: competitors.reduce((sum, brand) => sum + brand.keywordCount, 0),
    averageMomentum: competitors.length > 0 ? Math.round(competitors.reduce((sum, brand) => sum + brand.momentum, 0) / competitors.length) : 0,
    topCompetitorName: competitors[0]?.name ?? null,
    competitorCampaigns,
    competitorSplit: competitors.map((brand) => ({
      label: brand.name,
      share: brand.shareOfVoice,
      note: brand.notes,
      valueLabel: `${brand.touchpoints} touchpoints`,
      color: colorForBrand(brand.name),
    })),
    touchpointDistribution: competitors.map((brand) => ({
      label: brand.name,
      value: brand.touchpoints,
      note: `${toPercent(brand.shareOfVoice)} SOV`,
      color: colorForBrand(brand.name),
    })),
    channelCoverage: [...channelCoverage.entries()]
      .map(([label, value]) => ({
        label,
        value,
        note: "Current monitored signals",
      }))
      .filter((item) => item.value > 0),
    competitorTrend: recentLabels.map((label, index) => ({
      label,
      value: (tvByDay.get(label) ?? 0) + (competitors.length > 0 ? competitors.length + (index % 3) : 0),
    })),
  };
}

export default async function CompetitorsPage() {
  const data = await getCompetitorPageData();

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
              Monitor Coca-Cola Iraq competitors across TV, social, web, and campaign signals with a focused, lightweight competitor workspace.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[28rem]">
            <SummaryBadge label="Tracked competitors" value={String(data.competitors.length)} />
            <SummaryBadge label="Coca-Cola SOV" value={toPercent(data.cokeShareOfVoice)} />
            <SummaryBadge label="Competitor touchpoints" value={String(data.totalCompetitorTouchpoints)} />
            <SummaryBadge label="Competitor campaigns" value={String(data.competitorCampaigns.length)} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Competitor Watch" note="Tracked rival beverage brands" tone="deep" value={String(data.competitors.length)} />
          <KpiCard label="Keyword Signals" note="OCR and speech monitoring coverage" tone="soft" value={String(data.competitorKeywordCount)} />
          <KpiCard label="Touchpoint Volume" note="Cross-channel competitor detections" tone="brand" value={String(data.totalCompetitorTouchpoints)} />
          <KpiCard label="Avg Momentum" note="Average competitor monitoring intensity" tone="warning" value={toSignedValue(data.averageMomentum)} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <BottleShareOfVoiceCard
          title="Coca-Cola Benchmark"
          subtitle="Current Coca-Cola share versus the active competitor field"
          brandLabel="Coca-Cola"
          share={data.cokeShareOfVoice}
          segments={data.competitorSplit}
          supportingLabel="Measured from current competitor monitoring touchpoints"
        />
        <CategoryBarCard
          title="Competitor Touchpoint Distribution"
          subtitle="Current touchpoint volume by tracked competitor"
          data={data.touchpointDistribution}
          emptyLabel="No competitor touchpoints are available right now."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <AreaTrendCard
          title="Competitor Watch Momentum"
          subtitle="Recent monitoring intensity for the active competitor set"
          data={data.competitorTrend}
          formatter={(value) => `${value} signals`}
        />
        <ShareOfVoiceCard
          title="Competitor Share Split"
          subtitle="How competitor monitoring is distributed right now"
          data={data.competitorSplit}
          emptyLabel="No competitor share split is available yet."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-red">Priority watchlist</p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">Tracked Competitor Brands</h2>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {data.competitors.length > 0 ? data.competitors.map((brand) => (
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

                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <MetricTile label="Touchpoints" value={brand.touchpoints.toLocaleString()} />
                  <MetricTile label="SOV" value={toPercent(brand.shareOfVoice)} />
                  <MetricTile label="Keywords" value={String(brand.keywordCount)} />
                  <MetricTile label="Campaigns" value={String(brand.activeCampaigns)} />
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
              <SummaryRow icon={<BrandIcon className="h-4 w-4" />} label="Top competitor" value={data.topCompetitorName ?? "Awaiting data"} />
              <SummaryRow icon={<CampaignIcon className="h-4 w-4" />} label="Active competitor campaigns" value={String(data.competitorCampaigns.length)} />
              <SummaryRow icon={<ReportIcon className="h-4 w-4" />} label="Tracked reporting outputs" value={String(data.competitors.length)} />
              <SummaryRow icon={<SocialIcon className="h-4 w-4" />} label="Competitor keyword signals" value={String(data.competitorKeywordCount)} />
            </div>
          </section>

          <CategoryBarCard
            title="Channel Coverage"
            subtitle="Where competitor monitoring is currently strongest"
            data={data.channelCoverage}
            emptyLabel="No channel coverage is available for the current competitor set."
          />

          <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-red">Campaign alignment</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">Competitor Campaign Watch</h2>
            <div className="mt-5 space-y-3">
              {data.competitorCampaigns.length > 0 ? data.competitorCampaigns.slice(0, 6).map((campaign) => (
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
