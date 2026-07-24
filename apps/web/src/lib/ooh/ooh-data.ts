import { getSupabaseAdminClient, getOptionalSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  OohAssetCreateInput,
  OohAssetImageInput,
  OohAssetListQuery,
  OohBrandCreateInput,
} from "./ooh-schemas";

type GenericRow = Record<string, unknown>;

const OOH_ORG_SLUG = "coca_cola_iraq";
const OOH_ORG_NAME = "Coca-Cola Iraq";
const OOH_ORG_NAME_AR = "كوكاكولا العراق";
const OOH_DEFAULT_COUNTRY = "Iraq";
const OOH_DEFAULT_TIMEZONE = "Asia/Baghdad";
const OOH_AUDIENCE_DATE = "2026-07-20";
let shouldUseFallbackCache: boolean | null = null;
const OOH_REAL_DATA_REQUIRED_MESSAGE =
  "OOH demo and fallback records have been removed. Run the required OOH migrations and use real uploaded inventory data instead.";

function rowString(row: GenericRow, key: string, fallback = "") {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function rowNullableString(row: GenericRow, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function rowNullableNumber(row: GenericRow, key: string) {
  const value = row[key];
  return typeof value === "number" ? value : null;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeNullableText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function toIsoDate(value: string | null | undefined) {
  if (!value) return null;
  return value.slice(0, 10);
}

function hasMetricPayload(input: OohAssetCreateInput) {
  return [
    input.expectedDailyAudience,
    input.dailyVehicleVolume,
    input.dailyPedestrianVolume,
    input.estimatedDailyImpressions,
    input.estimatedMonthlyReach,
    input.averageFrequency,
    input.dwellTimeSeconds,
    input.visibilityScore,
    input.audienceConfidence,
    input.nearbyPoiCount,
  ].some((value) => value !== undefined && value !== null);
}

function hasPlacementPayload(input: OohAssetCreateInput) {
  return [
    input.campaignId,
    input.brandId,
    input.brandName,
    input.campaignName,
    input.installedAt,
    input.removedAt,
    input.dailyCost,
    input.weeklyCost,
    input.monthlyCost,
    input.currency,
    input.creativeImageUrl,
    input.proofOfPlayUrl,
  ].some((value) => value !== undefined && value !== null && value !== "");
}

function buildAudienceConfidenceLabel(score: number | null) {
  if (score === null) return null;
  if (score >= 92) return "Estimated, high confidence";
  if (score >= 80) return "Estimated, medium confidence";
  return "Estimated, directional confidence";
}

function deriveOohRegion(city: string, areaName: string | null) {
  const normalized = `${city} ${areaName ?? ""}`.toLowerCase();
  if (/(erbil|hawler|duhok|sulaymaniyah|sulaimani|halabja|zakho)/i.test(normalized)) {
    return "Kurdish" as const;
  }
  return "Arabic" as const;
}

function deriveOohAssetType(mediaType: string, dimensionUnit: string | null) {
  if (mediaType === "DIGITAL_SCREEN" && dimensionUnit === "THREE_D") {
    return "3D Digital";
  }
  if (mediaType === "DIGITAL_SCREEN") {
    return "Digital";
  }
  return "Billboard";
}

function matchesOohAssetTypeFilter(item: OohAssetListItem, assetType: OohAssetListQuery["assetType"]) {
  if (!assetType) {
    return true;
  }

  switch (assetType) {
    case "BILLBOARD":
      return item.mediaType === "BILLBOARD";
    case "DIGITAL":
      return item.mediaType === "DIGITAL_SCREEN" && item.dimensionUnit !== "THREE_D";
    case "THREE_D":
      return item.mediaType === "DIGITAL_SCREEN" && item.dimensionUnit === "THREE_D";
    case "POLL":
      return /\bpoll\b/i.test(item.locationName) || /\bpoll\b/i.test(item.assetCode);
    case "WALL":
      return /\bwall\b/i.test(item.locationName) || /\bwall\b/i.test(item.assetCode);
    default:
      return true;
  }
}

function isWithinInstalledDateRange(
  item: OohAssetListItem,
  availableFrom: string | undefined,
  availableTo: string | undefined,
) {
  if (!availableFrom && !availableTo) {
    return true;
  }

  if (!item.installedAt) {
    return false;
  }

  const installedDate = item.installedAt.slice(0, 10);
  if (availableFrom && installedDate < availableFrom) {
    return false;
  }
  if (availableTo && installedDate > availableTo) {
    return false;
  }
  return true;
}

async function shouldUseOohFallback() {
  if (shouldUseFallbackCache !== null) {
    return shouldUseFallbackCache;
  }

  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    shouldUseFallbackCache = true;
    return true;
  }

  const probe = await supabase.from("ooh_areas").select("id", { count: "exact", head: true });
  if (probe.error && /could not find the table|relation .* does not exist/i.test(probe.error.message)) {
    shouldUseFallbackCache = true;
    return true;
  }

  shouldUseFallbackCache = false;
  return false;
}

function isMissingOohTableError(error: unknown) {
  return error instanceof Error && /could not find the table|relation .* does not exist/i.test(error.message);
}

export type OohAreaItem = {
  id: string;
  city: string;
  country: string;
  name: string;
  slug: string;
  centerLatitude: number | null;
  centerLongitude: number | null;
};

export type OohBrandItem = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  logoUrl: string | null;
  isDummyBrand: boolean;
};

export type OohShareOfVoiceDatum = {
  label: string;
  share: number;
  note?: string;
  valueLabel?: string;
  color?: string;
};

export type OohAssetListItem = {
  id: string;
  assetCode: string;
  mediaType: string;
  dimensionUnit: string | null;
  region: "Arabic" | "Kurdish" | null;
  assetTypeLabel: string;
  status: string;
  city: string;
  country: string;
  areaId: string | null;
  areaName: string | null;
  locationName: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  brandId: string | null;
  brandName: string | null;
  campaignId: string | null;
  campaignName: string | null;
  dailyCost: number | null;
  currency: string | null;
  expectedDailyAudience: number | null;
  estimatedDailyImpressions: number | null;
  visibilityScore: number | null;
  primaryImageUrl: string | null;
  placementStatus: string | null;
  installedAt: string | null;
  numberOfFaces: number | null;
};

export type OohAssetDetail = OohAssetListItem & {
  landmark: string | null;
  width: number | null;
  height: number | null;
  totalSqm: number | null;
  dimensionUnit: string;
  facingDirection: string | null;
  roadType: string | null;
  illumination: string | null;
  mediaOwner: string | null;
  contactName: string | null;
  contactPhone: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  campaignSlogan: string | null;
  campaignStartDate: string | null;
  campaignEndDate: string | null;
  brandLogoUrl: string | null;
  brandCategory: string | null;
  audience: {
    measurementDate: string | null;
    expectedDailyAudience: number | null;
    dailyVehicleVolume: number | null;
    dailyPedestrianVolume: number | null;
    estimatedDailyImpressions: number | null;
    estimatedMonthlyReach: number | null;
    averageFrequency: number | null;
    dwellTimeSeconds: number | null;
    visibilityScore: number | null;
    audienceConfidence: string | null;
    nearbyPoiCount: number | null;
  } | null;
  digitalSpecification: {
    resolutionWidth: number | null;
    resolutionHeight: number | null;
    brightnessNits: number | null;
    operatingStartTime: string | null;
    operatingEndTime: string | null;
    loopLengthSeconds: number | null;
    spotLengthSeconds: number | null;
    estimatedPlaysPerDay: number | null;
  } | null;
  images: Array<{
    id: string;
    imageUrl: string;
    imageType: string;
    altText: string | null;
    sortOrder: number;
    isPrimary: boolean;
  }>;
  placements: Array<{
    id: string;
    campaignId: string | null;
    campaignName: string | null;
    brandName: string | null;
    brandLogoUrl: string | null;
    status: string;
    installedAt: string | null;
    removedAt: string | null;
    dailyCost: number | null;
    weeklyCost: number | null;
    monthlyCost: number | null;
    currency: string | null;
    creativeImageUrl: string | null;
    proofOfPlayUrl: string | null;
  }>;
  availability: Array<{
    id: string;
    startDate: string;
    endDate: string;
    status: string;
    notes: string | null;
    campaignId: string | null;
  }>;
};

export type OohAnalyticsSummary = {
  activeBrands: number;
  totalAssets: number;
  totalSpend: number | null;
  spendCurrency: string | null;
  totalBillboards: number;
  totalDigitalScreens: number;
  activeCampaigns: number;
  availableInventory: number;
  estimatedDailyAudience: number;
  estimatedDailyImpressions: number;
  averageDailyRate: number | null;
  inventoryUtilizationPercentage: number | null;
  assetsByCity: Record<string, number>;
  assetsByArea: Record<string, number>;
  assetsByType: Record<string, number>;
  assetsByRegion: Record<string, number>;
  spendByCity: Record<string, number>;
  spendByBrand: Record<string, number>;
  brandShare: OohShareOfVoiceDatum[];
  brandSpendShare: OohShareOfVoiceDatum[];
};

async function ensureOrganizationId() {
  const supabase = getSupabaseAdminClient();
  const existing = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", OOH_ORG_SLUG)
    .limit(1)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await supabase
    .from("organizations")
    .insert({
      slug: OOH_ORG_SLUG,
      name: OOH_ORG_NAME,
      name_ar: OOH_ORG_NAME_AR,
      market: OOH_DEFAULT_COUNTRY,
      timezone: OOH_DEFAULT_TIMEZONE,
      is_active: true,
    })
    .select("id")
    .single();

  if (inserted.error || !inserted.data?.id) {
    throw new Error(inserted.error?.message ?? "Failed to bootstrap the OOH organization.");
  }

  return inserted.data.id;
}

export async function getOohOrganizationId() {
  return ensureOrganizationId();
}

async function ensureAreaRecord(orgId: string, area: OohAreaItem) {
  const supabase = getSupabaseAdminClient();
  const existing = await supabase
    .from("ooh_areas")
    .select("id")
    .eq("organization_id", orgId)
    .eq("slug", area.slug)
    .limit(1)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await supabase
    .from("ooh_areas")
    .insert({
      organization_id: orgId,
      country: area.country,
      city: area.city,
      name: area.name,
      slug: area.slug,
      center_latitude: area.centerLatitude,
      center_longitude: area.centerLongitude,
    })
    .select("id")
    .single();

  if (inserted.error || !inserted.data?.id) {
    throw new Error(inserted.error?.message ?? `Failed to insert area ${area.name}.`);
  }

  return inserted.data.id;
}

async function ensureBrandRecord(
  orgId: string,
  input: {
    name: string;
    category?: string | null;
    logoUrl?: string | null;
    isDummyBrand?: boolean;
  },
) {
  const supabase = getSupabaseAdminClient();
  const existing = await supabase
    .from("brands")
    .select("id")
    .eq("organization_id", orgId)
    .eq("name", input.name)
    .limit(1)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await supabase
    .from("brands")
    .insert({
      organization_id: orgId,
      name: input.name,
      category: normalizeNullableText(input.category),
      logo_url: normalizeNullableText(input.logoUrl),
      slug: slugify(input.name),
      is_dummy_brand: input.isDummyBrand ?? false,
      is_active: true,
      competitor_group: input.isDummyBrand ? "demo" : "owned",
    })
    .select("id")
    .single();

  if (inserted.error || !inserted.data?.id) {
    throw new Error(inserted.error?.message ?? `Failed to create brand ${input.name}.`);
  }

  return inserted.data.id;
}

async function ensureCampaignRecord(
  orgId: string,
  input: {
    brandId: string;
    name: string;
    slogan?: string | null;
    market: string;
    startDate?: string | null;
    endDate?: string | null;
  },
) {
  const supabase = getSupabaseAdminClient();
  const existing = await supabase
    .from("campaigns")
    .select("id")
    .eq("organization_id", orgId)
    .eq("name", input.name)
    .limit(1)
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await supabase
    .from("campaigns")
    .insert({
      organization_id: orgId,
      brand_id: input.brandId,
      name: input.name,
      market: input.market,
      start_date: toIsoDate(input.startDate),
      end_date: toIsoDate(input.endDate),
      objective: normalizeNullableText(input.slogan),
      media_types: ["ooh"],
      status: "active",
    })
    .select("id")
    .single();

  if (inserted.error || !inserted.data?.id) {
    throw new Error(inserted.error?.message ?? `Failed to create campaign ${input.name}.`);
  }

  return inserted.data.id;
}

function buildImageRows(orgId: string, assetId: string, images: OohAssetImageInput[]) {
  const preferred = images.find((image) => image.isPrimary) ?? images[0] ?? null;
  return images.map((image, index) => ({
    organization_id: orgId,
    asset_id: assetId,
    image_url: image.imageUrl,
    image_type: image.imageType,
    alt_text: normalizeNullableText(image.altText),
    sort_order: image.sortOrder ?? index,
    is_primary: preferred ? preferred.imageUrl === image.imageUrl : index === 0,
  }));
}

async function refreshAssetImages(orgId: string, assetId: string, images: OohAssetImageInput[]) {
  const supabase = getSupabaseAdminClient();
  await supabase.from("ooh_asset_images").delete().eq("asset_id", assetId);
  if (images.length === 0) {
    return;
  }

  const imageRows = buildImageRows(orgId, assetId, images);
  const insertResult = await supabase.from("ooh_asset_images").insert(imageRows);
  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }
}

