import Link from "next/link";

import { WebAdScanButton } from "@/components/app/web-ad-scan-button";
import { KpiCard } from "@/components/states/kpi-card";
import { getWebAdvertisingAnalytics, listWebAdvertisingAds, listWebAdvertisingWebsites } from "@/lib/web-ad-data";

export default async function WebAdvertisingPage() {
  const [analytics, websites, ads] = await Promise.all([
    getWebAdvertisingAnalytics(),
    listWebAdvertisingWebsites(),
    listWebAdvertisingAds(),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Web Advertising Intelligence</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              Review authorized website monitoring records, crawl history, advertisement occurrences,
              and screenshot evidence from the existing web tables.
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-border bg-panel-soft px-4 py-3 text-sm text-muted-foreground">
            <p>Last scan: {analytics.lastScanTime ?? "Awaiting first synchronization"}</p>
            <p className="mt-1">Verified websites: {analytics.verifiedWebsites}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Connected Websites" note="Authorized workspace websites" tone="brand" value={String(analytics.connectedWebsites)} />
          <KpiCard label="Scans Completed" note="Completed crawl runs" tone="deep" value={String(analytics.scansCompleted)} />
          <KpiCard label="Ads Detected" note="Occurrences stored in database" tone="soft" value={String(analytics.adsDetected)} />
          <KpiCard label="Unique Creatives" note="Creative-level deduplicated records" tone="warning" value={String(analytics.uniqueCreatives)} />
          <KpiCard label="Needs Review" note="Confidence below confirmed threshold" value={String(analytics.adsRequiringReview)} />
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Monitored Websites</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Real websites from the current workspace schema, with scan and occurrence counts.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {websites.length > 0 ? (
            websites.map((website) => (
              <article className="rounded-[1.5rem] border border-border bg-panel-soft p-4" key={website.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{website.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{website.domain}</p>
                    <p className="mt-3 text-xs text-muted-foreground">{website.freshnessLabel}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-muted-foreground">
                    {website.currentStatus}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <MetricTile label="Pages" value={String(website.pagesMonitored)} />
                  <MetricTile label="Scans" value={String(website.scansCompleted)} />
                  <MetricTile label="Ads" value={String(website.adsDetected)} />
                </div>
                <div className="mt-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link className="text-sm font-semibold text-brand-red" href={`/web-advertising/websites/${website.id}`}>
                      View website detail
                    </Link>
                    <WebAdScanButton compact websiteId={website.id} />
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-border px-4 py-5 text-sm text-muted-foreground xl:col-span-2">
              No monitored websites are available yet. Add authorized websites and run scans before
              this module can report live data.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-lg font-semibold text-foreground">Advertisement Gallery</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ads.length > 0 ? (
            ads.slice(0, 12).map((ad) => (
              <Link className="rounded-[1.5rem] border border-border bg-panel-soft p-4" href={`/web-advertising/ads/${ad.id}`} key={ad.id}>
                <div className="overflow-hidden rounded-[1.2rem] border border-border bg-white">
                  {ad.screenshotUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={`Advertisement screenshot from ${ad.websiteName}`}
                      className="h-44 w-full object-cover"
                      loading="lazy"
                      src={ad.screenshotUrl}
                    />
                  ) : (
                    <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                      Screenshot evidence not available
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <p className="font-semibold text-foreground">{ad.websiteName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{ad.pageTitle ?? ad.pageUrl}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{ad.capturedAt}</span>
                    <span>{ad.reviewStatus}</span>
                    <span>{ad.confidence != null ? `Confidence ${ad.confidence}` : "Not available"}</span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-border px-4 py-5 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
              No website advertisement occurrences are available for this workspace yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-border bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
