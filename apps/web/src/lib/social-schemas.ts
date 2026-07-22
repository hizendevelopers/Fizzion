import { z } from "zod";

export const socialProviderSchema = z.enum([
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
]);

export const socialDiscoverSchema = z.object({
  provider: socialProviderSchema,
  input: z.string().trim().min(2).max(500),
});

export const socialConnectStartSchema = z.object({
  provider: socialProviderSchema,
  input: z.string().trim().min(2).max(500),
  mode: z.enum(["live", "sandbox"]).default("sandbox"),
});

export const socialCallbackQuerySchema = z.object({
  state: z.string().min(8),
  code: z.string().optional(),
  mode: z.enum(["live", "sandbox"]).optional(),
});

export const socialSyncSchema = z.object({
  mode: z.enum(["initial", "incremental", "refresh"]).default("refresh"),
});

export const socialReportSchema = z.object({
  reportType: z.enum([
    "portfolio",
    "account",
    "content",
    "followers",
    "engagement",
    "top_content",
    "hashtags",
    "sentiment",
  ]),
  connectionId: z.string().uuid().optional(),
  format: z.enum(["csv", "pdf"]).default("csv"),
  dateRange: z.enum(["today", "last7", "last30", "last90", "custom"]).default("last30"),
});

export const socialConnectionQuerySchema = z.object({
  provider: socialProviderSchema.optional(),
  dateRange: z.enum(["today", "last7", "last30", "last90", "custom"]).default("last30"),
});

export const socialContentQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  contentType: z.string().trim().max(100).optional(),
  sort: z.enum(["newest", "reach", "views", "engagements", "engagement_rate"]).default("newest"),
  days: z.union([z.literal(1), z.literal(7), z.literal(14), z.literal(30), z.literal(60)]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const socialWebhookIngestSchema = z.object({
  eventType: z.string().trim().min(2),
  externalEventId: z.string().trim().min(2),
  connectionId: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()),
});

// Apify-based connection schemas
export const socialApifyDiscoverSchema = z.object({
  provider: socialProviderSchema,
  input: z.string().trim().min(2).max(2000),
});

export const socialApifyConnectSchema = z.object({
  provider: socialProviderSchema,
  input: z.string().trim().min(2).max(2000),
  resultsLimit: z.coerce.number().int().min(1).max(500).default(100),
});

export const socialApifySyncStatusSchema = z.object({
  includeProgress: z.coerce.boolean().default(false),
});

export const socialApifyRefreshSchema = z.object({
  resultsLimit: z.coerce.number().int().min(1).max(500).optional(),
});

export type SocialProviderKey = z.infer<typeof socialProviderSchema>;
export type SocialDiscoverInput = z.infer<typeof socialDiscoverSchema>;
export type SocialConnectStartInput = z.infer<typeof socialConnectStartSchema>;
export type SocialCallbackQuery = z.infer<typeof socialCallbackQuerySchema>;
export type SocialSyncInput = z.infer<typeof socialSyncSchema>;
export type SocialReportInput = z.infer<typeof socialReportSchema>;
export type SocialConnectionQuery = z.infer<typeof socialConnectionQuerySchema>;
export type SocialContentQuery = z.infer<typeof socialContentQuerySchema>;
export type SocialWebhookIngestInput = z.infer<typeof socialWebhookIngestSchema>;
export type SocialApifyDiscoverInput = z.infer<typeof socialApifyDiscoverSchema>;
export type SocialApifyConnectInput = z.infer<typeof socialApifyConnectSchema>;
export type SocialApifySyncStatusInput = z.infer<typeof socialApifySyncStatusSchema>;
export type SocialApifyRefreshInput = z.infer<typeof socialApifyRefreshSchema>;
