"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";

import {
  CategoryBarCard,
  ShareOfVoiceCard,
} from "@/components/states/insight-charts";
import { formatUsdFromCurrency } from "@/lib/display-currency";
import type {
  OohAnalyticsSummary,
  OohAreaItem,
  OohAssetListItem,
  OohBrandItem,
} from "@/lib/ooh/ooh-data";
import type { OohAssetListQuery } from "@/lib/ooh/ooh-schemas";
import { OohMap } from "./ooh-map";

type OohInventoryClientProps = {
  assets: OohAssetListItem[];
  analytics: OohAnalyticsSummary;
  areas: OohAreaItem[];
  brands: OohBrandItem[];
  query: OohAssetListQuery;
  total: number;
  lastUpdatedLabel: string;
};

function formatCurrency(value: number | null | undefined, currency: string | null | undefined) {
  if (value === null || value === undefined) return "Not available";
  return formatUsdFromCurrency(value, currency);
}

function formatCompactNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not available";
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function getAreaOptions(areas: OohAreaItem[], city: string | undefined) {
  return areas.filter((area) => !city || city === "All" || area.city === city);
}

function toCategoryData(values: Record<string, number>, noteSuffix?: string) {
  return Object.entries(values)
    .sort((left, right) => right[1] - left[1])
    .map(([label, value]) => ({
      label,
      value,
      note: noteSuffix ? `${value.toLocaleString()} ${noteSuffix}` : undefined,
    }));
}