async function refreshAssetPlacement(
  orgId: string,
  assetId: string,
  input: OohAssetCreateInput,
  campaignId: string | null,
) {
  const supabase = getSupabaseAdminClient();
  await supabase.from("ooh_placements").delete().eq("asset_id", assetId);

  if (!hasPlacementPayload(input) && !campaignId) {
    return;
  }

  const placementResult = await supabase.from("ooh_placements").insert({
    organization_id: orgId,
    asset_id: assetId,
    campaign_id: campaignId,
    installed_at: toIsoDate(input.installedAt),
    removed_at: toIsoDate(input.removedAt),
    daily_cost: input.dailyCost ?? null,
    weekly_cost: input.weeklyCost ?? null,
    monthly_cost: input.monthlyCost ?? null,
    currency: normalizeNullableText(input.currency),
    creative_image_url: normalizeNullableText(input.creativeImageUrl),
    proof_of_play_url: normalizeNullableText(input.proofOfPlayUrl),
    status: input.placementStatus,
  });

  if (placementResult.error) {
    throw new Error(placementResult.error.message);
  }
}

async function refreshAudienceMetric(orgId: string, assetId: string, input: OohAssetCreateInput) {
  const supabase = getSupabaseAdminClient();
  await supabase.from("ooh_audience_metrics").delete().eq("asset_id", assetId);

  if (!hasMetricPayload(input)) {
    return;
  }

  const metricResult = await supabase.from("ooh_audience_metrics").insert({
    organization_id: orgId,
    asset_id: assetId,
    measurement_date: OOH_AUDIENCE_DATE,
    expected_daily_audience: input.expectedDailyAudience ?? null,
    daily_vehicle_volume: input.dailyVehicleVolume ?? null,
    daily_pedestrian_volume: input.dailyPedestrianVolume ?? null,
    estimated_daily_impressions: input.estimatedDailyImpressions ?? null,
    estimated_monthly_reach: input.estimatedMonthlyReach ?? null,
    average_frequency: input.averageFrequency ?? null,
    dwell_time_seconds: input.dwellTimeSeconds ?? null,
    visibility_score: input.visibilityScore ?? null,
    audience_confidence: normalizeNullableText(input.audienceConfidence),
    nearby_poi_count: input.nearbyPoiCount ?? null,
  });

  if (metricResult.error) {
    throw new Error(metricResult.error.message);
  }
}

