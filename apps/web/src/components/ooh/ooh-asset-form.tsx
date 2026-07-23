"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { OohAreaItem, OohAssetDetail, OohBrandItem } from "@/lib/ooh/ooh-data";
import type { OohAssetCreateInput } from "@/lib/ooh/ooh-schemas";
import { OohCoordinatePicker } from "./ooh-coordinate-picker";

type OohAssetFormProps = {
  mode: "create" | "edit";
  areas: OohAreaItem[];
  brands: OohBrandItem[];
  initialAsset?: OohAssetDetail | null;
  initialMediaType?: "BILLBOARD" | "DIGITAL_SCREEN";
};

function buildDefaultFormValue(asset?: OohAssetDetail | null, initialMediaType?: "BILLBOARD" | "DIGITAL_SCREEN"): OohAssetCreateInput {
  const currentPlacement = asset?.placements.find((placement) => placement.status === "CURRENT") ?? asset?.placements[0];
  const currentImageCreative = asset?.images.find((image) => image.imageType === "CREATIVE");
  const currentImageProof = asset?.images.find((image) => image.imageType === "PROOF_OF_PLAY");

  return {
    assetCode: asset?.assetCode ?? "",
    mediaType: (asset?.mediaType as "BILLBOARD" | "DIGITAL_SCREEN" | undefined) ?? initialMediaType ?? "BILLBOARD",
    status:
      (asset?.status as "ACTIVE" | "AVAILABLE" | "RESERVED" | "MAINTENANCE" | "NEEDS_COORDINATES" | "INACTIVE" | undefined) ??
      "ACTIVE",
    country: asset?.country ?? "Pakistan",
    city: asset?.city ?? "Karachi",
    areaId: asset?.areaId ?? null,
    locationName: asset?.locationName ?? "",
    address: asset?.address ?? null,
    landmark: asset?.landmark ?? null,
    latitude: asset?.latitude ?? null,
    longitude: asset?.longitude ?? null,
    width: asset?.width ?? null,
    height: asset?.height ?? null,
    dimensionUnit: (asset?.dimensionUnit as "METER" | "PIXEL" | "THREE_D" | undefined) ?? "METER",
    numberOfFaces: asset?.numberOfFaces ?? 1,
    totalSqm: asset?.totalSqm ?? null,
    facingDirection: asset?.facingDirection ?? null,
    roadType: asset?.roadType ?? null,
    illumination: asset?.illumination ?? null,
    mediaOwner: asset?.mediaOwner ?? null,
    contactName: asset?.contactName ?? null,
    contactPhone: asset?.contactPhone ?? null,
    notes: asset?.notes ?? null,
    campaignId: asset?.campaignId ?? null,
    campaignName: asset?.campaignName ?? null,
    campaignSlogan: asset?.campaignSlogan ?? null,
    brandId: asset?.brandId ?? null,
    brandName: asset?.brandName ?? null,
    brandCategory: asset?.brandCategory ?? null,
    brandLogoUrl: asset?.brandLogoUrl ?? null,
    installedAt: currentPlacement?.installedAt ?? null,
    removedAt: currentPlacement?.removedAt ?? null,
    dailyCost: currentPlacement?.dailyCost ?? null,
    weeklyCost: currentPlacement?.weeklyCost ?? null,
    monthlyCost: currentPlacement?.monthlyCost ?? null,
    currency: currentPlacement?.currency ?? (asset?.city === "Baghdad" ? "IQD" : "PKR"),
    creativeImageUrl: currentPlacement?.creativeImageUrl ?? currentImageCreative?.imageUrl ?? null,
    proofOfPlayUrl: currentPlacement?.proofOfPlayUrl ?? currentImageProof?.imageUrl ?? null,
    placementStatus: (currentPlacement?.status as "CURRENT" | "SCHEDULED" | "COMPLETED" | undefined) ?? "CURRENT",
    availabilityStartDate: asset?.availability[0]?.startDate ?? null,
    availabilityEndDate: asset?.availability[0]?.endDate ?? null,
    availabilityStatus: (asset?.availability[0]?.status as "AVAILABLE" | "RESERVED" | "BOOKED" | "BLOCKED" | undefined) ?? "AVAILABLE",
    availabilityNotes: asset?.availability[0]?.notes ?? null,
    expectedDailyAudience: asset?.audience?.expectedDailyAudience ?? null,
    dailyVehicleVolume: asset?.audience?.dailyVehicleVolume ?? null,
    dailyPedestrianVolume: asset?.audience?.dailyPedestrianVolume ?? null,
    estimatedDailyImpressions: asset?.audience?.estimatedDailyImpressions ?? null,
    estimatedMonthlyReach: asset?.audience?.estimatedMonthlyReach ?? null,
    averageFrequency: asset?.audience?.averageFrequency ?? null,
    dwellTimeSeconds: asset?.audience?.dwellTimeSeconds ?? null,
    visibilityScore: asset?.audience?.visibilityScore ?? null,
    audienceConfidence: asset?.audience?.audienceConfidence ?? null,
    nearbyPoiCount: asset?.audience?.nearbyPoiCount ?? null,
    resolutionWidth: asset?.digitalSpecification?.resolutionWidth ?? null,
    resolutionHeight: asset?.digitalSpecification?.resolutionHeight ?? null,
    brightnessNits: asset?.digitalSpecification?.brightnessNits ?? null,
    operatingStartTime: asset?.digitalSpecification?.operatingStartTime ?? "06:00",
    operatingEndTime: asset?.digitalSpecification?.operatingEndTime ?? "23:59",
    loopLengthSeconds: asset?.digitalSpecification?.loopLengthSeconds ?? 60,
    spotLengthSeconds: asset?.digitalSpecification?.spotLengthSeconds ?? 10,
    estimatedPlaysPerDay: asset?.digitalSpecification?.estimatedPlaysPerDay ?? null,
    images:
      asset?.images.map((image) => ({
        imageUrl: image.imageUrl,
        imageType: image.imageType as "SITE_PHOTO" | "CREATIVE" | "PROOF_OF_PLAY",
        altText: image.altText,
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary,
      })) ?? [],
  };
}

