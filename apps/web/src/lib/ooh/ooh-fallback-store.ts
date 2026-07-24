import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildOohDemoAssets, getOohDemoAreas } from "./demo-data";
import type {
  OohAnalyticsSummary,
  OohAreaItem,
  OohAssetDetail,
  OohAssetListItem,
  OohBrandItem,
} from "./ooh-data";
import type { OohAssetCreateInput, OohAssetListQuery, OohBrandCreateInput } from "./ooh-schemas";

type FallbackStore = {
  areas: OohAreaItem[];
  brands: OohBrandItem[];
  assets: OohAssetDetail[];
};

const STORE_PATH = path.join(process.cwd(), ".data", "ooh-fallback-store.json");

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deriveFallbackRegion(city: string) {
  if (/(erbil|hawler|duhok|sulaymaniyah|sulaimani|halabja|zakho)/i.test(city)) {
    return "Kurdish" as const;
  }
  return "Arabic" as const;
}

function deriveFallbackAssetType(mediaType: string, dimensionUnit: string) {
  if (mediaType === "DIGITAL_SCREEN" && dimensionUnit === "THREE_D") {
    return "3D Digital";
  }
  if (mediaType === "DIGITAL_SCREEN") {
    return "Digital";
  }
  return "Billboard";
}

function buildInitialStore(): FallbackStore {
  const areas = getOohDemoAreas().map((area) => ({
    id: `area-${area.slug}`,
    city: area.city,
    country: area.country,
    name: area.name,
    slug: area.slug,
    centerLatitude: area.centerLatitude,
    centerLongitude: area.centerLongitude,
  }));

  const brandsMap = new Map<string, OohBrandItem>();
  const assets = buildOohDemoAssets().map<OohAssetDetail>((asset) => {
    const brandId = `brand-${slugify(asset.brandName)}`;
    if (!brandsMap.has(brandId)) {
      brandsMap.set(brandId, {
        id: brandId,
        name: asset.brandName,
        slug: slugify(asset.brandName),
        category: asset.brandCategory,
        logoUrl: asset.creativeImagePath,
        isDummyBrand: true,
      });
    }

    const area = areas.find((item) => item.slug === asset.areaSlug) ?? null;
    const assetId = `asset-${asset.assetCode.toLowerCase()}`;
    return {
      id: assetId,
      assetCode: asset.assetCode,
      mediaType: asset.mediaType,
      dimensionUnit: asset.dimensionUnit,
      region: deriveFallbackRegion(asset.city),
      assetTypeLabel: deriveFallbackAssetType(asset.mediaType, asset.dimensionUnit),
      status: asset.status,
      city: asset.city,
      country: asset.country,
      areaId: area?.id ?? null,
      areaName: area?.name ?? null,
      locationName: asset.locationName,
      address: asset.address,
      latitude: asset.latitude,
      longitude: asset.longitude,
      brandId,
      brandName: asset.brandName,
      campaignId: `campaign-${slugify(asset.campaignName)}`,
      campaignName: asset.campaignName,
      dailyCost: asset.dailyCost,
      currency: asset.currency,
      expectedDailyAudience: asset.expectedDailyAudience,
      estimatedDailyImpressions: asset.estimatedDailyImpressions,
      visibilityScore: asset.visibilityScore,
      primaryImageUrl: asset.siteImagePath,
      placementStatus: asset.placementStatus,
      installedAt: asset.installedAt,
      numberOfFaces: asset.numberOfFaces,
      landmark: asset.landmark,
      width: asset.width,
      height: asset.height,
      totalSqm: asset.totalSqm,
      facingDirection: asset.facingDirection,
      roadType: asset.roadType,
      illumination: asset.illumination,
      mediaOwner: asset.mediaOwner,
      contactName: asset.contactName,
      contactPhone: asset.contactPhone,
      notes: "Local persisted fallback inventory record.",
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
      campaignSlogan: asset.campaignSlogan,
      campaignStartDate: asset.campaignStartDate,
      campaignEndDate: asset.campaignEndDate,
      brandLogoUrl: asset.creativeImagePath,
      brandCategory: asset.brandCategory,
      audience: {
        measurementDate: "2026-07-20",
        expectedDailyAudience: asset.expectedDailyAudience,
        dailyVehicleVolume: asset.dailyVehicleVolume,
        dailyPedestrianVolume: asset.dailyPedestrianVolume,
        estimatedDailyImpressions: asset.estimatedDailyImpressions,
        estimatedMonthlyReach: asset.estimatedMonthlyReach,
        averageFrequency: asset.averageFrequency,
        dwellTimeSeconds: asset.dwellTimeSeconds,
        visibilityScore: asset.visibilityScore,
        audienceConfidence: asset.audienceConfidence,
        nearbyPoiCount: asset.nearbyPoiCount,
      },
      digitalSpecification:
        asset.mediaType === "DIGITAL_SCREEN"
          ? {
              resolutionWidth: asset.resolutionWidth,
              resolutionHeight: asset.resolutionHeight,
              brightnessNits: asset.brightnessNits,
              operatingStartTime: asset.operatingStartTime,
              operatingEndTime: asset.operatingEndTime,
              loopLengthSeconds: asset.loopLengthSeconds,
              spotLengthSeconds: asset.spotLengthSeconds,
              estimatedPlaysPerDay: asset.estimatedPlaysPerDay,
            }
          : null,
      images: [
        {
          id: `${assetId}-site`,
          imageUrl: asset.siteImagePath,
          imageType: "SITE_PHOTO",
          altText: `${asset.locationName} site image`,
          sortOrder: 0,
          isPrimary: true,
        },
        {
          id: `${assetId}-creative`,
          imageUrl: asset.creativeImagePath,
          imageType: "CREATIVE",
          altText: `${asset.brandName} creative`,
          sortOrder: 1,
          isPrimary: false,
        },
      ],
      placements: [
        {
          id: `${assetId}-placement`,
          campaignId: `campaign-${slugify(asset.campaignName)}`,
          campaignName: asset.campaignName,
          brandName: asset.brandName,
          brandLogoUrl: asset.creativeImagePath,
          status: asset.placementStatus,
          installedAt: asset.installedAt,
          removedAt: null,
          dailyCost: asset.dailyCost,
          weeklyCost: asset.weeklyCost,
          monthlyCost: asset.monthlyCost,
          currency: asset.currency,
          creativeImageUrl: asset.creativeImagePath,
          proofOfPlayUrl: asset.siteImagePath,
        },
      ],
      availability: [
        {
          id: `${assetId}-availability`,
          startDate: asset.availabilityStartDate,
          endDate: asset.availabilityEndDate,
          status: asset.availabilityStatus,
          notes: "Fallback availability record.",
          campaignId: `campaign-${slugify(asset.campaignName)}`,
        },
      ],
    };
  });

  return {
    areas,
    brands: [...brandsMap.values()],
    assets,
  };
}