async function refreshAvailability(orgId: string, assetId: string, input: OohAssetCreateInput, campaignId: string | null) {
  const supabase = getSupabaseAdminClient();
  await supabase.from("ooh_availability_periods").delete().eq("asset_id", assetId);

  if (!input.availabilityStartDate || !input.availabilityEndDate) {
    return;
  }

  const availabilityResult = await supabase.from("ooh_availability_periods").insert({
    organization_id: orgId,
    asset_id: assetId,
    start_date: toIsoDate(input.availabilityStartDate),
    end_date: toIsoDate(input.availabilityEndDate),
    status: input.availabilityStatus,
    campaign_id: campaignId,
    notes: normalizeNullableText(input.availabilityNotes),
  });

  if (availabilityResult.error) {
    throw new Error(availabilityResult.error.message);
  }
}

async function refreshDigitalSpecification(assetId: string, input: OohAssetCreateInput) {
  const supabase = getSupabaseAdminClient();
  await supabase.from("ooh_digital_screen_specifications").delete().eq("asset_id", assetId);

  if (input.mediaType !== "DIGITAL_SCREEN") {
    return;
  }

  const specResult = await supabase.from("ooh_digital_screen_specifications").insert({
    asset_id: assetId,
    resolution_width: input.resolutionWidth ?? null,
    resolution_height: input.resolutionHeight ?? null,
    brightness_nits: input.brightnessNits ?? null,
    operating_start_time: normalizeNullableText(input.operatingStartTime),
    operating_end_time: normalizeNullableText(input.operatingEndTime),
    loop_length_seconds: input.loopLengthSeconds ?? null,
    spot_length_seconds: input.spotLengthSeconds ?? null,
    estimated_plays_per_day: input.estimatedPlaysPerDay ?? null,
  });

  if (specResult.error) {
    throw new Error(specResult.error.message);
  }
}

async function resolveBrandAndCampaignIds(orgId: string, input: OohAssetCreateInput) {
  let brandId = input.brandId ?? null;
  if (!brandId && input.brandName) {
    brandId = await ensureBrandRecord(orgId, {
      name: input.brandName,
      category: input.brandCategory,
      logoUrl: input.brandLogoUrl,
      isDummyBrand: false,
    });
  }

  let campaignId = input.campaignId ?? null;
  if (!campaignId && brandId && input.campaignName) {
    campaignId = await ensureCampaignRecord(orgId, {
      brandId,
      name: input.campaignName,
      slogan: input.campaignSlogan,
      market: input.city,
      startDate: input.installedAt,
      endDate: input.removedAt,
    });
  }

  return { brandId, campaignId };
}

async function mapAreasById(areaIds: string[]) {
  const supabase = getSupabaseAdminClient();
  if (areaIds.length === 0) {
    return new Map<string, OohAreaItem>();
  }

  const { data } = await supabase.from("ooh_areas").select("*").in("id", areaIds);
  return new Map(
    ((data ?? []) as GenericRow[]).map((row) => [
      rowString(row, "id"),
      {
        id: rowString(row, "id"),
        city: rowString(row, "city"),
        country: rowString(row, "country"),
        name: rowString(row, "name"),
        slug: rowString(row, "slug"),
        centerLatitude: rowNullableNumber(row, "center_latitude"),
        centerLongitude: rowNullableNumber(row, "center_longitude"),
      } satisfies OohAreaItem,
    ]),
  );
}

function mapPrimaryPlacement(
  assetId: string,
  placementLookup: Map<string, GenericRow[]>,
  campaignLookup: Map<string, GenericRow>,
  brandLookup: Map<string, GenericRow>,
) {
  const placements = placementLookup.get(assetId) ?? [];
  const ordered = placements.sort((left, right) => {
    const leftStatus = rowString(left, "status");
    const rightStatus = rowString(right, "status");
    const leftWeight = leftStatus === "CURRENT" ? 0 : leftStatus === "SCHEDULED" ? 1 : 2;
    const rightWeight = rightStatus === "CURRENT" ? 0 : rightStatus === "SCHEDULED" ? 1 : 2;
    return leftWeight - rightWeight;
  });
  const placement = ordered[0] ?? null;
  if (!placement) {
    return {
      placement: null,
      campaign: null,
      brand: null,
    };
  }
  const campaignId = rowNullableString(placement, "campaign_id");
  const campaign = campaignId ? campaignLookup.get(campaignId) ?? null : null;
  const brandId = campaign ? rowNullableString(campaign, "brand_id") : null;
  const brand = brandId ? brandLookup.get(brandId) ?? null : null;

  return { placement, campaign, brand };
}

