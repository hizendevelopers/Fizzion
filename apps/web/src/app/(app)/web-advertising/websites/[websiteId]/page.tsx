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

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{website.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{website.domain}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Last scan: {website.lastScanAt ?? "Awaiting first synchronization"} · Status: {website.currentStatus}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <WebAdScanButton websiteId={website.id} />
            <Link className="text-sm font-semibold text-brand-red" href="/web-advertising">
              Back to Web Advertising
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <h2 className="text-lg font-semibold text-foreground">Website Summary</h2>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Verification" value={website.verificationStatus} />
            <Row label="Pages monitored" value={String(website.pagesMonitored)} />
            <Row label="Scans completed" value={String(website.scansCompleted)} />
            <Row label="Failed scans" value={String(website.failedScans)} />
            <Row label="Ads detected" value={String(website.adsDetected)} />
          </div>
        </article>

        <article className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <h2 className="text-lg font-semibold text-foreground">Monitored Pages</h2>
          <div className="mt-4 space-y-3">
            {website.pages.length > 0 ? (
              website.pages.map((page) => (
                <div className="rounded-[1.2rem] border border-border bg-panel-soft px-4 py-3 text-sm" key={String(page.id)}>
                  <p className="font-medium text-foreground">{String(page.title ?? page.url)}</p>
                  <p className="mt-1 text-muted-foreground">{String(page.url)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                No monitored pages have been stored for this website yet.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-lg font-semibold text-foreground">Recent Scan Runs</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">Started</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Pages</th>
                <th className="py-2 font-medium">Ads</th>
              </tr>
            </thead>
            <tbody>
              {website.runs.length > 0 ? (
                website.runs.map((run) => (
                  <tr className="border-t border-border" key={String(run.id)}>
                    <td className="py-3 pr-4 text-muted-foreground">{String(run.started_at)}</td>
                    <td className="py-3 pr-4 text-foreground">{String(run.status)}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{String(run.pages_crawled ?? 0)}</td>
                    <td className="py-3 text-muted-foreground">{String(run.ads_detected ?? 0)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-4 text-muted-foreground" colSpan={4}>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[1.1rem] border border-border bg-panel-soft px-4 py-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