async function readStore() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  try {
    const content = await readFile(STORE_PATH, "utf8");
    return JSON.parse(content) as FallbackStore;
  } catch {
    const initialStore = buildInitialStore();
    await writeFile(STORE_PATH, JSON.stringify(initialStore, null, 2), "utf8");
    return initialStore;
  }
}

async function writeStore(store: FallbackStore) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function toListItem(asset: OohAssetDetail): OohAssetListItem {
  return {
    id: asset.id,
    assetCode: asset.assetCode,
    mediaType: asset.mediaType,
    dimensionUnit: asset.dimensionUnit,
    region: asset.region,
    assetTypeLabel: asset.assetTypeLabel,
    status: asset.status,
    city: asset.city,
    country: asset.country,
    areaId: asset.areaId,
    areaName: asset.areaName,
    locationName: asset.locationName,
    address: asset.address,
    latitude: asset.latitude,
    longitude: asset.longitude,
    brandId: asset.brandId,
    brandName: asset.brandName,
    campaignId: asset.campaignId,
    campaignName: asset.campaignName,
    dailyCost: asset.dailyCost,
    currency: asset.currency,
    expectedDailyAudience: asset.expectedDailyAudience,
    estimatedDailyImpressions: asset.estimatedDailyImpressions,
    visibilityScore: asset.visibilityScore,
    primaryImageUrl: asset.primaryImageUrl,
    placementStatus: asset.placementStatus,
    installedAt: asset.installedAt,
    numberOfFaces: asset.numberOfFaces,
  };
}