async function collectAssetLookups(assetIds: string[], areaIds: string[]) {
  const supabase = getSupabaseAdminClient();

  const [areas, placements, metrics, images] = await Promise.all([
    mapAreasById(areaIds),
    assetIds.length > 0 ? supabase.from("ooh_placements").select("*").in("asset_id", assetIds) : Promise.resolve({ data: [] }),
    assetIds.length > 0
      ? supabase.from("ooh_audience_metrics").select("*").in("asset_id", assetIds).eq("measurement_date", OOH_AUDIENCE_DATE)
      : Promise.resolve({ data: [] }),
    assetIds.length > 0
      ? supabase
          .from("ooh_asset_images")
          .select("*")
          .in("asset_id", assetIds)
          .order("is_primary", { ascending: false })
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const placementRows = (placements.data ?? []) as GenericRow[];
  const campaignIds = [...new Set(placementRows.map((row) => rowNullableString(row, "campaign_id")).filter(Boolean))] as string[];
  const campaignRows = campaignIds.length > 0
    ? (((await supabase.from("campaigns").select("*").in("id", campaignIds)).data ?? []) as GenericRow[])
    : [];
  const brandIds = [...new Set(campaignRows.map((row) => rowNullableString(row, "brand_id")).filter(Boolean))] as string[];
  const brandRows = brandIds.length > 0
    ? (((await supabase.from("brands").select("*").in("id", brandIds)).data ?? []) as GenericRow[])
    : [];

  const placementLookup = new Map<string, GenericRow[]>();
  for (const row of placementRows) {
    const key = rowString(row, "asset_id");
    placementLookup.set(key, [...(placementLookup.get(key) ?? []), row]);
  }

  const metricLookup = new Map(
    ((metrics.data ?? []) as GenericRow[]).map((row) => [rowString(row, "asset_id"), row]),
  );
  const imageLookup = new Map<string, GenericRow[]>();
  for (const row of (images.data ?? []) as GenericRow[]) {
    const key = rowString(row, "asset_id");
    imageLookup.set(key, [...(imageLookup.get(key) ?? []), row]);
  }

  const campaignLookup = new Map(campaignRows.map((row) => [rowString(row, "id"), row]));
  const brandLookup = new Map(brandRows.map((row) => [rowString(row, "id"), row]));

  return {
    areas,
    placementLookup,
    metricLookup,
    imageLookup,
    campaignLookup,
    brandLookup,
  };
}

function mapAssetListItem(
  row: GenericRow,
  lookups: Awaited<ReturnType<typeof collectAssetLookups>>,
) {
  const assetId = rowString(row, "id");
  const areaId = rowNullableString(row, "area_id");
  const area = areaId ? lookups.areas.get(areaId) ?? null : null;
  const dimensionUnit = rowNullableString(row, "dimension_unit");
  const metric = lookups.metricLookup.get(assetId) ?? {};
  const images = lookups.imageLookup.get(assetId) ?? [];
  const { placement, campaign, brand } = mapPrimaryPlacement(
    assetId,
    lookups.placementLookup,
    lookups.campaignLookup,
    lookups.brandLookup,
  );
  const primaryImage =
    images.find((image) => Boolean(image["is_primary"]) && rowNullableString(image, "image_url")) ??
    images.find((image) => rowString(image, "image_type") === "SITE_PHOTO" && rowNullableString(image, "image_url")) ??
    images.find((image) => rowNullableString(image, "image_url")) ??
    null;
  const placementCreativeImageUrl = placement ? rowNullableString(placement, "creative_image_url") : null;
  const placementProofImageUrl = placement ? rowNullableString(placement, "proof_of_play_url") : null;
  const city = rowString(row, "city");
  const region = deriveOohRegion(city, area?.name ?? null);
  const assetTypeLabel = deriveOohAssetType(rowString(row, "media_type"), dimensionUnit);

  return {
    id: assetId,
    assetCode: rowString(row, "asset_code"),
    mediaType: rowString(row, "media_type"),
    dimensionUnit,
    region,
    assetTypeLabel,
    status: rowString(row, "status"),
    city,
    country: rowString(row, "country"),
    areaId,
    areaName: area?.name ?? null,
    locationName: rowString(row, "location_name"),
    address: rowNullableString(row, "address"),
    latitude: rowNullableNumber(row, "latitude"),
    longitude: rowNullableNumber(row, "longitude"),
    brandId: brand ? rowString(brand, "id") : null,
    brandName: brand ? rowString(brand, "name") : null,
    campaignId: campaign ? rowString(campaign, "id") : null,
    campaignName: campaign ? rowString(campaign, "name") : null,
    dailyCost: placement ? rowNullableNumber(placement, "daily_cost") : null,
    currency: placement ? rowNullableString(placement, "currency") : null,
    expectedDailyAudience: rowNullableNumber(metric, "expected_daily_audience"),
    estimatedDailyImpressions: rowNullableNumber(metric, "estimated_daily_impressions"),
    visibilityScore: rowNullableNumber(metric, "visibility_score"),
    primaryImageUrl:
      (primaryImage ? rowNullableString(primaryImage, "image_url") : null) ??
      placementCreativeImageUrl ??
      placementProofImageUrl,
    placementStatus: placement ? rowNullableString(placement, "status") : null,
    installedAt: placement ? rowNullableString(placement, "installed_at") : null,
    numberOfFaces: rowNullableNumber(row, "number_of_faces"),
  } satisfies OohAssetListItem;
}

function withinBounds(item: OohAssetListItem, bbox: string | undefined) {
  if (!bbox || item.latitude === null || item.longitude === null) {
    return true;
  }

  const parts = bbox.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }

  const [west, south, east, north] = parts;
  return item.longitude >= west && item.longitude <= east && item.latitude >= south && item.latitude <= north;
}

function compareAssets(
  left: OohAssetListItem,
  right: OohAssetListItem,
  sort: OohAssetListQuery["sort"],
) {
  switch (sort) {
    case "highest_audience":
      return (right.expectedDailyAudience ?? -1) - (left.expectedDailyAudience ?? -1);
    case "lowest_cost":
      return (left.dailyCost ?? Number.MAX_SAFE_INTEGER) - (right.dailyCost ?? Number.MAX_SAFE_INTEGER);
    case "highest_cost":
      return (right.dailyCost ?? -1) - (left.dailyCost ?? -1);
    case "highest_visibility":
      return (right.visibilityScore ?? -1) - (left.visibilityScore ?? -1);
    case "recently_installed":
      return String(right.installedAt ?? "").localeCompare(String(left.installedAt ?? ""));
    default:
      return left.assetCode.localeCompare(right.assetCode);
  }
}

export async function listOohAreas() {
  try {
    if (await shouldUseOohFallback()) {
      return [] as OohAreaItem[];
    }
    const supabase = getOptionalSupabaseAdminClient();
    if (!supabase) {
      return [] as OohAreaItem[];
    }

    const { data } = await supabase.from("ooh_areas").select("*").order("city").order("name");
    return ((data ?? []) as GenericRow[]).map((row) => ({
      id: rowString(row, "id"),
      city: rowString(row, "city"),
      country: rowString(row, "country"),
      name: rowString(row, "name"),
      slug: rowString(row, "slug"),
      centerLatitude: rowNullableNumber(row, "center_latitude"),
      centerLongitude: rowNullableNumber(row, "center_longitude"),
    }));
  } catch (error) {
    if (isMissingOohTableError(error)) {
      shouldUseFallbackCache = true;
      return [] as OohAreaItem[];
    }
    throw error;
  }
}

export async function listOohBrands() {
  try {
    if (await shouldUseOohFallback()) {
      return [] as OohBrandItem[];
    }
    const supabase = getOptionalSupabaseAdminClient();
    if (!supabase) {
      return [] as OohBrandItem[];
    }

    const { data } = await supabase
      .from("brands")
      .select("id, name, slug, category, logo_url, is_dummy_brand")
      .order("name");

    return ((data ?? []) as GenericRow[])
      .filter((row) => !Boolean(row["is_dummy_brand"]))
      .map((row) => ({
      id: rowString(row, "id"),
      name: rowString(row, "name"),
      slug: rowString(row, "slug"),
      category: rowNullableString(row, "category"),
      logoUrl: rowNullableString(row, "logo_url"),
      isDummyBrand: Boolean(row["is_dummy_brand"]),
    }));
  } catch (error) {
    if (isMissingOohTableError(error)) {
      shouldUseFallbackCache = true;
      return [] as OohBrandItem[];
    }
    throw error;
  }
}

export async function createOohBrand(input: OohBrandCreateInput) {
  if (await shouldUseOohFallback()) {
    throw new Error(OOH_REAL_DATA_REQUIRED_MESSAGE);
  }
  const orgId = await ensureOrganizationId();
  const brandId = await ensureBrandRecord(orgId, {
    name: input.name,
    category: input.category,
    logoUrl: input.logoUrl,
    isDummyBrand: input.isDummyBrand,
  });
  const brands = await listOohBrands();
  return brands.find((brand) => brand.id === brandId) ?? null;
}

export async function listOohAssets(query: OohAssetListQuery) {
  try {
    if (await shouldUseOohFallback()) {
      return { items: [] as OohAssetListItem[], total: 0, page: query.page, limit: query.limit };
    }
    const supabase = getOptionalSupabaseAdminClient();
    if (!supabase) {
      return { items: [] as OohAssetListItem[], total: 0, page: query.page, limit: query.limit };
    }

    let assetsQuery = supabase.from("ooh_assets").select("*");
    if (!query.includeInactive) {
      assetsQuery = assetsQuery.neq("status", "INACTIVE");
    }
    if (query.city && query.city !== "All") assetsQuery = assetsQuery.eq("city", query.city);
    if (query.area) assetsQuery = assetsQuery.eq("area_id", query.area);
    if (query.mediaType) assetsQuery = assetsQuery.eq("media_type", query.mediaType);
    if (query.status) assetsQuery = assetsQuery.eq("status", query.status);
    if (query.faces) assetsQuery = assetsQuery.eq("number_of_faces", query.faces);
    if (query.search) {
      assetsQuery = assetsQuery.or(
        `asset_code.ilike.%${query.search}%,location_name.ilike.%${query.search}%,address.ilike.%${query.search}%`,
      );
    }

    const { data } = await assetsQuery;
    const assetRows = (data ?? []) as GenericRow[];
    const assetIds = assetRows.map((row) => rowString(row, "id"));
    const areaIds = [...new Set(assetRows.map((row) => rowNullableString(row, "area_id")).filter(Boolean))] as string[];
    const lookups = await collectAssetLookups(assetIds, areaIds);

    const filteredItems = assetRows
      .map((row) => mapAssetListItem(row, lookups))
      .filter((item) => {
        if (!item.brandId) return true;
        const brandRow = lookups.brandLookup.get(item.brandId);
        return !Boolean(brandRow?.["is_dummy_brand"]);
      })
      .filter((item) => (query.region ? item.region === query.region : true))
      .filter((item) => matchesOohAssetTypeFilter(item, query.assetType))
      .filter((item) => (query.brandId ? item.brandId === query.brandId : true))
      .filter((item) => (query.minCost !== undefined ? (item.dailyCost ?? Number.NEGATIVE_INFINITY) >= query.minCost : true))
      .filter((item) => (query.maxCost !== undefined ? (item.dailyCost ?? Number.POSITIVE_INFINITY) <= query.maxCost : true))
      .filter((item) =>
        query.minAudience !== undefined
          ? (item.expectedDailyAudience ?? Number.NEGATIVE_INFINITY) >= query.minAudience
          : true,
      )
      .filter((item) =>
        query.maxAudience !== undefined
          ? (item.expectedDailyAudience ?? Number.POSITIVE_INFINITY) <= query.maxAudience
          : true,
      )
      .filter((item) => isWithinInstalledDateRange(item, query.availableFrom, query.availableTo))
      .filter((item) => withinBounds(item, query.bbox))
      .sort((left, right) => compareAssets(left, right, query.sort));

    const offset = (query.page - 1) * query.limit;
    return {
      items: filteredItems.slice(offset, offset + query.limit),
      total: filteredItems.length,
      page: query.page,
      limit: query.limit,
    };
  } catch (error) {
    if (isMissingOohTableError(error)) {
      shouldUseFallbackCache = true;
      return { items: [] as OohAssetListItem[], total: 0, page: query.page, limit: query.limit };
    }
    throw error;
  }
}

export async function getOohAssetDetail(assetId: string) {
  try {
    if (await shouldUseOohFallback()) {
      return null;
    }
    const supabase = getOptionalSupabaseAdminClient();
    if (!supabase) {
      return null;
    }

    const assetResult = await supabase.from("ooh_assets").select("*").eq("id", assetId).maybeSingle();
    const assetRow = assetResult.data as GenericRow | null;
    if (!assetRow) {
      return null;
    }

    const areaId = rowNullableString(assetRow, "area_id");
    const [lookups, digitalSpecResult, availabilityResult] = await Promise.all([
      collectAssetLookups([assetId], areaId ? [areaId] : []),
      supabase.from("ooh_digital_screen_specifications").select("*").eq("asset_id", assetId).maybeSingle(),
      supabase
        .from("ooh_availability_periods")
        .select("*")
        .eq("asset_id", assetId)
        .order("start_date", { ascending: true }),
    ]);

    const baseItem = mapAssetListItem(assetRow, lookups);
  const metric = lookups.metricLookup.get(assetId) ?? null;
  const imageRows = (lookups.imageLookup.get(assetId) ?? []) as GenericRow[];
  const images = imageRows.map((row) => ({
    id: rowString(row, "id"),
    imageUrl: rowString(row, "image_url"),
    imageType: rowString(row, "image_type"),
    altText: rowNullableString(row, "alt_text"),
    sortOrder: rowNullableNumber(row, "sort_order") ?? 0,
    isPrimary: Boolean(row["is_primary"]),
  }));

  const placements = (lookups.placementLookup.get(assetId) ?? []).map((placementRow) => {
    const campaignId = rowNullableString(placementRow, "campaign_id");
    const campaign = campaignId ? lookups.campaignLookup.get(campaignId) ?? null : null;
    const brandId = campaign ? rowNullableString(campaign, "brand_id") : null;
    const brand = brandId ? lookups.brandLookup.get(brandId) ?? null : null;
    return {
      id: rowString(placementRow, "id"),
      campaignId,
      campaignName: campaign ? rowNullableString(campaign, "name") : null,
      brandName: brand ? rowNullableString(brand, "name") : null,
      brandLogoUrl: brand ? rowNullableString(brand, "logo_url") : null,
      status: rowString(placementRow, "status"),
      installedAt: rowNullableString(placementRow, "installed_at"),
      removedAt: rowNullableString(placementRow, "removed_at"),
      dailyCost: rowNullableNumber(placementRow, "daily_cost"),
      weeklyCost: rowNullableNumber(placementRow, "weekly_cost"),
      monthlyCost: rowNullableNumber(placementRow, "monthly_cost"),
      currency: rowNullableString(placementRow, "currency"),
      creativeImageUrl: rowNullableString(placementRow, "creative_image_url"),
      proofOfPlayUrl: rowNullableString(placementRow, "proof_of_play_url"),
    };
  });

  const currentPlacement = placements.find((placement) => placement.status === "CURRENT") ?? placements[0] ?? null;
  const currentCampaign = currentPlacement?.campaignId ? lookups.campaignLookup.get(currentPlacement.campaignId) ?? null : null;
  const currentBrand =
    currentCampaign && rowNullableString(currentCampaign, "brand_id")
      ? lookups.brandLookup.get(String(currentCampaign.brand_id)) ?? null
      : null;

    return {
    ...baseItem,
    landmark: rowNullableString(assetRow, "landmark"),
    width: rowNullableNumber(assetRow, "width"),
    height: rowNullableNumber(assetRow, "height"),
    totalSqm: rowNullableNumber(assetRow, "total_sqm"),
    dimensionUnit: rowString(assetRow, "dimension_unit"),
    facingDirection: rowNullableString(assetRow, "facing_direction"),
    roadType: rowNullableString(assetRow, "road_type"),
    illumination: rowNullableString(assetRow, "illumination"),
    mediaOwner: rowNullableString(assetRow, "media_owner"),
    contactName: rowNullableString(assetRow, "contact_name"),
    contactPhone: rowNullableString(assetRow, "contact_phone"),
    notes: rowNullableString(assetRow, "notes"),
    createdAt: rowNullableString(assetRow, "created_at"),
    updatedAt: rowNullableString(assetRow, "updated_at"),
    campaignSlogan: currentCampaign ? rowNullableString(currentCampaign, "objective") : null,
    campaignStartDate: currentCampaign ? rowNullableString(currentCampaign, "start_date") : null,
    campaignEndDate: currentCampaign ? rowNullableString(currentCampaign, "end_date") : null,
    brandLogoUrl: currentBrand ? rowNullableString(currentBrand, "logo_url") : null,
    brandCategory: currentBrand ? rowNullableString(currentBrand, "category") : null,
    audience: metric
      ? {
          measurementDate: rowNullableString(metric, "measurement_date"),
          expectedDailyAudience: rowNullableNumber(metric, "expected_daily_audience"),
          dailyVehicleVolume: rowNullableNumber(metric, "daily_vehicle_volume"),
          dailyPedestrianVolume: rowNullableNumber(metric, "daily_pedestrian_volume"),
          estimatedDailyImpressions: rowNullableNumber(metric, "estimated_daily_impressions"),
          estimatedMonthlyReach: rowNullableNumber(metric, "estimated_monthly_reach"),
          averageFrequency: rowNullableNumber(metric, "average_frequency"),
          dwellTimeSeconds: rowNullableNumber(metric, "dwell_time_seconds"),
          visibilityScore: rowNullableNumber(metric, "visibility_score"),
          audienceConfidence: rowNullableString(metric, "audience_confidence"),
          nearbyPoiCount: rowNullableNumber(metric, "nearby_poi_count"),
        }
      : null,
    digitalSpecification: digitalSpecResult.data
      ? {
          resolutionWidth: rowNullableNumber(digitalSpecResult.data as GenericRow, "resolution_width"),
          resolutionHeight: rowNullableNumber(digitalSpecResult.data as GenericRow, "resolution_height"),
          brightnessNits: rowNullableNumber(digitalSpecResult.data as GenericRow, "brightness_nits"),
          operatingStartTime: rowNullableString(digitalSpecResult.data as GenericRow, "operating_start_time"),
          operatingEndTime: rowNullableString(digitalSpecResult.data as GenericRow, "operating_end_time"),
          loopLengthSeconds: rowNullableNumber(digitalSpecResult.data as GenericRow, "loop_length_seconds"),
          spotLengthSeconds: rowNullableNumber(digitalSpecResult.data as GenericRow, "spot_length_seconds"),
          estimatedPlaysPerDay: rowNullableNumber(digitalSpecResult.data as GenericRow, "estimated_plays_per_day"),
        }
      : null,
    images,
    placements,
    availability: ((availabilityResult.data ?? []) as GenericRow[]).map((row) => ({
      id: rowString(row, "id"),
      startDate: rowString(row, "start_date"),
      endDate: rowString(row, "end_date"),
      status: rowString(row, "status"),
      notes: rowNullableString(row, "notes"),
      campaignId: rowNullableString(row, "campaign_id"),
    })),
    } satisfies OohAssetDetail;
  } catch (error) {
    if (isMissingOohTableError(error)) {
      shouldUseFallbackCache = true;
      return null;
    }
    throw error;
  }
}

export async function createOohAsset(input: OohAssetCreateInput) {
  try {
    if (await shouldUseOohFallback()) {
      throw new Error(OOH_REAL_DATA_REQUIRED_MESSAGE);
    }
    const supabase = getSupabaseAdminClient();
    const orgId = await ensureOrganizationId();
    const { campaignId } = await resolveBrandAndCampaignIds(orgId, input);
    const assetInsert = await supabase
      .from("ooh_assets")
      .insert({
      organization_id: orgId,
      asset_code: input.assetCode,
      media_type: input.mediaType,
      status: input.status,
      country: input.country,
      city: input.city,
      area_id: input.areaId ?? null,
      location_name: input.locationName,
      address: normalizeNullableText(input.address),
      landmark: normalizeNullableText(input.landmark),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      dimension_unit: input.dimensionUnit,
      number_of_faces: input.numberOfFaces,
      total_sqm: input.totalSqm ?? null,
      facing_direction: normalizeNullableText(input.facingDirection),
      road_type: normalizeNullableText(input.roadType),
      illumination: normalizeNullableText(input.illumination),
      media_owner: normalizeNullableText(input.mediaOwner),
      contact_name: normalizeNullableText(input.contactName),
      contact_phone: normalizeNullableText(input.contactPhone),
      notes: normalizeNullableText(input.notes),
    })
    .select("id")
      .single();

    const assetId = assetInsert.data?.id;
    if (assetInsert.error || !assetId) {
      throw new Error(assetInsert.error?.message ?? "Unable to create the OOH asset.");
    }

    await refreshDigitalSpecification(assetId, input);
    await refreshAssetPlacement(orgId, assetId, input, campaignId);
    await refreshAudienceMetric(orgId, assetId, input);
    await refreshAvailability(orgId, assetId, input, campaignId);
    await refreshAssetImages(orgId, assetId, input.images);

    return assetId;
  } catch (error) {
    if (isMissingOohTableError(error)) {
      shouldUseFallbackCache = true;
      throw new Error(OOH_REAL_DATA_REQUIRED_MESSAGE);
    }
    throw error;
  }
}

export async function updateOohAsset(assetId: string, input: OohAssetCreateInput) {
  try {
    if (await shouldUseOohFallback()) {
      throw new Error(OOH_REAL_DATA_REQUIRED_MESSAGE);
    }
    const supabase = getSupabaseAdminClient();
    const detail = await getOohAssetDetail(assetId);
    if (!detail) {
      throw new Error("The OOH asset could not be found.");
    }

    const orgId = await ensureOrganizationId();
    const { campaignId } = await resolveBrandAndCampaignIds(orgId, input);
    const assetUpdate = await supabase
      .from("ooh_assets")
      .update({
      asset_code: input.assetCode,
      media_type: input.mediaType,
      status: input.status,
      country: input.country,
      city: input.city,
      area_id: input.areaId ?? null,
      location_name: input.locationName,
      address: normalizeNullableText(input.address),
      landmark: normalizeNullableText(input.landmark),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      dimension_unit: input.dimensionUnit,
      number_of_faces: input.numberOfFaces,
      total_sqm: input.totalSqm ?? null,
      facing_direction: normalizeNullableText(input.facingDirection),
      road_type: normalizeNullableText(input.roadType),
      illumination: normalizeNullableText(input.illumination),
      media_owner: normalizeNullableText(input.mediaOwner),
      contact_name: normalizeNullableText(input.contactName),
      contact_phone: normalizeNullableText(input.contactPhone),
      notes: normalizeNullableText(input.notes),
    })
      .eq("id", assetId);

    if (assetUpdate.error) {
      throw new Error(assetUpdate.error.message);
    }

    await refreshDigitalSpecification(assetId, input);
    await refreshAssetPlacement(orgId, assetId, input, campaignId);
    await refreshAudienceMetric(orgId, assetId, input);
    await refreshAvailability(orgId, assetId, input, campaignId);
    await refreshAssetImages(orgId, assetId, input.images);

    return assetId;
  } catch (error) {
    if (isMissingOohTableError(error)) {
      shouldUseFallbackCache = true;
      throw new Error(OOH_REAL_DATA_REQUIRED_MESSAGE);
    }
    throw error;
  }
}

export async function deleteOohAsset(assetId: string) {
  try {
    if (await shouldUseOohFallback()) {
      throw new Error(OOH_REAL_DATA_REQUIRED_MESSAGE);
    }
    const supabase = getSupabaseAdminClient();
    const result = await supabase.from("ooh_assets").delete().eq("id", assetId);
    if (result.error) {
      throw new Error(result.error.message);
    }
  } catch (error) {
    if (isMissingOohTableError(error)) {
      shouldUseFallbackCache = true;
      throw new Error(OOH_REAL_DATA_REQUIRED_MESSAGE);
    }
    throw error;
  }
}

export async function assignOohAssetCoordinates(assetId: string, latitude: number, longitude: number) {
  try {
    if (await shouldUseOohFallback()) {
      throw new Error(OOH_REAL_DATA_REQUIRED_MESSAGE);
    }
    const supabase = getSupabaseAdminClient();
    const result = await supabase
      .from("ooh_assets")
      .update({
      latitude,
      longitude,
      status: "AVAILABLE",
      })
      .eq("id", assetId);

    if (result.error) {
      throw new Error(result.error.message);
    }
  } catch (error) {
    if (isMissingOohTableError(error)) {
      shouldUseFallbackCache = true;
      throw new Error(OOH_REAL_DATA_REQUIRED_MESSAGE);
    }
    throw error;
  }
}

export async function getOohAnalytics(query: OohAssetListQuery) {
  try {
    if (await shouldUseOohFallback()) {
      return {
        activeBrands: 0,
        totalAssets: 0,
        totalSpend: null,
        spendCurrency: null,
        totalBillboards: 0,
        totalDigitalScreens: 0,
        activeCampaigns: 0,
        availableInventory: 0,
        estimatedDailyAudience: 0,
        estimatedDailyImpressions: 0,
        averageDailyRate: null,
        inventoryUtilizationPercentage: null,
        assetsByCity: {},
        assetsByArea: {},
        assetsByType: {},
        assetsByRegion: {},
        spendByCity: {},
        spendByBrand: {},
        brandShare: [],
        brandSpendShare: [],
      } satisfies OohAnalyticsSummary;
    }
    const { items } = await listOohAssets({ ...query, page: 1, limit: 500 });
    const totalAssets = items.length;
    const billboards = items.filter((item) => item.mediaType === "BILLBOARD");
    const screens = items.filter((item) => item.mediaType === "DIGITAL_SCREEN");
    const activeBrands = new Set(
      items.flatMap((item) => (item.brandName ? [item.brandName] : item.campaignName ? [item.campaignName] : [])),
    ).size;
    const availableInventory = items.filter((item) => item.status === "AVAILABLE").length;
    const assetsByCity = items.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.city] = (accumulator[item.city] ?? 0) + 1;
      return accumulator;
    }, {});
    const assetsByArea = items.reduce<Record<string, number>>((accumulator, item) => {
      const key = item.areaName ?? "Unknown area";
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});
    const assetsByType = items.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.assetTypeLabel] = (accumulator[item.assetTypeLabel] ?? 0) + 1;
      return accumulator;
    }, {});
    const assetsByRegion = items.reduce<Record<string, number>>((accumulator, item) => {
      const key = item.region ?? "Unknown";
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});
    const pricedItems = items.filter((item) => item.dailyCost !== null);
    const spendByCity = pricedItems.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.city] = (accumulator[item.city] ?? 0) + (item.dailyCost ?? 0);
      return accumulator;
    }, {});
    const spendByBrand = pricedItems.reduce<Record<string, number>>((accumulator, item) => {
      const key = item.brandName ?? "Unassigned";
      accumulator[key] = (accumulator[key] ?? 0) + (item.dailyCost ?? 0);
      return accumulator;
    }, {});
    const totalSpend = pricedItems.length > 0 ? pricedItems.reduce((sum, item) => sum + (item.dailyCost ?? 0), 0) : null;
    const spendCurrency = pricedItems.find((item) => item.currency)?.currency ?? null;
    const activeCampaignKeys = new Set(
      items
        .filter((item) => item.placementStatus === "CURRENT" && item.campaignId)
        .map((item) => item.campaignId as string),
    );
    const brandTotals = items.reduce<Record<string, number>>((accumulator, item) => {
      if (!item.brandName) {
        return accumulator;
      }
      accumulator[item.brandName] = (accumulator[item.brandName] ?? 0) + 1;
      return accumulator;
    }, {});
    const brandShare = Object.entries(brandTotals)
      .sort((left, right) => right[1] - left[1])
      .map(([label, value]) => ({
        label,
        share: totalAssets > 0 ? value / totalAssets : 0,
        note: `${value} mapped OOH assets`,
        valueLabel: totalAssets > 0 ? `${((value / totalAssets) * 100).toFixed(1)}%` : "0.0%",
      }));
    const brandSpendShare = Object.entries(spendByBrand)
      .sort((left, right) => right[1] - left[1])
      .map(([label, value]) => ({
        label,
        share: totalSpend && totalSpend > 0 ? value / totalSpend : 0,
        note: `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} ${spendCurrency ?? ""}`.trim(),
        valueLabel:
          totalSpend && totalSpend > 0
            ? `${((value / totalSpend) * 100).toFixed(1)}% · ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} ${spendCurrency ?? ""}`.trim()
            : `0.0% · ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} ${spendCurrency ?? ""}`.trim(),
      }));

    return {
      activeBrands,
      totalAssets,
      totalSpend,
      spendCurrency,
      totalBillboards: billboards.length,
      totalDigitalScreens: screens.length,
      activeCampaigns: activeCampaignKeys.size,
      availableInventory,
      estimatedDailyAudience: items.reduce((sum, item) => sum + (item.expectedDailyAudience ?? 0), 0),
      estimatedDailyImpressions: items.reduce((sum, item) => sum + (item.estimatedDailyImpressions ?? 0), 0),
      averageDailyRate:
        pricedItems.length > 0
          ? Number((pricedItems.reduce((sum, item) => sum + (item.dailyCost ?? 0), 0) / pricedItems.length).toFixed(2))
          : null,
      inventoryUtilizationPercentage:
        totalAssets > 0
          ? Number((((totalAssets - availableInventory) / totalAssets) * 100).toFixed(1))
          : null,
      assetsByCity,
      assetsByArea,
      assetsByType,
      assetsByRegion,
      spendByCity,
      spendByBrand,
      brandShare,
      brandSpendShare,
    } satisfies OohAnalyticsSummary;
  } catch (error) {
    if (isMissingOohTableError(error)) {
      shouldUseFallbackCache = true;
      return {
        activeBrands: 0,
        totalAssets: 0,
        totalSpend: null,
        spendCurrency: null,
        totalBillboards: 0,
        totalDigitalScreens: 0,
        activeCampaigns: 0,
        availableInventory: 0,
        estimatedDailyAudience: 0,
        estimatedDailyImpressions: 0,
        averageDailyRate: null,
        inventoryUtilizationPercentage: null,
        assetsByCity: {},
        assetsByArea: {},
        assetsByType: {},
        assetsByRegion: {},
        spendByCity: {},
        spendByBrand: {},
        brandShare: [],
        brandSpendShare: [],
      } satisfies OohAnalyticsSummary;
    }
    throw error;
  }
}