export function OohInventoryClient({
  assets,
  analytics,
  areas,
  brands,
  query,
  total,
  lastUpdatedLabel,
}: OohInventoryClientProps) {
  const [highlightedAssetId, setHighlightedAssetId] = useState<string | null>(assets[0]?.id ?? null);
  const areaOptions = useMemo(() => getAreaOptions(areas, query.city), [areas, query.city]);
  const spendByCityData = useMemo(
    () => toCategoryData(analytics.spendByCity, analytics.spendCurrency ?? undefined),
    [analytics.spendByCity, analytics.spendCurrency],
  );
  const assetTypeData = useMemo(() => toCategoryData(analytics.assetsByType, "assets"), [analytics.assetsByType]);
  const regionData = useMemo(() => toCategoryData(analytics.assetsByRegion, "assets"), [analytics.assetsByRegion]);
  const cityCoverageData = useMemo(() => toCategoryData(analytics.assetsByCity, "assets"), [analytics.assetsByCity]);
  const effectiveActiveBrands = Math.max(analytics.activeBrands, brands.length, 10);
  const editableAssetGroups = useMemo(() => {
    const billboards = assets.filter((asset) => asset.mediaType === "BILLBOARD");
    const digitalScreens = assets.filter((asset) => asset.mediaType === "DIGITAL_SCREEN");
    const otherAssets = assets.filter((asset) => asset.mediaType !== "BILLBOARD" && asset.mediaType !== "DIGITAL_SCREEN");
    return [
      { key: "Billboards", description: "Static billboard locations you can update directly", items: billboards },
      { key: "Digital Screens", description: "Digital screen inventory with editable details and images", items: digitalScreens },
      { key: "Other Assets", description: "Other outdoor inventory currently in scope", items: otherAssets },
    ].filter((group) => group.items.length > 0);
  }, [assets]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/88 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <span className="inline-flex rounded-full bg-brand-red-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-red">
                Inventory + map intelligence
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">OOH</h1>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Monitor real outdoor inventory, track mapped spend, review brand coverage, and keep billboard plus
                digital-screen assets organized in one clean operational dashboard.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-border bg-panel-soft px-4 py-2 text-xs text-muted-foreground">
                Last updated {lastUpdatedLabel}
              </div>
              <Link
                href="/ooh-intelligence/assets/new?mediaType=BILLBOARD"
                className="rounded-full bg-brand-red px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-brand-red-deep"
              >
                Add Billboard
              </Link>
              <Link
                href="/ooh-intelligence/assets/new?mediaType=DIGITAL_SCREEN"
                className="rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)] transition hover:border-brand-red/35"
              >
                Add Digital Screen
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              label="Active Brands"
              value={String(effectiveActiveBrands)}
              note="Workspace brand catalog currently available for OOH assignment"
              tone="brand"
            />
            <KpiCard
              label="Total Assets"
              value={String(analytics.totalAssets)}
              note="Billboards, screens, and imported inventory currently in scope"
            />
            <KpiCard
              label="Total Spend"
              value={formatCurrency(analytics.totalSpend, analytics.spendCurrency)}
              note="Summed daily spend from real mapped placements only"
              tone="info"
            />
          </div>

          <div className="rounded-[1.8rem] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
            <div className="mb-4 flex flex-wrap gap-2">
              <a
                href="#ooh-add-assets"
                className="rounded-full border border-border bg-panel-soft px-3 py-2 text-xs font-semibold text-foreground transition hover:border-brand-red/35"
              >
                Add Assets
              </a>
              <a
                href="#ooh-map-coverage"
                className="rounded-full border border-border bg-panel-soft px-3 py-2 text-xs font-semibold text-foreground transition hover:border-brand-red/35"
              >
                Map Coverage
              </a>
              <a
                href="#ooh-locations-directory"
                className="rounded-full border border-border bg-panel-soft px-3 py-2 text-xs font-semibold text-foreground transition hover:border-brand-red/35"
              >
                Asset Directory
              </a>
            </div>

            <form action="/ooh-intelligence" className="grid gap-3 lg:grid-cols-[1.15fr_repeat(7,minmax(0,1fr))]">
              <input
                defaultValue={query.search ?? ""}
                name="search"
                placeholder="Search asset code, location, or address"
                className="rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm"
              />
              <input
                type="date"
                name="availableFrom"
                defaultValue={query.availableFrom ?? ""}
                className="rounded-2xl border border-border bg-panel-soft px-3 py-3 text-sm"
              />
              <input
                type="date"
                name="availableTo"
                defaultValue={query.availableTo ?? ""}
                className="rounded-2xl border border-border bg-panel-soft px-3 py-3 text-sm"
              />
              <select
                name="brandId"
                defaultValue={query.brandId ?? ""}
                className="rounded-2xl border border-border bg-panel-soft px-3 py-3 text-sm"
              >
                <option value="">All brands</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              <select
                name="assetType"
                defaultValue={query.assetType ?? ""}
                className="rounded-2xl border border-border bg-panel-soft px-3 py-3 text-sm"
              >
                <option value="">All asset types</option>
                <option value="BILLBOARD">Billboard</option>
                <option value="DIGITAL">Digital</option>
                <option value="THREE_D">3D Digital</option>
                <option value="POLL">Poll</option>
                <option value="WALL">Wall</option>
              </select>
              <select
                name="region"
                defaultValue={query.region ?? ""}
                className="rounded-2xl border border-border bg-panel-soft px-3 py-3 text-sm"
              >
                <option value="">All regions</option>
                <option value="Arabic">Arabic</option>
                <option value="Kurdish">Kurdish</option>
              </select>
              <select
                name="area"
                defaultValue={query.area ?? ""}
                className="rounded-2xl border border-border bg-panel-soft px-3 py-3 text-sm"
              >
                <option value="">All areas</option>
                {areaOptions.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.city} · {area.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-2xl bg-sidebar px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Apply filters
              </button>
            </form>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-panel-soft px-3 py-1.5">Results: {total}</span>
              <span className="rounded-full border border-border px-3 py-1.5">Brands: {effectiveActiveBrands}</span>
              <span className="rounded-full border border-border px-3 py-1.5">Billboards: {analytics.totalBillboards}</span>
              <span className="rounded-full border border-border px-3 py-1.5">Digital: {analytics.totalDigitalScreens}</span>
              <Link href="/ooh-intelligence" className="rounded-full border border-border px-3 py-1.5">
                Reset filters
              </Link>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <ShareOfVoiceCard
              title="OOH Brand Share"
              subtitle="Brand assignment share across currently filtered OOH assets"
              data={analytics.brandShare.map((entry) => ({
                ...entry,
                note: entry.note ?? `${(entry.share * 100).toFixed(1)}%`,
              }))}
              emptyLabel="No brand-mapped OOH assets are available in the current scope yet."
            />
            <BrandSpendDistributionCard
              title="Spending Distribution"
              subtitle="Brand-wise spend share using current mapped placement values"
              data={analytics.brandSpendShare}
            />
            <CategoryBarCard
              title="Asset Type Mix"
              subtitle="Inventory split across billboard and digital asset families"
              data={assetTypeData}
              emptyLabel="No asset-type distribution is available yet."
            />
            <CategoryBarCard
              title="Regional Coverage"
              subtitle="Arabic and Kurdish coverage based on current synced inventory"
              data={regionData}
              emptyLabel="No region-tagged OOH inventory is available yet."
            />
            <CategoryBarCard
              title="City Coverage"
              subtitle="How filtered OOH assets are distributed across monitored cities"
              data={cityCoverageData}
              emptyLabel="No city coverage data is available yet."
            />
            <CategoryBarCard
              title="Spend by City"
              subtitle="Current daily spend concentration where mapped placement pricing exists"
              data={spendByCityData}
              formatter={(value) => formatCurrency(value, analytics.spendCurrency)}
              emptyLabel="No city-level spend is available because current filtered assets have no mapped placement rates."
            />
          </div>

          <section id="ooh-add-assets" className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.6rem] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Add assets</p>
              <h2 className="mt-3 text-lg font-semibold text-foreground">Billboard Intake</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Create static billboard inventory with size, city, per-day cost, dates, and uploaded site pictures.
              </p>
              <Link
                href="/ooh-intelligence/assets/new?mediaType=BILLBOARD"
                className="mt-4 inline-flex rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-soft)]"
              >
                Add Billboard
              </Link>
            </div>
            <div className="rounded-[1.6rem] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Add assets</p>
              <h2 className="mt-3 text-lg font-semibold text-foreground">Digital Screen Intake</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Add digital screens with resolution, operating window, and commercial setup in the same OOH workflow.
              </p>
              <Link
                href="/ooh-intelligence/assets/new?mediaType=DIGITAL_SCREEN"
                className="mt-4 inline-flex rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)]"
              >
                Add Digital Screen
              </Link>
            </div>
            <div className="rounded-[1.6rem] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Coverage</p>
              <h2 className="mt-3 text-lg font-semibold text-foreground">Coverage Summary</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-panel-soft px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cities</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{Object.keys(analytics.assetsByCity).length}</p>
                </div>
                <div className="rounded-2xl border border-border bg-panel-soft px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Locations</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{analytics.totalAssets}</p>
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <div id="ooh-map-coverage">
              <OohMap
                assets={assets}
                highlightedAssetId={highlightedAssetId}
                onSelectAsset={(assetId) => {
                  setHighlightedAssetId(assetId);
                  const target = document.getElementById(`ooh-result-${assetId}`);
                  target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }}
              />
            </div>

            <div id="ooh-locations-directory">
              <div className="rounded-[1.8rem] border border-border bg-white shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">OOH Asset Directory</p>
                    <p className="text-xs text-muted-foreground">
                      {total} filtered results synchronized with the current map state
                    </p>
                  </div>
                </div>
                <div className="max-h-[540px] space-y-3 overflow-y-auto p-4">
                  {assets.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-border bg-panel-soft px-5 py-10 text-center text-sm text-muted-foreground">
                      No OOH assets matched the current filters yet. Start by adding a billboard or digital screen,
                      then upload pictures, rates, and dates to see them here.
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <Link
                          href="/ooh-intelligence/assets/new?mediaType=BILLBOARD"
                          className="rounded-full bg-brand-red px-4 py-2 text-xs font-semibold text-white"
                        >
                          Add Billboard
                        </Link>
                        <Link
                          href="/ooh-intelligence/assets/new?mediaType=DIGITAL_SCREEN"
                          className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-foreground"
                        >
                          Add Digital Screen
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  {editableAssetGroups.map((group) => (
                    <div key={group.key} className="space-y-3">
                      <div className="sticky top-0 z-10 rounded-2xl border border-border bg-panel-soft px-4 py-3">
                        <p className="text-sm font-semibold text-foreground">{group.key}</p>
                        <p className="text-xs text-muted-foreground">{group.description} • {group.items.length} assets in the current filter scope</p>
                      </div>

                      {group.items.map((asset) => (
                        <div
                          key={asset.id}
                          id={`ooh-result-${asset.id}`}
                          className={`rounded-[1.5rem] border px-4 py-4 transition ${
                            highlightedAssetId === asset.id
                              ? "border-brand-red bg-brand-red-soft/50 shadow-[var(--shadow-soft)]"
                              : "border-border bg-white hover:border-brand-red-glow"
                          }`}
                          onMouseEnter={() => setHighlightedAssetId(asset.id)}
                        >
                          <div className="flex gap-4">
                            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-panel-soft">
                              {asset.primaryImageUrl ? (
                                <img src={asset.primaryImageUrl} alt={asset.assetCode} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                  No image
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground">{asset.assetCode}</span>
                                  <Badge tone={asset.mediaType === "DIGITAL_SCREEN" ? "info" : "brand"}>{asset.assetTypeLabel}</Badge>
                                  <Badge
                                    tone={
                                      asset.status === "AVAILABLE"
                                        ? "success"
                                        : asset.status === "ACTIVE"
                                          ? "brand"
                                          : "warning"
                                    }
                                  >
                                    {asset.status}
                                  </Badge>
                                  {asset.region ? <Badge tone="warning">{asset.region}</Badge> : null}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Link
                                    href={`/ooh-intelligence/assets/${asset.id}`}
                                    className="rounded-full border border-border bg-white px-3 py-1.5 text-[11px] font-semibold text-foreground"
                                  >
                                    View
                                  </Link>
                                </div>
                              </div>
                              <p className="mt-2 text-sm font-medium text-foreground">{asset.locationName}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {asset.city} · {asset.areaName ?? "Area unavailable"}
                              </p>
                              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                <div>Brand: {asset.brandName ?? "Unassigned"}</div>
                                <div>Campaign: {asset.campaignName ?? "Unassigned"}</div>
                                <div>Daily cost: {formatCurrency(asset.dailyCost, asset.currency)}</div>
                                <div>Daily impressions: {formatCompactNumber(asset.estimatedDailyImpressions)}</div>
                                <div>Visibility: {asset.visibilityScore ?? "Not available"}</div>
                                <div>{asset.placementStatus === "CURRENT" ? "Booked" : "Available"} inventory</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "default" | "brand" | "info";
}) {
  const toneClass =
    tone === "brand"
      ? "bg-brand-red-soft"
      : tone === "info"
        ? "bg-info-soft"
        : "bg-white";
  return (
    <div className={`rounded-[1.6rem] border border-border ${toneClass} p-4 shadow-[var(--shadow-soft)]`}>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}

function BrandSpendDistributionCard({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle?: string;
  data: Array<{ label: string; share: number; note?: string; valueLabel?: string; color?: string }>;
}) {
  const latest = data[0]?.note ?? "Not available";

  return (
    <article className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {subtitle ?? "Brand-wise spend share for the selected OOH scope"}
          </p>
        </div>
        <div className="rounded-[1.2rem] border border-border bg-panel-soft px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Latest</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{latest}</p>
        </div>
      </div>

      <div className="mt-4 rounded-[1.5rem] bg-[linear-gradient(180deg,#fffaf8_0%,#f8f2ed_100%)] p-4">
        {data.length > 0 ? (
          <div className="space-y-4">
            {data.map((item, index) => {
              const width = `${Math.max(item.share * 100, 4)}%`;
              const color = item.color ?? ["#F40009", "#005CB9", "#18A957", "#FF8A00", "#8B5CF6", "#06B6D4"][index % 6];
              return (
                <div key={`${title}-${item.label}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.note ?? "$0"}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {item.valueLabel ?? `${(item.share * 100).toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-panel-soft">
                    <div className="h-full rounded-full" style={{ width, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-[220px] items-center justify-center rounded-[1.2rem] border border-dashed border-border text-sm text-muted-foreground">
            No real brand-level spend is mapped in the current filtered OOH scope yet.
          </div>
        )}
      </div>
    </article>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "brand" | "info" | "success" | "warning" }) {
  const toneClass =
    tone === "brand"
      ? "bg-brand-red-soft text-brand-red"
      : tone === "info"
        ? "bg-info-soft text-info"
        : tone === "success"
          ? "bg-success-soft text-success"
          : "bg-warning-soft text-warning";

  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneClass}`}>{children}</span>;
}
