import Link from "next/link";

import { WebAdScanButton } from "@/components/app/web-ad-scan-button";
import { KpiCard } from "@/components/states/kpi-card";
import {
  type WebAdvertisingAdItem,
  getWebAdvertisingAnalytics,
  listWebAdvertisingAds,
  listWebAdvertisingWebsites,
} from "@/lib/web-ad-data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function WebAdvertisingPage(
  { searchParams }: { searchParams?: SearchParams },
) {
  const params = searchParams ? await searchParams : {};
  const [analytics, websites, ads] = await Promise.all([
    getWebAdvertisingAnalytics(),
    listWebAdvertisingWebsites(),
    listWebAdvertisingAds(),
  ]);

  const q = firstParam(params.q).trim().toLowerCase();
  const websiteFilter = firstParam(params.website);
  const reviewFilter = firstParam(params.review);
  const confidenceFilter = firstParam(params.confidence);
  const sort = firstParam(params.sort) || "recent";

  const filteredWebsites = websites.filter((website) => {
    const matchesSearch = q.length === 0
      || website.name.toLowerCase().includes(q)
      || website.domain.toLowerCase().includes(q);

    const matchesWebsite = !websiteFilter || website.id === websiteFilter;
    return matchesSearch && matchesWebsite;
  });

  const filteredAds = sortAds(
    ads.filter((ad) => {
      const haystack = [
        ad.websiteName,
        ad.websiteDomain,
        ad.pageTitle ?? "",
        ad.pageUrl,
        ad.sourceDomain ?? "",
        ad.brandName ?? "",
        ad.campaignName ?? "",
        ad.creativeText ?? "",
      ].join(" ").toLowerCase();

      const matchesSearch = q.length === 0 || haystack.includes(q);
      const matchesWebsite = !websiteFilter || ad.websiteId === websiteFilter;
      const matchesReview = !reviewFilter || normalizeReview(ad.reviewStatus) === reviewFilter;
      const matchesConfidence =
        !confidenceFilter
        || (confidenceFilter === "high" && (ad.confidence ?? 0) >= 0.8)
        || (confidenceFilter === "medium" && (ad.confidence ?? 0) >= 0.6 && (ad.confidence ?? 0) < 0.8)
        || (confidenceFilter === "low" && (ad.confidence ?? 0) < 0.6);

      return matchesSearch && matchesWebsite && matchesReview && matchesConfidence;
    }),
    sort,
  );

  const activeWebsites = filteredWebsites.filter((website) => website.currentStatus !== "failed").length;
  const latestAds = filteredAds.slice(0, 12);
  const staleSources = filteredWebsites.filter((website) => !website.lastScanAt).length;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2.25rem] border border-white/85 bg-[radial-gradient(circle_at_top_left,rgba(244,0,9,0.12),transparent_28%),linear-gradient(135deg,#fff8f6_0%,#ffffff_48%,#fff6f2_100%)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-brand-red/15 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-red">
              Enterprise Website Monitoring
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Web Advertising Intelligence
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-[15px]">
              Monitor authorized websites, review captured advertisement evidence, and track crawl
              health from one operational workspace. All cards below are driven by the current web
              advertising records and live scan results.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[27rem]">
            <SummaryBadge label="Last successful scan" value={formatDateTime(analytics.lastScanTime)} />
            <SummaryBadge label="Verified sources" value={`${analytics.verifiedWebsites}/${analytics.connectedWebsites}`} />
            <SummaryBadge label="Review queue" value={`${analytics.adsRequiringReview} ad${analytics.adsRequiringReview === 1 ? "" : "s"}`} />
            <SummaryBadge label="Stale sources" value={String(staleSources)} tone={staleSources > 0 ? "warning" : "default"} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Connected Websites" note="Authorized domains in workspace" tone="brand" value={String(analytics.connectedWebsites)} />
          <KpiCard label="Active Sources" note="Websites ready for operational scans" tone="deep" value={String(activeWebsites)} />
          <KpiCard label="Ads Detected" note="Total captured advertisement occurrences" tone="soft" value={String(analytics.adsDetected)} />
          <KpiCard label="Unique Creatives" note="Deduplicated creative fingerprints" tone="warning" value={String(analytics.uniqueCreatives)} />
          <KpiCard label="Failed Scans" note="Runs that need investigation or retry" value={String(analytics.failedScans)} />
        </div>
      </section>

      <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Operational Filters</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Filter the live website roster and captured ad gallery without losing your current
              dashboard context.
            </p>
          </div>
          <Link
            className="text-sm font-semibold text-brand-red"
            href="/web-advertising"
          >
            Reset filters
          </Link>
        </div>

        <form className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
          <FilterField
            defaultValue={firstParam(params.q)}
            label="Search"
            name="q"
            placeholder="Website, page, domain, creative text"
          />
          <FilterSelect
            defaultValue={websiteFilter}
            label="Website"
            name="website"
            options={[
              { label: "All websites", value: "" },
              ...websites.map((website) => ({ label: website.name, value: website.id })),
            ]}
          />
          <FilterSelect
            defaultValue={reviewFilter}
            label="Review status"
            name="review"
            options={[
              { label: "All statuses", value: "" },
              { label: "Confirmed", value: "confirmed" },
              { label: "Needs review", value: "needs-review" },
            ]}
          />
          <FilterSelect
            defaultValue={confidenceFilter}
            label="Confidence"
            name="confidence"
            options={[
              { label: "All confidence bands", value: "" },
              { label: "High (0.80+)", value: "high" },
              { label: "Medium (0.60-0.79)", value: "medium" },
              { label: "Low (<0.60)", value: "low" },
            ]}
          />
          <FilterSelect
            defaultValue={sort}
            label="Sort by"
            name="sort"
            options={[
              { label: "Most recent", value: "recent" },
              { label: "Highest confidence", value: "confidence" },
              { label: "Most repeated", value: "repeat" },
              { label: "Website name", value: "website" },
            ]}
          />
          <div className="lg:col-span-2 xl:col-span-5">
            <button
              className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-red-deep"
              type="submit"
            >
              Apply filters
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Monitored Websites</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {filteredWebsites.length} website{filteredWebsites.length === 1 ? "" : "s"} matching the current operational filters.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            {filteredWebsites.length > 0 ? (
              filteredWebsites.map((website) => (
                <article
                  className="rounded-[1.6rem] border border-border bg-[linear-gradient(135deg,#ffffff_0%,#fcf8f5_100%)] p-5"
                  key={website.id}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">{website.name}</h3>
                        <StatusPill label={website.currentStatus} tone={website.currentStatus === "failed" ? "warning" : "default"} />
                        <StatusPill label={website.verificationStatus} tone="soft" />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{website.domain}</p>
                      <p className="mt-3 text-sm text-muted-foreground">{website.freshnessLabel}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand-red/30 hover:text-brand-red"
                        href={`/web-advertising/websites/${website.id}`}
                      >
                        Open detail
                      </Link>
                      <WebAdScanButton compact websiteId={website.id} />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricTile label="Pages" value={String(website.pagesMonitored)} />
                    <MetricTile label="Completed scans" value={String(website.scansCompleted)} />
                    <MetricTile label="Detected ads" value={String(website.adsDetected)} />
                    <MetricTile label="Failed scans" value={String(website.failedScans)} />
                  </div>
                </article>
              ))
            ) : (
              <EmptyState
                body="No monitored websites match the current filters. Adjust your search or clear the active filters."
                title="No website results"
              />
            )}
          </div>
        </article>

        <article className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <h2 className="text-lg font-semibold text-foreground">Operational Snapshot</h2>
          <div className="mt-4 grid gap-3">
            <SnapshotRow
              label="Latest scan completion"
              value={formatDateTime(analytics.lastScanTime)}
            />
            <SnapshotRow
              label="Confirmed creatives"
              value={String(filteredAds.filter((ad) => normalizeReview(ad.reviewStatus) === "confirmed").length)}
            />
            <SnapshotRow
              label="Needs review"
              value={String(filteredAds.filter((ad) => normalizeReview(ad.reviewStatus) === "needs-review").length)}
            />
            <SnapshotRow
              label="Sources with evidence"
              value={String(new Set(filteredAds.map((ad) => ad.websiteId)).size)}
            />
          </div>
        </article>
      </section>

      <section className="rounded-[1.9rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Advertisement Gallery</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filteredAds.length} captured advertisement occurrence{filteredAds.length === 1 ? "" : "s"} matching the current filters.
            </p>
          </div>
          <div className="rounded-full border border-border bg-panel-soft px-3 py-1 text-xs text-muted-foreground">
            Showing {latestAds.length} of {filteredAds.length}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {latestAds.length > 0 ? (
            latestAds.map((ad) => (
              <Link
                className="group rounded-[1.6rem] border border-border bg-[linear-gradient(180deg,#ffffff_0%,#fcf8f5_100%)] p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
                href={`/web-advertising/ads/${ad.id}`}
                key={ad.id}
              >
                <div className="overflow-hidden rounded-[1.25rem] border border-border bg-white">
                  {ad.screenshotUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={`Advertisement screenshot from ${ad.websiteName}`}
                      className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      loading="lazy"
                      src={ad.screenshotUrl}
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center px-4 text-center text-xs text-muted-foreground">
                      Screenshot evidence not available
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{ad.websiteName}</p>
                    <StatusPill label={ad.reviewStatus} tone={normalizeReview(ad.reviewStatus) === "confirmed" ? "soft" : "warning"} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{ad.pageTitle ?? ad.pageUrl}</p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MetricTile label="Confidence" value={ad.confidence != null ? ad.confidence.toFixed(2) : "N/A"} />
                  <MetricTile label="Occurrences" value={String(ad.occurrenceCount)} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{formatDateTime(ad.capturedAt)}</span>
                  <span>{ad.dimensions ?? "Unknown size"}</span>
                  <span>{ad.sourceDomain ?? "Source domain unavailable"}</span>
                </div>
              </Link>
            ))
          ) : (
            <EmptyState
              body="No advertisement occurrences match the active filters right now. Broaden the filters or run a fresh website scan."
              title="No ad evidence found"
            />
          )}
        </div>
      </section>
    </div>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function sortAds(ads: WebAdvertisingAdItem[], sort: string) {
  const cloned = [...ads];

  if (sort === "confidence") {
    return cloned.sort((a, b) => (b.confidence ?? -1) - (a.confidence ?? -1));
  }

  if (sort === "repeat") {
    return cloned.sort((a, b) => b.occurrenceCount - a.occurrenceCount || b.capturedAt.localeCompare(a.capturedAt));
  }

  if (sort === "website") {
    return cloned.sort((a, b) => a.websiteName.localeCompare(b.websiteName) || b.capturedAt.localeCompare(a.capturedAt));
  }

  return cloned.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
}

function normalizeReview(reviewStatus: string) {
  return reviewStatus.toLowerCase().includes("confirmed") ? "confirmed" : "needs-review";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Awaiting first synchronization";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function SummaryBadge(
  { label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warning" },
) {
  return (
    <div className={`rounded-[1.4rem] border px-4 py-3 text-sm shadow-[var(--shadow-soft)] ${tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-white/80 bg-white/85 text-foreground"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function FilterField(
  { defaultValue, label, name, placeholder }: { defaultValue: string; label: string; name: string; placeholder: string },
) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <input
        className="w-full rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-brand-red/35 focus:bg-white"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        type="text"
      />
    </label>
  );
}

function FilterSelect(
  {
    defaultValue,
    label,
    name,
    options,
  }: {
    defaultValue: string;
    label: string;
    name: string;
    options: Array<{ label: string; value: string }>;
  },
) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <select
        className="w-full rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand-red/35 focus:bg-white"
        defaultValue={defaultValue}
        name={name}
      >
        {options.map((option) => (
          <option key={`${name}-${option.value || "all"}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-border bg-white px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function StatusPill({ label, tone = "default" }: { label: string; tone?: "default" | "soft" | "warning" }) {
  const classes =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "soft"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-border bg-white text-muted-foreground";

  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${classes}`}>
      {label}
    </span>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-border bg-panel-soft px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-border bg-panel-soft px-5 py-6 text-sm">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-2 leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}
