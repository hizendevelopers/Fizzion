import { z } from "zod";

export const tvSourceActionSchema = z.object({
  requestId: z.string().uuid().optional(),
  notes: z.string().trim().max(1_000).optional(),
});

export const tvSourceTestSchema = tvSourceActionSchema.extend({
  diagnosticSeconds: z.number().int().min(5).max(60).default(20),
});

export const tvReviewSchema = z.object({
  reviewStatus: z.enum(["approved", "rejected", "needs_review", "pending"]),
  classification: z
    .enum(["commercial", "channel_promo", "program_promo", "psa", "non_commercial", "unknown"])
    .default("commercial"),
  brandId: z.string().uuid().nullable().optional(),
  productId: z.string().uuid().nullable().optional(),
  campaignId: z.string().uuid().nullable().optional(),
  exactStartTimeUtc: z.string().datetime().optional(),
  exactEndTimeUtc: z.string().datetime().optional(),
  notes: z.string().trim().max(2_000).optional(),
});

export const tvRegenerateClipSchema = z.object({
  requestId: z.string().uuid().optional(),
  reason: z.string().trim().max(500).optional(),
});

export const tvUploadManifestSchema = z.object({
  channel_slug: z.literal("ary-news"),
  source_partner_id: z.string().uuid().optional(),
  source_start_time: z.string().datetime(),
  source_timezone: z.string().min(2).default("Asia/Baghdad"),
  expected_duration_seconds: z.number().int().min(1).max(86_400),
  sha256: z.string().min(16).max(128),
  filename: z.string().min(3).max(255),
  storage_key: z.string().min(3).max(512).optional(),
  container_format: z.string().max(32).optional(),
  notes: z.string().trim().max(1_000).optional(),
});

export const tvOccurrenceFilterSchema = z.object({
  q: z.string().trim().max(200).optional(),
  channel: z.string().trim().max(100).optional(),
  reviewStatus: z
    .enum(["approved", "rejected", "needs_review", "pending"])
    .optional(),
  classification: z
    .enum(["commercial", "channel_promo", "program_promo", "psa", "non_commercial", "unknown"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  page: z.coerce.number().int().min(1).default(1),
});

export type TvSourceTestInput = z.infer<typeof tvSourceTestSchema>;
export type TvReviewInput = z.infer<typeof tvReviewSchema>;
export type TvRegenerateClipInput = z.infer<typeof tvRegenerateClipSchema>;
export type TvUploadManifestInput = z.infer<typeof tvUploadManifestSchema>;
export type TvOccurrenceFilterInput = z.infer<typeof tvOccurrenceFilterSchema>;
