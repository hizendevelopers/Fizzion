/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { notFound } from "next/navigation";

import { OohAssetActions } from "@/components/ooh/ooh-asset-actions";
import { OohMap } from "@/components/ooh/ooh-map";
import { getOohAssetDetail } from "@/lib/ooh/ooh-data";

type PageProps = {
  params: Promise<{ assetId: string }>;
};

type OohDisplayImage = {
  id: string;
  imageUrl: string;
  imageType: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

function formatCurrency(value: number | null | undefined, currency: string | null | undefined) {
  if (value === null || value === undefined) return "Not available";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} ${currency ?? ""}`.trim();
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}

export default async function OohAssetDetailPage({ params }: PageProps) {
  const { assetId } = await params;
  const asset = await getOohAssetDetail(assetId);
  if (!asset) {
    notFound();
  }

  const currentPlacement = asset.placements.find((placement) => placement.status === "CURRENT") ?? asset.placements[0] ?? null;
  const heroImage =
    asset.images.find((image) => image.isPrimary && image.imageType === "SITE_PHOTO") ??
    asset.images.find((image) => image.imageType === "SITE_PHOTO") ??
    asset.images.find((image) => image.isPrimary) ??
    asset.images[0] ??
    (currentPlacement?.creativeImageUrl
      ? {
          id: "placement-creative",
          imageUrl: currentPlacement.creativeImageUrl,
          imageType: "CREATIVE",
          altText: `${asset.locationName} creative preview`,
          sortOrder: -1,
          isPrimary: false,
        }
      : null) ??
    (currentPlacement?.proofOfPlayUrl
      ? {
          id: "placement-proof",
          imageUrl: currentPlacement.proofOfPlayUrl,
          imageType: "PROOF_OF_PLAY",
          altText: `${asset.locationName} proof of play`,
          sortOrder: -1,
          isPrimary: false,
        }
      : null);
  const fallbackGalleryImagesSeed: Array<OohDisplayImage | null> = [
    currentPlacement?.creativeImageUrl
      ? {
          id: "placement-creative",
          imageUrl: currentPlacement.creativeImageUrl,
          imageType: "CREATIVE",
          altText: `${asset.locationName} creative preview`,
          sortOrder: 0,
          isPrimary: false,
        }
      : null,
    currentPlacement?.proofOfPlayUrl
      ? {
          id: "placement-proof",
          imageUrl: currentPlacement.proofOfPlayUrl,
          imageType: "PROOF_OF_PLAY",
          altText: `${asset.locationName} proof of play`,
          sortOrder: 1,
          isPrimary: false,
        }
      : null,
  ];
  const fallbackGalleryImages = fallbackGalleryImagesSeed.filter((image): image is OohDisplayImage => image !== null);
  const galleryImages: OohDisplayImage[] = asset.images.length > 0 ? asset.images : fallbackGalleryImages;

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/88 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="overflow-hidden rounded-[1.8rem] border border-border bg-white shadow-[var(--shadow-soft)]">
              {heroImage ? (
                <img src={heroImage.imageUrl} alt={heroImage.altText ?? asset.assetCode} className="h-[360px] w-full object-cover" />
              ) : (
                <div className="flex h-[360px] items-center justify-center bg-panel-soft text-sm text-muted-foreground">
                  No uploaded image available
                </div>
              )}
            </div>
            <div className="rounded-[1.8rem] border border-border bg-white p-6 shadow-[var(--shadow-soft)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-brand-red-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-red">
                  {asset.mediaType === "DIGITAL_SCREEN" ? "Digital Screen" : "Billboard"}
                </span>
                <span className="rounded-full bg-panel-soft px-3 py-1 text-xs font-medium text-muted-foreground">
                  {asset.status}
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{asset.assetCode}</h1>
              <p className="mt-2 text-lg font-medium text-foreground">{asset.locationName}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {asset.city} · {asset.areaName ?? "Area unavailable"} · {asset.country}
              </p>
              <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
                <div>Brand: {asset.brandName ?? "Unassigned"}</div>
                <div>Campaign: {asset.campaignName ?? "Unassigned"}</div>
                <div>Installed: {formatDateLabel(currentPlacement?.installedAt)}</div>
                <div>Daily rate: {formatCurrency(currentPlacement?.dailyCost, currentPlacement?.currency)}</div>
              </div>
              <div className="mt-6">
                <OohAssetActions assetId={asset.id} />
              </div>
              <div className="mt-6">
                <Link href="/ooh-intelligence" className="text-sm font-medium text-brand-red">
                  Back to OOH
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <DetailSection title="Location information">
              <InfoGrid
                items={[
                  ["Address", asset.address ?? "Not available"],
                  ["Landmark", asset.landmark ?? "Not available"],
                  ["Facing direction", asset.facingDirection ?? "Not available"],
                  ["Road type", asset.roadType ?? "Not available"],
                  ["Latitude", asset.latitude?.toFixed(6) ?? "Not available"],
                  ["Longitude", asset.longitude?.toFixed(6) ?? "Not available"],
                ]}
              />
              <div className="mt-4">
                <OohMap assets={[asset]} highlightedAssetId={asset.id} />
              </div>
            </DetailSection>

            <DetailSection title="Campaign and commercial information">
              <InfoGrid
                items={[
                  ["Brand", asset.brandName ?? "Unassigned"],
                  ["Campaign", asset.campaignName ?? "Unassigned"],
                  ["Slogan", asset.campaignSlogan ?? "Not available"],
                  ["Campaign start", formatDateLabel(asset.campaignStartDate)],
                  ["Campaign end", formatDateLabel(asset.campaignEndDate)],
                  ["Placement status", asset.placementStatus ?? "Not available"],
                  ["Daily cost", formatCurrency(currentPlacement?.dailyCost, currentPlacement?.currency)],
                  ["Weekly cost", formatCurrency(currentPlacement?.weeklyCost, currentPlacement?.currency)],
                  ["Monthly cost", formatCurrency(currentPlacement?.monthlyCost, currentPlacement?.currency)],
                  ["Media owner", asset.mediaOwner ?? "Not available"],
                  ["Contact name", asset.contactName ?? "Not available"],
                  ["Contact phone", asset.contactPhone ?? "Not available"],
                ]}
              />
            </DetailSection>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <DetailSection title="Audience information">
              <InfoGrid
                items={[
                  ["Expected daily audience", asset.audience?.expectedDailyAudience?.toLocaleString() ?? "Not available"],
                  ["Vehicle volume", asset.audience?.dailyVehicleVolume?.toLocaleString() ?? "Not available"],
                  ["Pedestrian volume", asset.audience?.dailyPedestrianVolume?.toLocaleString() ?? "Not available"],
                  ["Daily impressions", asset.audience?.estimatedDailyImpressions?.toLocaleString() ?? "Not available"],
                  ["Monthly reach", asset.audience?.estimatedMonthlyReach?.toLocaleString() ?? "Not available"],
                  ["Average frequency", asset.audience?.averageFrequency?.toString() ?? "Not available"],
                  ["Dwell time", asset.audience?.dwellTimeSeconds?.toString() ?? "Not available"],
                  ["Visibility score", asset.audience?.visibilityScore?.toString() ?? "Not available"],
                  ["Nearby POIs", asset.audience?.nearbyPoiCount?.toString() ?? "Not available"],
                  ["Confidence", asset.audience?.audienceConfidence ?? "Not available"],
                ]}
              />
            </DetailSection>

            <DetailSection title="Technical information">
              <InfoGrid
                items={[
                  ["Width", asset.width?.toString() ?? "Not available"],
                  ["Height", asset.height?.toString() ?? "Not available"],
                  ["Dimension unit", asset.dimensionUnit],
                  ["Total SQM", asset.totalSqm?.toString() ?? "Not available"],
                  ["Number of faces", asset.numberOfFaces?.toString() ?? "Not available"],
                  ["Illumination", asset.illumination ?? "Not available"],
                  ["Resolution", asset.digitalSpecification ? `${asset.digitalSpecification.resolutionWidth ?? "?"} × ${asset.digitalSpecification.resolutionHeight ?? "?"}` : "Not available"],
                  ["Brightness", asset.digitalSpecification?.brightnessNits?.toString() ?? "Not available"],
                  ["Operating hours", asset.digitalSpecification ? `${asset.digitalSpecification.operatingStartTime ?? "?"} - ${asset.digitalSpecification.operatingEndTime ?? "?"}` : "Not available"],
                  ["Loop / spot", asset.digitalSpecification ? `${asset.digitalSpecification.loopLengthSeconds ?? "?"}s / ${asset.digitalSpecification.spotLengthSeconds ?? "?"}s` : "Not available"],
                ]}
              />
            </DetailSection>
          </div>

          <DetailSection title="Image gallery">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {galleryImages.map((image) => (
                <div key={image.id} className="overflow-hidden rounded-[1.5rem] border border-border bg-white shadow-[var(--shadow-soft)]">
                  <img src={image.imageUrl} alt={image.altText ?? asset.assetCode} className="h-56 w-full object-cover" />
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    <div className="font-medium text-foreground">{image.imageType.replaceAll("_", " ")}</div>
                    <div className="mt-1">{image.altText ?? "No alt text supplied"}</div>
                  </div>
                </div>
              ))}
              {galleryImages.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-border bg-panel-soft px-4 py-10 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                  No uploaded images are attached to this OOH asset yet.
                </div>
              ) : null}
            </div>
          </DetailSection>
        </div>
      </section>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl bg-panel-soft px-4 py-3">
          <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
          <div className="mt-2 text-sm font-medium text-foreground">{value}</div>
        </div>
      ))}
    </div>
  );
}
