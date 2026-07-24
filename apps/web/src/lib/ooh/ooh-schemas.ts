import { z } from "zod";

export const oohMediaTypeSchema = z.enum(["BILLBOARD", "DIGITAL_SCREEN"]);
export const oohRegionSchema = z.enum(["Arabic", "Kurdish"]);
export const oohAssetTypeFilterSchema = z.enum(["BILLBOARD", "DIGITAL", "THREE_D", "POLL", "WALL"]);
export const oohAssetStatusSchema = z.enum([
  "ACTIVE",
  "AVAILABLE",
  "RESERVED",
  "MAINTENANCE",
  "NEEDS_COORDINATES",
  "INACTIVE",
]);
export const oohPlacementStatusSchema = z.enum(["CURRENT", "SCHEDULED", "COMPLETED"]);
export const oohDimensionUnitSchema = z.enum(["METER", "PIXEL", "THREE_D"]);
export const oohAvailabilityStatusSchema = z.enum(["AVAILABLE", "RESERVED", "BOOKED", "BLOCKED"]);
export const oohImageTypeSchema = z.enum(["SITE_PHOTO", "CREATIVE", "PROOF_OF_PLAY"]);

export const oohAssetListQuerySchema = z.object({
  city: z.string().trim().optional(),
  area: z.string().trim().optional(),
  mediaType: oohMediaTypeSchema.optional(),
  region: oohRegionSchema.optional(),
  assetType: oohAssetTypeFilterSchema.optional(),
  status: oohAssetStatusSchema.optional(),
  brandId: z.string().uuid().optional(),
  minCost: z.coerce.number().optional(),
  maxCost: z.coerce.number().optional(),
  minAudience: z.coerce.number().optional(),
  maxAudience: z.coerce.number().optional(),
  availableFrom: z.string().optional(),
  availableTo: z.string().optional(),
  bbox: z.string().optional(),
  search: z.string().trim().optional(),
  sort: z
    .enum(["highest_audience", "lowest_cost", "highest_cost", "highest_visibility", "recently_installed"])
    .optional(),
  faces: z.coerce.number().int().positive().optional(),
  includeInactive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const oohAssetImageSchema = z.object({
  imageUrl: z.string().trim().min(1),
  imageType: oohImageTypeSchema,
  altText: z.string().trim().max(240).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false),
});

export const oohAssetCreateSchema = z.object({
  assetCode: z.string().trim().min(3).max(64),
  mediaType: oohMediaTypeSchema,
  status: oohAssetStatusSchema,
  country: z.string().trim().min(2).max(64),
  city: z.string().trim().min(2).max(64),
  areaId: z.string().uuid().nullable().optional(),
  locationName: z.string().trim().min(3).max(160),
  address: z.string().trim().max(240).nullable().optional(),
  landmark: z.string().trim().max(240).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  width: z.number().positive().nullable().optional(),
  height: z.number().positive().nullable().optional(),
  dimensionUnit: oohDimensionUnitSchema,
  numberOfFaces: z.number().int().positive().default(1),
  totalSqm: z.number().positive().nullable().optional(),
  facingDirection: z.string().trim().max(64).nullable().optional(),
  roadType: z.string().trim().max(64).nullable().optional(),
  illumination: z.string().trim().max(64).nullable().optional(),
  mediaOwner: z.string().trim().max(120).nullable().optional(),
  contactName: z.string().trim().max(120).nullable().optional(),
  contactPhone: z.string().trim().max(64).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  campaignId: z.string().uuid().nullable().optional(),
  campaignName: z.string().trim().max(160).nullable().optional(),
  campaignSlogan: z.string().trim().max(240).nullable().optional(),
  brandId: z.string().uuid().nullable().optional(),
  brandName: z.string().trim().max(120).nullable().optional(),
  brandCategory: z.string().trim().max(64).nullable().optional(),
  brandLogoUrl: z.string().trim().nullable().optional(),
  installedAt: z.string().nullable().optional(),
  removedAt: z.string().nullable().optional(),
  dailyCost: z.number().nonnegative().nullable().optional(),
  weeklyCost: z.number().nonnegative().nullable().optional(),
  monthlyCost: z.number().nonnegative().nullable().optional(),
  currency: z.string().trim().max(12).nullable().optional(),
  creativeImageUrl: z.string().trim().nullable().optional(),
  proofOfPlayUrl: z.string().trim().nullable().optional(),
  placementStatus: oohPlacementStatusSchema.default("CURRENT"),
  availabilityStartDate: z.string().nullable().optional(),
  availabilityEndDate: z.string().nullable().optional(),
  availabilityStatus: oohAvailabilityStatusSchema.default("AVAILABLE"),
  availabilityNotes: z.string().trim().max(500).nullable().optional(),
  expectedDailyAudience: z.number().int().nonnegative().nullable().optional(),
  dailyVehicleVolume: z.number().int().nonnegative().nullable().optional(),
  dailyPedestrianVolume: z.number().int().nonnegative().nullable().optional(),
  estimatedDailyImpressions: z.number().int().nonnegative().nullable().optional(),
  estimatedMonthlyReach: z.number().int().nonnegative().nullable().optional(),
  averageFrequency: z.number().nonnegative().nullable().optional(),
  dwellTimeSeconds: z.number().int().nonnegative().nullable().optional(),
  visibilityScore: z.number().int().min(0).max(100).nullable().optional(),
  audienceConfidence: z.string().trim().max(120).nullable().optional(),
  nearbyPoiCount: z.number().int().nonnegative().nullable().optional(),
  resolutionWidth: z.number().int().positive().nullable().optional(),
  resolutionHeight: z.number().int().positive().nullable().optional(),
  brightnessNits: z.number().int().positive().nullable().optional(),
  operatingStartTime: z.string().nullable().optional(),
  operatingEndTime: z.string().nullable().optional(),
  loopLengthSeconds: z.number().int().positive().nullable().optional(),
  spotLengthSeconds: z.number().int().positive().nullable().optional(),
  estimatedPlaysPerDay: z.number().int().positive().nullable().optional(),
  images: z.array(oohAssetImageSchema).default([]),
});

export const oohBrandCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().max(64).nullable().optional(),
  logoUrl: z.string().trim().nullable().optional(),
  isDummyBrand: z.boolean().default(false),
});

export const oohUploadResponseSchema = z.object({
  imageUrl: z.string(),
  imageType: oohImageTypeSchema,
  altText: z.string().nullable().optional(),
});

export const oohCoordinateAssignmentSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const oohImportCommitSchema = z.object({
  selectedSheets: z.array(z.string().trim()).min(1),
  commit: z.coerce.boolean().default(false),
});

export type OohAssetListQuery = z.infer<typeof oohAssetListQuerySchema>;
export type OohAssetCreateInput = z.infer<typeof oohAssetCreateSchema>;
export type OohBrandCreateInput = z.infer<typeof oohBrandCreateSchema>;
export type OohAssetImageInput = z.infer<typeof oohAssetImageSchema>;
