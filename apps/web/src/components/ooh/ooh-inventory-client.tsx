"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useMemo, useState } from "react";

import type { OohAnalyticsSummary, OohAreaItem, OohAssetListItem, OohBrandItem } from "@/lib/ooh/ooh-data";
import type { OohAssetListQuery } from "@/lib/ooh/ooh-schemas";
import { OohImportPanel } from "./ooh-import-panel";
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
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} ${currency ?? ""}`.trim();
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
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const areaOptions = useMemo(() => getAreaOptions(areas, query.city), [areas, query.city]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/88 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <span className="inline-flex rounded-full bg-brand-red-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-red">
                Inventory + map intelligence
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">OOH Intelligence</h1>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Build your real outdoor inventory here, upload site images yourself, separate billboard and digital
                screen assets cleanly, and manage commercial rates, dates, campaign budgets, and map coverage in one
                workflow.
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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <KpiCard label="Total Assets" value={String(analytics.totalAssets)} note="Database-backed filtered total" />
            <KpiCard label="Active Campaigns" value={String(analytics.activeCampaigns)} note="Current placements in filtered scope" />
            <KpiCard label="Billboards" value={String(analytics.totalBillboards)} note="Static inventory count" tone="brand" />
            <KpiCard label="Digital Screens" value={String(analytics.totalDigitalScreens)} note="LED and digital-screen count" tone="info" />
            <KpiCard label="Daily Impressions" value={formatCompactNumber(analytics.estimatedDailyImpressions)} note="Estimated from uploaded asset audience records" />
            <KpiCard label="Average Daily Rate" value={formatCurrency(analytics.averageDailyRate, query.city === "Baghdad" ? "IQD" : "PKR")} note="Computed from filtered placements" />
          </div>

          <div className="rounded-[1.8rem] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
            <form action="/ooh-intelligence" className="grid gap-3 lg:grid-cols-[1.4fr_repeat(6,minmax(0,1fr))]">
              <input
                defaultValue={query.search ?? ""}
                name="search"
                placeholder="Search asset code, location, or address"
                className="rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm"
              />
              <select name="mediaType" defaultValue={query.mediaType ?? ""} className="rounded-2xl border border-border bg-panel-soft px-3 py-3 text-sm">
                <option value="">All media</option>
                <option value="BILLBOARD">Billboard</option>
                <option value="DIGITAL_SCREEN">Digital Screens</option>
              </select>
              <select name="city" defaultValue={query.city ?? ""} className="rounded-2xl border border-border bg-panel-soft px-3 py-3 text-sm">
                <option value="">All cities</option>
                <option value="Karachi">Karachi</option>
                <option value="Baghdad">Baghdad</option>
              </select>
              <select name="area" defaultValue={query.area ?? ""} className="rounded-2xl border border-border bg-panel-soft px-3 py-3 text-sm">
                <option value="">All areas</option>
                {areaOptions.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.city} · {area.name}
                  </option>
                ))}
              </select>
              <select name="brandId" defaultValue={query.brandId ?? ""} className="rounded-2xl border border-border bg-panel-soft px-3 py-3 text-sm">
                <option value="">All brands</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              <select name="sort" defaultValue={query.sort ?? ""} className="rounded-2xl border border-border bg-panel-soft px-3 py-3 text-sm">
                <option value="">Sort by asset code</option>
                <option value="highest_audience">Highest audience</option>
                <option value="lowest_cost">Lowest cost</option>
                <option value="highest_cost">Highest cost</option>
                <option value="highest_visibility">Highest visibility</option>
                <option value="recently_installed">Recently installed</option>
              </select>
              <button
                type="submit"
                className="rounded-2xl bg-sidebar px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Apply filters
              </button>
            </form>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-panel-soft px-3 py-1.5">All</span>
              <span className="rounded-full border border-border px-3 py-1.5">Billboard</span>
              <span className="rounded-full border border-border px-3 py-1.5">Digital Screens</span>
              <span className="rounded-full border border-border px-3 py-1.5">Results: {total}</span>
            </div>
          </div>

          <OohImportPanel />

          <div className="flex gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setMobileView("map")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${mobileView === "map" ? "bg-sidebar text-white" : "border border-border bg-white"}`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setMobileView("list")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${mobileView === "list" ? "bg-sidebar text-white" : "border border-border bg-white"}`}
            >
              Results
            </button>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <div className={mobileView === "list" ? "hidden md:block" : ""}>
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

            <div className={mobileView === "map" ? "hidden md:block" : ""}>
              <div className="rounded-[1.8rem] border border-border bg-white shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Filtered inventory</p>
                    <p className="text-xs text-muted-foreground">{total} results synchronized with the current map state</p>
                  </div>
                </div>
                <div className="max-h-[540px] space-y-3 overflow-y-auto p-4">
                  {assets.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-border bg-panel-soft px-5 py-10 text-center text-sm text-muted-foreground">
                      No OOH assets matched the current filters yet. Start by adding a billboard or digital screen,
                      then upload the picture, rates, and dates to see them here.
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <Link href="/ooh-intelligence/assets/new?mediaType=BILLBOARD" className="rounded-full bg-brand-red px-4 py-2 text-xs font-semibold text-white">
                          Add Billboard
                        </Link>
                        <Link href="/ooh-intelligence/assets/new?mediaType=DIGITAL_SCREEN" className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-foreground">
                          Add Digital Screen
                        </Link>
                      </div>
                    </div>
                  ) : null}
                  {assets.map((asset) => (
                    <Link
                      key={asset.id}
                      href={`/ooh-intelligence/assets/${asset.id}`}
                      id={`ooh-result-${asset.id}`}
                      className={`block rounded-[1.5rem] border px-4 py-4 transition ${
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
                            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No image</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{asset.assetCode}</span>
                            <Badge tone={asset.mediaType === "DIGITAL_SCREEN" ? "info" : "brand"}>
                              {asset.mediaType === "DIGITAL_SCREEN" ? "Digital Screen" : "Billboard"}
                            </Badge>
                            <Badge tone={asset.status === "AVAILABLE" ? "success" : asset.status === "ACTIVE" ? "brand" : "warning"}>
                              {asset.status}
                            </Badge>
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
                    </Link>
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

function Badge({ children, tone }: { children: React.ReactNode; tone: "brand" | "info" | "success" | "warning" }) {
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