function compareAssets(left: OohAssetListItem, right: OohAssetListItem, sort: OohAssetListQuery["sort"]) {
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

export async function listOohAreasFallback() {
  return (await readStore()).areas;
}

export async function listOohBrandsFallback() {
  return (await readStore()).brands;
}

export async function listOohAssetsFallback(query: OohAssetListQuery) {
  const store = await readStore();
  const filtered = store.assets
    .map(toListItem)
    .filter((asset) => (!query.city || query.city === "All" ? true : asset.city === query.city))
    .filter((asset) => (!query.area ? true : asset.areaId === query.area))
    .filter((asset) => (!query.mediaType ? true : asset.mediaType === query.mediaType))
    .filter((asset) => (!query.status ? true : asset.status === query.status))
    .filter((asset) => (!query.brandId ? true : asset.brandId === query.brandId))
    .filter((asset) => (!query.faces ? true : asset.numberOfFaces === query.faces))
    .filter((asset) =>
      query.search
        ? `${asset.assetCode} ${asset.locationName} ${asset.address ?? ""}`.toLowerCase().includes(query.search.toLowerCase())
        : true,
    )
    .filter((asset) => (query.minCost !== undefined ? (asset.dailyCost ?? Number.NEGATIVE_INFINITY) >= query.minCost : true))
    .filter((asset) => (query.maxCost !== undefined ? (asset.dailyCost ?? Number.POSITIVE_INFINITY) <= query.maxCost : true))
    .filter((asset) =>
      query.minAudience !== undefined
        ? (asset.expectedDailyAudience ?? Number.NEGATIVE_INFINITY) >= query.minAudience
        : true,
    )
    .filter((asset) =>
      query.maxAudience !== undefined
        ? (asset.expectedDailyAudience ?? Number.POSITIVE_INFINITY) <= query.maxAudience
        : true,
    )
    .sort((left, right) => compareAssets(left, right, query.sort));

  const offset = (query.page - 1) * query.limit;
  return {
    items: filtered.slice(offset, offset + query.limit),
    total: filtered.length,
    page: query.page,
    limit: query.limit,
  };
}

export async function getOohAnalyticsFallback(query: OohAssetListQuery) {
  const { items } = await listOohAssetsFallback({ ...query, page: 1, limit: 500 });
  const totalAssets = items.length;
  const availableInventory = items.filter((item) => item.status === "AVAILABLE").length;
  const pricedItems = items.filter((item) => item.dailyCost !== null);
  const totalSpend = pricedItems.length > 0 ? pricedItems.reduce((sum, item) => sum + (item.dailyCost ?? 0), 0) : null;
  return {
    activeBrands: new Set(items.map((item) => item.brandName).filter(Boolean)).size,
    totalAssets,
    totalSpend,
    spendCurrency: pricedItems.find((item) => item.currency)?.currency ?? null,
    totalBillboards: items.filter((item) => item.mediaType === "BILLBOARD").length,
    totalDigitalScreens: items.filter((item) => item.mediaType === "DIGITAL_SCREEN").length,
    activeCampaigns: new Set(items.filter((item) => item.placementStatus === "CURRENT" && item.campaignId).map((item) => item.campaignId as string)).size,
    availableInventory,
    estimatedDailyAudience: items.reduce((sum, item) => sum + (item.expectedDailyAudience ?? 0), 0),
    estimatedDailyImpressions: items.reduce((sum, item) => sum + (item.estimatedDailyImpressions ?? 0), 0),
    averageDailyRate:
      items.filter((item) => item.dailyCost !== null).length > 0
        ? Number(
            (
              items.reduce((sum, item) => sum + (item.dailyCost ?? 0), 0) /
              items.filter((item) => item.dailyCost !== null).length
            ).toFixed(2),
          )
        : null,
    inventoryUtilizationPercentage: totalAssets > 0 ? Number((((totalAssets - availableInventory) / totalAssets) * 100).toFixed(1)) : null,
    assetsByCity: items.reduce<Record<string, number>>((acc, item) => {
      acc[item.city] = (acc[item.city] ?? 0) + 1;
      return acc;
    }, {}),
    assetsByArea: items.reduce<Record<string, number>>((acc, item) => {
      const key = item.areaName ?? "Unknown area";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
    assetsByType: items.reduce<Record<string, number>>((acc, item) => {
      acc[item.assetTypeLabel] = (acc[item.assetTypeLabel] ?? 0) + 1;
      return acc;
    }, {}),
    assetsByRegion: items.reduce<Record<string, number>>((acc, item) => {
      const key = item.region ?? "Unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
    spendByCity: pricedItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.city] = (acc[item.city] ?? 0) + (item.dailyCost ?? 0);
      return acc;
    }, {}),
    brandShare: Object.entries(
      items.reduce<Record<string, number>>((acc, item) => {
        if (!item.brandName) {
          return acc;
        }
        acc[item.brandName] = (acc[item.brandName] ?? 0) + 1;
        return acc;
      }, {}),
    ).map(([label, value]) => ({
      label,
      share: totalAssets > 0 ? value / totalAssets : 0,
      note: `${value} mapped assets`,
      valueLabel: totalAssets > 0 ? `${((value / totalAssets) * 100).toFixed(1)}%` : "0.0%",
    })),
  } satisfies OohAnalyticsSummary;
}

export async function getOohAssetDetailFallback(assetId: string) {
  const store = await readStore();
  return store.assets.find((asset) => asset.id === assetId) ?? null;
}

export async function createOohBrandFallback(input: OohBrandCreateInput) {
  const store = await readStore();
  const existing = store.brands.find((brand) => brand.name === input.name);
  if (existing) return existing;

  const brand: OohBrandItem = {
    id: `brand-${slugify(input.name)}`,
    name: input.name,
    slug: slugify(input.name),
    category: input.category ?? null,
    logoUrl: input.logoUrl ?? null,
    isDummyBrand: input.isDummyBrand,
  };
  store.brands.push(brand);
  await writeStore(store);
  return brand;
}

export async function createOohAssetFallback(input: OohAssetCreateInput) {
  const store = await readStore();
  const id = `asset-${Date.now().toString(36)}-${slugify(input.assetCode)}`;
  const area = store.areas.find((item) => item.id === input.areaId) ?? null;
  const brand = input.brandName
    ? await createOohBrandFallback({
        name: input.brandName,
        category: input.brandCategory ?? null,
        logoUrl: input.brandLogoUrl ?? null,
        isDummyBrand: false,
      })
    : null;

  const detail: OohAssetDetail = {
    id,
    assetCode: input.assetCode,
    mediaType: input.mediaType,
    region: deriveFallbackRegion(input.city),
    assetTypeLabel: deriveFallbackAssetType(input.mediaType, input.dimensionUnit),
    status: input.status,
    city: input.city,
    country: input.country,
    areaId: area?.id ?? null,
    areaName: area?.name ?? null,
    locationName: input.locationName,
    address: input.address ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    brandId: brand?.id ?? input.brandId ?? null,
    brandName: input.brandName ?? brand?.name ?? null,
    campaignId: input.campaignId ?? (input.campaignName ? `campaign-${slugify(input.campaignName)}` : null),
    campaignName: input.campaignName ?? null,
    dailyCost: input.dailyCost ?? null,
    currency: input.currency ?? null,
    expectedDailyAudience: input.expectedDailyAudience ?? null,
    estimatedDailyImpressions: input.estimatedDailyImpressions ?? null,
    visibilityScore: input.visibilityScore ?? null,
    primaryImageUrl: input.images.find((image) => image.isPrimary)?.imageUrl ?? input.images[0]?.imageUrl ?? null,
    placementStatus: input.placementStatus,
    installedAt: input.installedAt ?? null,
    numberOfFaces: input.numberOfFaces,
    landmark: input.landmark ?? null,
    width: input.width ?? null,
    height: input.height ?? null,
    totalSqm: input.totalSqm ?? null,
    dimensionUnit: input.dimensionUnit,
    facingDirection: input.facingDirection ?? null,
    roadType: input.roadType ?? null,
    illumination: input.illumination ?? null,
    mediaOwner: input.mediaOwner ?? null,
    contactName: input.contactName ?? null,
    contactPhone: input.contactPhone ?? null,
    notes: input.notes ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    campaignSlogan: input.campaignSlogan ?? null,
    campaignStartDate: input.installedAt ?? null,
    campaignEndDate: input.removedAt ?? null,
    brandLogoUrl: input.brandLogoUrl ?? brand?.logoUrl ?? null,
    brandCategory: input.brandCategory ?? brand?.category ?? null,
    audience: input.expectedDailyAudience || input.estimatedDailyImpressions || input.visibilityScore
      ? {
          measurementDate: "2026-07-20",
          expectedDailyAudience: input.expectedDailyAudience ?? null,
          dailyVehicleVolume: input.dailyVehicleVolume ?? null,
          dailyPedestrianVolume: input.dailyPedestrianVolume ?? null,
          estimatedDailyImpressions: input.estimatedDailyImpressions ?? null,
          estimatedMonthlyReach: input.estimatedMonthlyReach ?? null,
          averageFrequency: input.averageFrequency ?? null,
          dwellTimeSeconds: input.dwellTimeSeconds ?? null,
          visibilityScore: input.visibilityScore ?? null,
          audienceConfidence: input.audienceConfidence ?? null,
          nearbyPoiCount: input.nearbyPoiCount ?? null,
        }
      : null,
    digitalSpecification:
      input.mediaType === "DIGITAL_SCREEN"
        ? {
            resolutionWidth: input.resolutionWidth ?? null,
            resolutionHeight: input.resolutionHeight ?? null,
            brightnessNits: input.brightnessNits ?? null,
            operatingStartTime: input.operatingStartTime ?? null,
            operatingEndTime: input.operatingEndTime ?? null,
            loopLengthSeconds: input.loopLengthSeconds ?? null,
            spotLengthSeconds: input.spotLengthSeconds ?? null,
            estimatedPlaysPerDay: input.estimatedPlaysPerDay ?? null,
          }
        : null,
    images: input.images.map((image, index) => ({
      id: `${id}-image-${index}`,
      imageUrl: image.imageUrl,
      imageType: image.imageType,
      altText: image.altText ?? null,
      sortOrder: image.sortOrder ?? index,
      isPrimary: image.isPrimary,
    })),
    placements: [
      {
        id: `${id}-placement`,
        campaignId: input.campaignId ?? (input.campaignName ? `campaign-${slugify(input.campaignName)}` : null),
        campaignName: input.campaignName ?? null,
        brandName: input.brandName ?? brand?.name ?? null,
        brandLogoUrl: input.brandLogoUrl ?? brand?.logoUrl ?? null,
        status: input.placementStatus,
        installedAt: input.installedAt ?? null,
        removedAt: input.removedAt ?? null,
        dailyCost: input.dailyCost ?? null,
        weeklyCost: input.weeklyCost ?? null,
        monthlyCost: input.monthlyCost ?? null,
        currency: input.currency ?? null,
        creativeImageUrl: input.creativeImageUrl ?? null,
        proofOfPlayUrl: input.proofOfPlayUrl ?? null,
      },
    ],
    availability: input.availabilityStartDate && input.availabilityEndDate
      ? [
          {
            id: `${id}-availability`,
            startDate: input.availabilityStartDate,
            endDate: input.availabilityEndDate,
            status: input.availabilityStatus,
            notes: input.availabilityNotes ?? null,
            campaignId: input.campaignId ?? null,
          },
        ]
      : [],
  };

  store.assets.push(detail);
  await writeStore(store);
  return id;
}

export async function updateOohAssetFallback(assetId: string, input: OohAssetCreateInput) {
  const store = await readStore();
  const index = store.assets.findIndex((asset) => asset.id === assetId);
  if (index === -1) {
    throw new Error("The OOH asset could not be found.");
  }
  const createdId = await createOohAssetFallback(input);
  const created = await getOohAssetDetailFallback(createdId);
  if (!created) {
    throw new Error("Unable to rebuild the OOH asset record.");
  }
  created.id = assetId;
  created.createdAt = store.assets[index]?.createdAt ?? created.createdAt;
  created.updatedAt = new Date().toISOString();
  created.images = created.images.map((image, imageIndex) => ({
    ...image,
    id: `${assetId}-image-${imageIndex}`,
  }));
  created.placements = created.placements.map((placement) => ({
    ...placement,
    id: `${assetId}-placement`,
  }));
  created.availability = created.availability.map((availability) => ({
    ...availability,
    id: `${assetId}-availability`,
  }));
  store.assets[index] = created;
  store.assets = store.assets.filter((asset) => asset.id !== createdId);
  await writeStore(store);
  return assetId;
}

export async function deleteOohAssetFallback(assetId: string) {
  const store = await readStore();
  store.assets = store.assets.filter((asset) => asset.id !== assetId);
  await writeStore(store);
}

export async function assignOohAssetCoordinatesFallback(assetId: string, latitude: number, longitude: number) {
  const store = await readStore();
  const asset = store.assets.find((item) => item.id === assetId);
  if (!asset) throw new Error("The OOH asset could not be found.");
  asset.latitude = latitude;
  asset.longitude = longitude;
  asset.status = "AVAILABLE";
  asset.updatedAt = new Date().toISOString();
  await writeStore(store);
}