export function buildOohImportAssetInput(input: {
  assetCode: string;
  mediaType: "BILLBOARD" | "DIGITAL_SCREEN";
  city: string;
  country: string;
  areaId: string | null;
  locationName: string;
  width: number | null;
  height: number | null;
  dimensionUnit: "METER" | "PIXEL" | "THREE_D";
  numberOfFaces: number;
  totalSqm: number | null;
  notes: string | null;
}) {
  return {
    assetCode: input.assetCode,
    mediaType: input.mediaType,
    status: "NEEDS_COORDINATES" as const,
    country: input.country,
    city: input.city,
    areaId: input.areaId,
    locationName: input.locationName,
    address: null,
    landmark: null,
    latitude: null,
    longitude: null,
    width: input.width,
    height: input.height,
    dimensionUnit: input.dimensionUnit,
    numberOfFaces: input.numberOfFaces,
    totalSqm: input.totalSqm,
    facingDirection: null,
    roadType: null,
    illumination: input.mediaType === "DIGITAL_SCREEN" ? "Backlit" : "External floodlights",
    mediaOwner: "Imported media owner",
    contactName: null,
    contactPhone: null,
    notes: input.notes,
    campaignId: null,
    campaignName: null,
    campaignSlogan: null,
    brandId: null,
    brandName: null,
    brandCategory: null,
    brandLogoUrl: null,
    installedAt: null,
    removedAt: null,
    dailyCost: null,
    weeklyCost: null,
    monthlyCost: null,
    currency: null,
    creativeImageUrl: null,
    proofOfPlayUrl: null,
    placementStatus: "SCHEDULED" as const,
    availabilityStartDate: null,
    availabilityEndDate: null,
    availabilityStatus: "AVAILABLE" as const,
    availabilityNotes: null,
    expectedDailyAudience: null,
    dailyVehicleVolume: null,
    dailyPedestrianVolume: null,
    estimatedDailyImpressions: null,
    estimatedMonthlyReach: null,
    averageFrequency: null,
    dwellTimeSeconds: null,
    visibilityScore: null,
    audienceConfidence: null,
    nearbyPoiCount: null,
    resolutionWidth: null,
    resolutionHeight: null,
    brightnessNits: null,
    operatingStartTime: null,
    operatingEndTime: null,
    loopLengthSeconds: null,
    spotLengthSeconds: null,
    estimatedPlaysPerDay: null,
    images: [] as OohAssetImageInput[],
  } satisfies OohAssetCreateInput;
}

export function estimateImportAudience(mediaType: "BILLBOARD" | "DIGITAL_SCREEN", city: string, width: number | null) {
  const visibility = mediaType === "DIGITAL_SCREEN" ? 84 : 76;
  const baseAudience = city === "Baghdad" ? (mediaType === "DIGITAL_SCREEN" ? 110000 : 72000) : mediaType === "DIGITAL_SCREEN" ? 120000 : 78000;
  const dailyAudience = Math.round(baseAudience + (width ?? 0) * 850);
  const impressions = Math.round(dailyAudience * (mediaType === "DIGITAL_SCREEN" ? 1.25 : 1.12));
  return {
    expectedDailyAudience: dailyAudience,
    estimatedDailyImpressions: impressions,
    visibilityScore: visibility,
    audienceConfidence: buildAudienceConfidenceLabel(visibility),
  };
}
