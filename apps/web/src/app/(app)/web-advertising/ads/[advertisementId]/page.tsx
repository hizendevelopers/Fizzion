import Link from "next/link";

import { getWebAdvertisingAdDetail } from "@/lib/web-ad-data";

export default async function WebAdvertisingAdDetailPage(
  { params }: { params: Promise<{ advertisementId: string }> },
) {
  const { advertisementId } = await params;
  const ad = await getWebAdvertisingAdDetail(advertisementId);

  if (!ad) {
    return (
      <div className="rounded-[1.8rem] border border-dashed border-border bg-white px-6 py-8 text-sm text-muted-foreground">
        Advertisement record not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/85 bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{ad.websiteName}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{ad.pageTitle ?? ad.pageUrl}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Captured: {ad.capturedAt} {"\u00b7"} Confidence: {ad.confidence != null ? String(ad.confidence) : "Not available"}
            </p>
          </div>
          <Link className="text-sm font-semibold text-brand-red" href="/web-advertising">
            Back to Web Advertising
          </Link>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <h2 className="text-lg font-semibold text-foreground">Ad Metadata</h2>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Website" value={ad.websiteDomain} />
            <Row label="Page URL" value={ad.pageUrl} />
            <Row label="Review status" value={ad.reviewStatus} />
            <Row label="Source domain" value={ad.sourceDomain ?? "Not available"} />
            <Row label="Destination URL" value={ad.destinationUrl ?? "Not available"} />
            <Row label="Dimensions" value={ad.dimensions ?? "Not available"} />
            <Row label="Creative text" value={ad.creativeText ?? "Not available"} />
          </div>
        </article>

        <article className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <h2 className="text-lg font-semibold text-foreground">Screenshot Evidence</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="overflow-hidden rounded-[1.3rem] border border-border bg-panel-soft">
              {ad.screenshotUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={`Cropped advertisement screenshot from ${ad.websiteName}`}
                  className="h-full min-h-56 w-full object-cover"
                  src={ad.screenshotUrl}
                />
              ) : (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                  Cropped advertisement screenshot not available
                </div>
              )}
            </div>
            <div className="overflow-hidden rounded-[1.3rem] border border-border bg-panel-soft">
              {ad.evidenceUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={`Full-page evidence screenshot from ${ad.websiteName}`}
                  className="h-full min-h-56 w-full object-cover"
                  src={ad.evidenceUrl}
                />
              ) : (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                  Full-page evidence screenshot not available
                </div>
              )}
            </div>
          </div>
        </article>
      </section>
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