function differenceInCampaignDays(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  const diff = endDate.getTime() - startDate.getTime();
  if (diff < 0) {
    return null;
  }

  return Math.floor(diff / 86_400_000) + 1;
}

function formatMoney(value: number | null | undefined, currency: string | null | undefined) {
  if (value === null || value === undefined) {
    return "Not available";
  }

  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} ${currency ?? ""}`.trim();
}

export function OohAssetForm({ mode, areas, brands, initialAsset, initialMediaType }: OohAssetFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<OohAssetCreateInput>(() => buildDefaultFormValue(initialAsset, initialMediaType));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const areaOptions = useMemo(
    () => areas.filter((area) => area.city === form.city || form.city.length === 0),
    [areas, form.city],
  );
  const campaignDays = useMemo(
    () => differenceInCampaignDays(form.installedAt, form.removedAt),
    [form.installedAt, form.removedAt],
  );
  const campaignBudget = useMemo(() => {
    if (form.dailyCost === null || form.dailyCost === undefined || campaignDays === null) {
      return null;
    }

    return form.dailyCost * campaignDays;
  }, [campaignDays, form.dailyCost]);

  useEffect(() => {
    setForm((current) => {
      const nextWeekly = current.dailyCost === null || current.dailyCost === undefined ? null : current.dailyCost * 7;
      const nextMonthly = current.dailyCost === null || current.dailyCost === undefined ? null : current.dailyCost * 30;

      if (current.weeklyCost === nextWeekly && current.monthlyCost === nextMonthly) {
        return current;
      }

      return {
        ...current,
        weeklyCost: nextWeekly,
        monthlyCost: nextMonthly,
      };
    });
  }, [form.dailyCost]);

  function updateField<Key extends keyof OohAssetCreateInput>(key: Key, value: OohAssetCreateInput[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function uploadImages(files: FileList | null, imageType: "SITE_PHOTO" | "CREATIVE" | "PROOF_OF_PLAY") {
    if (!files || files.length === 0) return;
    setBusy(true);
    setStatus(null);
    try {
      const uploadedImages: OohAssetCreateInput["images"] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", imageType.toLowerCase());
        const response = await fetch("/api/ooh/uploads", {
          method: "POST",
          body: formData,
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error?.message ?? "Upload failed.");
        }
        uploadedImages.push({
          imageUrl: payload.imageUrl as string,
          imageType,
          altText: `${form.locationName || form.assetCode || "OOH asset"} ${imageType.toLowerCase().replaceAll("_", " ")}`,
          sortOrder: form.images.length + uploadedImages.length,
          isPrimary: form.images.length === 0 && imageType === "SITE_PHOTO",
        });
      }
      setForm((current) => {
        const nextImages = [...current.images, ...uploadedImages];
        const latestSitePhoto = [...uploadedImages].reverse().find((image) => image.imageType === "SITE_PHOTO") ?? null;
        const latestCreative = [...uploadedImages].reverse().find((image) => image.imageType === "CREATIVE") ?? null;
        const latestProof = [...uploadedImages].reverse().find((image) => image.imageType === "PROOF_OF_PLAY") ?? null;
        const normalizedImages = nextImages.map((image, index) => ({
          ...image,
          isPrimary: latestSitePhoto
            ? image.imageUrl === latestSitePhoto.imageUrl
            : image.isPrimary || index === 0,
        }));

        return {
          ...current,
          images: normalizedImages,
          creativeImageUrl: latestCreative?.imageUrl ?? current.creativeImageUrl,
          proofOfPlayUrl: latestProof?.imageUrl ?? current.proofOfPlayUrl,
        };
      });
      setStatus(`${uploadedImages.length} image${uploadedImages.length > 1 ? "s" : ""} uploaded successfully.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setStatus(null);
    try {
      const url = mode === "create" ? "/api/ooh/assets" : `/api/ooh/assets/${initialAsset?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Unable to save the OOH asset.");
      }
      router.push(`/ooh-intelligence/assets/${payload.assetId}`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save the OOH asset.");
      setBusy(false);
      return;
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2.2rem] border border-white/85 bg-white/88 p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-brand-red-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-red">
                {mode === "create" ? "New inventory record" : "Edit inventory record"}
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                {mode === "create" ? "Add OOH Location" : `Edit ${initialAsset?.assetCode ?? "OOH Asset"}`}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                Create or update a billboard or digital screen, upload the proof images yourself, and let the platform
                auto-calculate weekly, monthly, and full campaign budget values from your per-day commercial rate.
              </p>
            </div>
          </div>

          {status ? (
            <div className="rounded-2xl border border-warning/35 bg-warning-soft px-4 py-3 text-sm text-foreground">
              {status}
            </div>
          ) : null}

          <FormSection title="Basic information">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TextField label="Asset code" value={form.assetCode} onChange={(value) => updateField("assetCode", value)} />
              <SelectField
                label="Media type"
                value={form.mediaType}
                options={[
                  { label: "Billboard", value: "BILLBOARD" },
                  { label: "Digital Screen", value: "DIGITAL_SCREEN" },
                ]}
                onChange={(value) => updateField("mediaType", value as OohAssetCreateInput["mediaType"])}
              />
              <SelectField
                label="Status"
                value={form.status}
                options={["ACTIVE", "AVAILABLE", "RESERVED", "MAINTENANCE", "NEEDS_COORDINATES", "INACTIVE"].map((value) => ({ label: value, value }))}
                onChange={(value) => updateField("status", value as OohAssetCreateInput["status"])}
              />
              <TextField label="Country" value={form.country} onChange={(value) => updateField("country", value)} />
              <TextField label="City" value={form.city} onChange={(value) => updateField("city", value)} />
              <SelectField
                label="Area"
                value={form.areaId ?? ""}
                options={[{ label: "Select area", value: "" }, ...areaOptions.map((area) => ({ label: area.name, value: area.id }))]}
                onChange={(value) => updateField("areaId", value || null)}
              />
              <TextField
                label="Location name"
                value={form.locationName}
                onChange={(value) => updateField("locationName", value)}
                className="md:col-span-2"
              />
              <TextField label="Address" value={form.address ?? ""} onChange={(value) => updateField("address", value || null)} className="md:col-span-2" />
              <TextField label="Landmark" value={form.landmark ?? ""} onChange={(value) => updateField("landmark", value || null)} className="md:col-span-2" />
            </div>
          </FormSection>

          <FormSection title="Map location">
            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <OohCoordinatePicker
                latitude={form.latitude ?? null}
                longitude={form.longitude ?? null}
                onChange={(latitude, longitude) => {
                  updateField("latitude", latitude);
                  updateField("longitude", longitude);
                }}
              />
              <div className="grid gap-4">
                <NumberField label="Latitude" value={form.latitude} onChange={(value) => updateField("latitude", value)} />
                <NumberField label="Longitude" value={form.longitude} onChange={(value) => updateField("longitude", value)} />
                <p className="rounded-2xl bg-panel-soft px-4 py-3 text-sm text-muted-foreground">
                  Click anywhere on the map or drag the marker to assign exact coordinates. Imported assets without
                  coordinates should be saved as <strong>NEEDS_COORDINATES</strong> until confirmed.
                </p>
              </div>
            </div>
          </FormSection>

          <FormSection title="Media specifications">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <NumberField label="Width" value={form.width} onChange={(value) => updateField("width", value)} />
              <NumberField label="Height" value={form.height} onChange={(value) => updateField("height", value)} />
              <SelectField
                label="Dimension unit"
                value={form.dimensionUnit}
                options={["METER", "PIXEL", "THREE_D"].map((value) => ({ label: value, value }))}
                onChange={(value) => updateField("dimensionUnit", value as OohAssetCreateInput["dimensionUnit"])}
              />
              <NumberField label="Number of faces" value={form.numberOfFaces} onChange={(value) => updateField("numberOfFaces", value ?? 1)} />
              <NumberField label="Total SQM" value={form.totalSqm} onChange={(value) => updateField("totalSqm", value)} />
              <TextField label="Facing direction" value={form.facingDirection ?? ""} onChange={(value) => updateField("facingDirection", value || null)} />
              <TextField label="Road type" value={form.roadType ?? ""} onChange={(value) => updateField("roadType", value || null)} />
              <TextField label="Illumination" value={form.illumination ?? ""} onChange={(value) => updateField("illumination", value || null)} />
            </div>
            {form.mediaType === "DIGITAL_SCREEN" ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <NumberField label="Resolution width" value={form.resolutionWidth} onChange={(value) => updateField("resolutionWidth", value)} />
                <NumberField label="Resolution height" value={form.resolutionHeight} onChange={(value) => updateField("resolutionHeight", value)} />
                <NumberField label="Brightness (nits)" value={form.brightnessNits} onChange={(value) => updateField("brightnessNits", value)} />
                <NumberField label="Estimated plays per day" value={form.estimatedPlaysPerDay} onChange={(value) => updateField("estimatedPlaysPerDay", value)} />
                <TextField label="Operating start" value={form.operatingStartTime ?? ""} onChange={(value) => updateField("operatingStartTime", value || null)} />
                <TextField label="Operating end" value={form.operatingEndTime ?? ""} onChange={(value) => updateField("operatingEndTime", value || null)} />
                <NumberField label="Loop length (sec)" value={form.loopLengthSeconds} onChange={(value) => updateField("loopLengthSeconds", value)} />
                <NumberField label="Spot length (sec)" value={form.spotLengthSeconds} onChange={(value) => updateField("spotLengthSeconds", value)} />
              </div>
            ) : null}
          </FormSection>

          <FormSection title="Brand and campaign">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SelectField
                label="Brand"
                value={form.brandId ?? ""}
                options={[
                  { label: "Create or type manually", value: "" },
                  ...brands.map((brand) => ({ label: brand.name, value: brand.id })),
                ]}
                onChange={(value) => {
                  updateField("brandId", value || null);
                  const selectedBrand = brands.find((brand) => brand.id === value);
                  if (selectedBrand) {
                    updateField("brandName", selectedBrand.name);
                    updateField("brandCategory", selectedBrand.category ?? null);
                    updateField("brandLogoUrl", selectedBrand.logoUrl ?? null);
                  }
                }}
              />
              <TextField label="Brand name" value={form.brandName ?? ""} onChange={(value) => updateField("brandName", value || null)} />
              <TextField label="Brand category" value={form.brandCategory ?? ""} onChange={(value) => updateField("brandCategory", value || null)} />
              <TextField label="Brand logo URL" value={form.brandLogoUrl ?? ""} onChange={(value) => updateField("brandLogoUrl", value || null)} />
              <TextField label="Campaign name" value={form.campaignName ?? ""} onChange={(value) => updateField("campaignName", value || null)} />
              <TextField label="Campaign slogan" value={form.campaignSlogan ?? ""} onChange={(value) => updateField("campaignSlogan", value || null)} className="md:col-span-2" />
            </div>
          </FormSection>

          <FormSection title="Commercial and availability">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <NumberField label="Daily cost" value={form.dailyCost} onChange={(value) => updateField("dailyCost", value)} />
              <NumberField label="Weekly cost" value={form.weeklyCost} onChange={(value) => updateField("weeklyCost", value)} readOnly />
              <NumberField label="Monthly cost" value={form.monthlyCost} onChange={(value) => updateField("monthlyCost", value)} readOnly />
              <TextField label="Currency" value={form.currency ?? ""} onChange={(value) => updateField("currency", value || null)} />
              <SelectField
                label="Placement status"
                value={form.placementStatus}
                options={["CURRENT", "SCHEDULED", "COMPLETED"].map((value) => ({ label: value, value }))}
                onChange={(value) => updateField("placementStatus", value as OohAssetCreateInput["placementStatus"])}
              />
              <TextField label="Start date" value={form.installedAt ?? ""} onChange={(value) => updateField("installedAt", value || null)} placeholder="YYYY-MM-DD" />
              <TextField label="End date" value={form.removedAt ?? ""} onChange={(value) => updateField("removedAt", value || null)} placeholder="YYYY-MM-DD" />
              <SelectField
                label="Availability status"
                value={form.availabilityStatus}
                options={["AVAILABLE", "RESERVED", "BOOKED", "BLOCKED"].map((value) => ({ label: value, value }))}
                onChange={(value) => updateField("availabilityStatus", value as OohAssetCreateInput["availabilityStatus"])}
              />
              <TextField label="Media owner" value={form.mediaOwner ?? ""} onChange={(value) => updateField("mediaOwner", value || null)} />
              <TextField label="Contact name" value={form.contactName ?? ""} onChange={(value) => updateField("contactName", value || null)} />
              <TextField label="Contact phone" value={form.contactPhone ?? ""} onChange={(value) => updateField("contactPhone", value || null)} />
              <TextField label="Availability notes" value={form.availabilityNotes ?? ""} onChange={(value) => updateField("availabilityNotes", value || null)} className="md:col-span-2" />
              <TextField label="Availability start" value={form.availabilityStartDate ?? ""} onChange={(value) => updateField("availabilityStartDate", value || null)} placeholder="YYYY-MM-DD" />
              <TextField label="Availability end" value={form.availabilityEndDate ?? ""} onChange={(value) => updateField("availabilityEndDate", value || null)} placeholder="YYYY-MM-DD" />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <SummaryCard label="7-day commercial value" value={formatMoney(form.weeklyCost, form.currency)} note="Auto-calculated from per-day cost × 7" />
              <SummaryCard label="30-day commercial value" value={formatMoney(form.monthlyCost, form.currency)} note="Auto-calculated from per-day cost × 30" />
              <SummaryCard
                label="Campaign budget"
                value={formatMoney(campaignBudget, form.currency)}
                note={campaignDays === null ? "Add a valid start and end date to calculate total budget." : `${campaignDays} campaign day${campaignDays === 1 ? "" : "s"} × per-day cost`}
              />
            </div>
          </FormSection>

          <FormSection title="Audience metrics">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <NumberField label="Expected daily audience" value={form.expectedDailyAudience} onChange={(value) => updateField("expectedDailyAudience", value)} />
              <NumberField label="Vehicle volume" value={form.dailyVehicleVolume} onChange={(value) => updateField("dailyVehicleVolume", value)} />
              <NumberField label="Pedestrian volume" value={form.dailyPedestrianVolume} onChange={(value) => updateField("dailyPedestrianVolume", value)} />
              <NumberField label="Daily impressions" value={form.estimatedDailyImpressions} onChange={(value) => updateField("estimatedDailyImpressions", value)} />
              <NumberField label="Monthly reach" value={form.estimatedMonthlyReach} onChange={(value) => updateField("estimatedMonthlyReach", value)} />
              <NumberField label="Average frequency" value={form.averageFrequency} onChange={(value) => updateField("averageFrequency", value)} />
              <NumberField label="Dwell time (sec)" value={form.dwellTimeSeconds} onChange={(value) => updateField("dwellTimeSeconds", value)} />
              <NumberField label="Visibility score" value={form.visibilityScore} onChange={(value) => updateField("visibilityScore", value)} />
              <TextField label="Confidence label" value={form.audienceConfidence ?? ""} onChange={(value) => updateField("audienceConfidence", value || null)} />
              <NumberField label="Nearby POI count" value={form.nearbyPoiCount} onChange={(value) => updateField("nearbyPoiCount", value)} />
            </div>
          </FormSection>

          <FormSection title="Image upload">
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <UploadField label="Site photos" onChange={(files) => uploadImages(files, "SITE_PHOTO")} disabled={busy} />
                <UploadField label="Creative images" onChange={(files) => uploadImages(files, "CREATIVE")} disabled={busy} />
                <UploadField label="Proof of play" onChange={(files) => uploadImages(files, "PROOF_OF_PLAY")} disabled={busy} />
                <TextField label="Notes" value={form.notes ?? ""} onChange={(value) => updateField("notes", value || null)} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {form.images.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-border bg-panel-soft px-5 py-10 text-center text-sm text-muted-foreground md:col-span-2">
                    Upload site photos, creative assets, or proof-of-play images to preview them here.
                  </div>
                ) : null}
                {form.images.map((image, index) => (
                  <div key={`${image.imageUrl}-${index}`} className="rounded-[1.4rem] border border-border bg-white p-3">
                    <img src={image.imageUrl} alt={image.altText ?? "OOH image"} className="h-40 w-full rounded-2xl object-cover" />
                    <div className="mt-3 space-y-2">
                      <TextField
                        label="Alt text"
                        value={image.altText ?? ""}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            images: current.images.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, altText: value || null } : item,
                            ),
                          }))
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-border bg-panel-soft px-3 py-2 text-xs"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              images: current.images.map((item, itemIndex) => ({
                                ...item,
                                isPrimary: itemIndex === index,
                              })),
                            }))
                          }
                        >
                          {image.isPrimary ? "Primary image" : "Set primary"}
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-warning/35 bg-warning-soft px-3 py-2 text-xs"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              images: current.images.filter((_, itemIndex) => itemIndex !== index),
                            }))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FormSection>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-full border border-border bg-white px-5 py-3 text-sm font-medium text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="rounded-full bg-brand-red px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {busy ? "Saving..." : mode === "create" ? "Save location" : "Save changes"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.8rem] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  className,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <label className={`grid gap-2 text-sm ${className ?? ""}`}>
      <span className="font-medium text-foreground">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  readOnly = false,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  readOnly?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <input
        type="number"
        value={value ?? ""}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
        className={`rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm ${readOnly ? "cursor-not-allowed opacity-80" : ""}`}
      />
    </label>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[1.3rem] border border-border bg-panel-soft px-4 py-4 shadow-[var(--shadow-soft)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm">
        {options.map((option) => (
          <option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function UploadField({
  label,
  onChange,
  disabled,
}: {
  label: string;
  onChange: (files: FileList | null) => void;
  disabled: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml"
        multiple
        disabled={disabled}
        onChange={(event) => onChange(event.target.files)}
        className="rounded-2xl border border-border bg-panel-soft px-4 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm"
      />
    </label>
  );
}
