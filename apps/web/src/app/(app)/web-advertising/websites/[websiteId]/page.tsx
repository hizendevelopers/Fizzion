import Link from "next/link";

import { WebAdScanButton } from "@/components/app/web-ad-scan-button";
import { getWebAdvertisingWebsiteDetail } from "@/lib/web-ad-data";

export default async function WebAdvertisingWebsiteDetailPage(
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { websiteId } = await params;
  const website = await getWebAdvertisingWebsiteDetail(websiteId);

  if (!website) {
    return (
      <div className="rounded-[1.8rem] border border-dashed border-border bg-white px-6 py-8 text-sm text-muted-foreground">
        Website record not found.
      </div>
    );
  }

  const latestAds = website.ads.slice(0, 8);
  const runningCount = website.runs.filter((run) => String(run.status) === "running").length;
  const failedCount = website.runs.filter((run) => String(run.status) === "failed").length;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2.15rem] border border-white/85 bg-[radial-gradient(circle_at_top_left,rgba(244,0,9,0.12),transparent_28%),linear-gradient(135deg,#fff8f6_0%,#ffffff_52%,#fff6f2_100%)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-brand-red/15 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-red">
              Website Control Center
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              {website.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{website.domain}</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Last scan {formatDateTime(website.lastScanAt)} · Current status {website.currentStatus} ·{" "}
              {website.verificationStatus}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <WebAdScanButton websiteId={website.id} />
            <Link
              className="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand-red/30 hover:text-brand-red"
              href="/web-advertising"
            >
              Back to overview
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricTile label="Pages monitored" value={String(website.pagesMonitored)} />
          <MetricTile label="Completed scans" value={String(website.scansCompleted)} />
          <MetricTile label="Ads detected" value={String(website.adsDetected)} />
          <MetricTile label="Runs in progress" value={String(runningCount)} />
          <MetricTile label="Failed runs" value={String(failedCount)} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[1.85rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <h2 className="text-lg font-semibold text-foreground">Operational Summary</h2>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Verification" value={website.verificationStatus} />
            <Row label="Current status" value={website.currentStatus} />
            <Row label="Latest scan state" value={website.latestRunStatus ?? "Awaiting first synchronization"} />
            <Row label="Latest ads detected" value={String(website.latestAdsDetected)} />
            <Row label="Notes" value={website.notes ?? "No operational notes recorded"} />
          </div>
        </article>

        <article className="rounded-[1.85rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Latest Captures</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Most recent advertisement evidence captured from this website.
              </p>
            </div>
            <span className="rounded-full border border-border bg-panel-soft px-3 py-1 text-xs text-muted-foreground">
              {latestAds.length} recent item{latestAds.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {latestAds.length > 0 ? (
              latestAds.map((ad) => (
                <Link
                  className="rounded-[1.4rem] border border-border bg-panel-soft p-3 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
                  href={`/web-advertising/ads/${ad.id}`}
                  key={ad.id}
                >
                  <div className="overflow-hidden rounded-[1rem] border border-border bg-white">
                    {ad.screenshotUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={`Advertisement screenshot from ${website.name}`}
                        className="h-36 w-full object-cover"
                        loading="lazy"
                        src={ad.screenshotUrl}
                      />
                    ) : (
                      <div className="flex h-36 items-center justify-center px-3 text-center text-xs text-muted-foreground">
                        Screenshot unavailable
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="line-clamp-2 text-sm font-semibold text-foreground">{ad.pageTitle ?? ad.pageUrl}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(ad.capturedAt)}</p>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState
                body="Run a fresh scan to capture ad evidence and populate this panel."
                title="No captures available"
              />
            )}
          </div>
        </article>
      </section>

      <section className="rounded-[1.85rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Monitored Pages</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Production pages that are currently stored as part of this website’s monitoring scope.
            </p>
          </div>
          <span className="rounded-full border border-border bg-panel-soft px-3 py-1 text-xs text-muted-foreground">
            {website.pages.length} configured page{website.pages.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {website.pages.length > 0 ? (
            website.pages.map((page) => (
              <div className="rounded-[1.35rem] border border-border bg-panel-soft p-4 text-sm" key={String(page.id)}>
                <p className="font-semibold text-foreground">{String(page.title ?? page.url)}</p>
                <p className="mt-2 break-all text-muted-foreground">{String(page.url)}</p>
              </div>
            ))
          ) : (
            <EmptyState
              body="No monitored pages have been stored for this website yet."
              title="No monitored pages"
            />
          )}
        </div>
      </section>

      <section className="rounded-[1.85rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Recent Scan Runs</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Operational history for scans started against this website.
            </p>
          </div>
          <span className="rounded-full border border-border bg-panel-soft px-3 py-1 text-xs text-muted-foreground">
            {website.runs.length} run{website.runs.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <th className="py-3 pr-4 font-medium">Started</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium">Pages</th>
                <th className="py-3 pr-4 font-medium">Ads</th>
                <th className="py-3 font-medium">Completed</th>
              </tr>
            </thead>
            <tbody>
              {website.runs.length > 0 ? (
                website.runs.map((run) => (
                  <tr className="border-b border-border/70 last:border-0" key={String(run.id)}>
                    <td className="py-4 pr-4 text-muted-foreground">{formatDateTime(String(run.started_at ?? ""))}</td>
                    <td className="py-4 pr-4">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${String(run.status) === "failed" ? "bg-amber-50 text-amber-900" : String(run.status) === "completed" ? "bg-emerald-50 text-emerald-800" : "bg-panel-soft text-muted-foreground"}`}>
                        {String(run.status)}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-foreground">{String(run.pages_crawled ?? 0)}</td>
                    <td className="py-4 pr-4 text-foreground">{String(run.ads_detected ?? 0)}</td>
                    <td className="py-4 text-muted-foreground">{formatDateTime(String(run.completed_at ?? ""))}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-4 text-muted-foreground" colSpan={5}>
                    No scan runs are available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
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

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-border bg-white px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.1rem] border border-border bg-panel-soft px-4 py-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right font-semibold text-foreground">{value}</span>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.45rem] border border-dashed border-border bg-panel-soft px-5 py-6 text-sm sm:col-span-2">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-2 leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}
