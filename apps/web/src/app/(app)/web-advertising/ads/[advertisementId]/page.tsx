import Link from "next/link";

import { ImageLightbox } from "@/components/states/image-lightbox";
import { ShareOfVoiceCard } from "@/components/states/insight-charts";
import { getWebAdvertisingAdDetail, listWebAdvertisingAds } from "@/lib/web-ad-data";

export default async function WebAdvertisingAdDetailPage(
  { params }: { params: Promise<{ advertisementId: string }> },
) {
  const { advertisementId } = await params;
  const [ad, allAds] = await Promise.all([
    getWebAdvertisingAdDetail(advertisementId),
    listWebAdvertisingAds(),
  ]);

  if (!ad) {
    return (
      <div className="rounded-[1.8rem] border border-dashed border-border bg-white px-6 py-8 text-sm text-muted-foreground">
        Advertisement record not found.
      </div>
    );
  }

  const adsByWebsite = new Map<string, { name: string; count: number }>();
  for (const item of allAds) {
    const existing = adsByWebsite.get(item.websiteId) ?? { name: item.websiteName, count: 0 };
    existing.count += 1;
    adsByWebsite.set(item.websiteId, existing);
  }
  const totalAds = Math.max(allAds.length, 1);
  const shareOfVoiceByWebsite = [...adsByWebsite.entries()]
    .map(([websiteId, item]) => ({
      label: item.name,
      note: websiteId === ad.websiteId ? "Current advertisement website" : "Other monitored website",
      share: item.count / totalAds,
      valueLabel: `${item.count} ads`,
    }))
    .sort((left, right) => right.share - left.share)
    .slice(0, 6);

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
            <div className="overflow-hidden rounded-[1.3rem] border border-border bg-panel-soft p-3">
              <ImageLightbox
                alt={`Cropped advertisement screenshot from ${ad.websiteName}`}
                src={ad.screenshotUrl}
                title="Cropped advertisement evidence"
              />
            </div>
            <div className="overflow-hidden rounded-[1.3rem] border border-border bg-panel-soft p-3">
              <ImageLightbox
                alt={`Full-page evidence screenshot from ${ad.websiteName}`}
                src={ad.evidenceUrl}
                title="Full-page evidence screenshot"
              />
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ShareOfVoiceCard
          data={shareOfVoiceByWebsite}
          subtitle="How this website compares with other monitored websites in captured ad volume"
          title="Share Of Voice by Website"
        />
        <article className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <h2 className="text-lg font-semibold text-foreground">Evidence Actions</h2>
          <div className="mt-4 space-y-3">
            <ActionLink href={ad.screenshotUrl} label="Open cropped ad image" />
            <ActionLink href={ad.evidenceUrl} label="Open full-page evidence image" />
            <ActionLink href={ad.pageUrl} label="Open source page" />
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

function ActionLink({ href, label }: { href: string | null; label: string }) {
  if (!href) {
    return (
      <div className="rounded-[1.2rem] border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
        {label} is not available for this record.
      </div>
    );
  }

  return (
    <a
      className="block rounded-[1.2rem] border border-border bg-panel-soft px-4 py-3 text-sm font-semibold text-foreground transition hover:border-brand-red/30 hover:text-brand-red"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {label}
    </a>
  );
}
