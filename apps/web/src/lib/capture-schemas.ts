import { z } from "zod";

const captureStatusSchema = z.enum([
  "initializing",
  "ready",
  "waiting_for_recording",
  "recording_detected",
  "waiting_for_file_completion",
  "validating",
  "checksum_calculating",
  "upload_initializing",
  "uploading",
  "upload_paused",
  "upload_retrying",
  "upload_completed",
  "processing_started",
  "offline",
  "authentication_failed",
  "obs_not_running",
  "chrome_not_running",
  "audio_missing",
  "video_black",
  "invalid_file",
  "disk_space_low",
  "failed",
]);

export const captureDeviceRegisterSchema = z.object({
  organizationSlug: z.string().trim().min(2).default("hizen"),
  channelSlug: z.string().trim().min(2).default("ary-news"),
  deviceName: z.string().trim().min(2).max(120),
  deviceType: z.string().trim().min(2).max(80).default("windows_laptop"),
  operatingSystem: z.string().trim().min(2).max(120).default("Windows 11"),
  agentVersion: z.string().trim().min(1).max(40),
  captureFolder: z.string().trim().min(3).max(260),
  localTimezone: z.string().trim().min(2).max(80).default("Asia/Baghdad"),
  totalDiskBytes: z.number().int().nonnegative().optional(),
  availableDiskBytes: z.number().int().nonnegative().optional(),
});

export const captureDeviceApproveSchema = z.object({
  deviceId: z.string().uuid().optional(),
  registrationCode: z.string().trim().min(4).max(32).optional(),
  assignChannelSlug: z.string().trim().min(2).default("ary-news"),
}).refine((value) => value.deviceId || value.registrationCode, {
  error: "Either deviceId or registrationCode is required.",
  path: ["deviceId"],
});

export const captureDeviceHeartbeatSchema = z.object({
  status: captureStatusSchema,
  obsRunning: z.boolean(),
  chromeRunning: z.boolean(),
  diskFreeBytes: z.number().int().nonnegative().optional(),
  pendingFiles: z.number().int().nonnegative().default(0),
  currentUploadId: z.string().uuid().nullable().optional(),
  availableDiskBytes: z.number().int().nonnegative().optional(),
  totalDiskBytes: z.number().int().nonnegative().optional(),
  captureFolder: z.string().trim().min(3).max(260).optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const captureDeviceRevokeSchema = z.object({
  deviceId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

export const captureUploadDuplicateSchema = z.object({
  channelSlug: z.string().trim().min(2).default("ary-news"),
  sha256: z.string().trim().min(32).max(128),
  fileSizeBytes: z.number().int().positive(),
  sourceStartTime: z.string().datetime(),
  durationMs: z.number().int().positive(),
});

export const captureUploadInitiateSchema = captureUploadDuplicateSchema.extend({
  filename: z.string().trim().min(3).max(255),
  sourceEndTime: z.string().datetime().optional(),
  sourceTimezone: z.string().trim().min(2).max(80).default("Asia/Baghdad"),
  timestampConfidence: z.enum([
    "exact_filename",
    "source_metadata",
    "filesystem_estimate",
    "manually_corrected",
    "unknown",
  ]).default("unknown"),
});

export const captureUploadPartUrlSchema = z.object({
  uploadSessionId: z.string().uuid(),
  partNumber: z.number().int().min(1).max(10_000),
  partSizeBytes: z.number().int().positive().max(1024 * 1024 * 1024),
});

export const captureUploadCompleteSchema = z.object({
  uploadSessionId: z.string().uuid(),
  storageKey: z.string().trim().min(3).max(512),
  uploadedBytes: z.number().int().nonnegative(),
  parts: z.array(z.object({
    partNumber: z.number().int().min(1),
    etag: z.string().trim().min(1).max(255),
  })).default([]),
});

export const captureUploadAbortSchema = z.object({
  uploadSessionId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

export type CaptureDeviceRegisterInput = z.infer<typeof captureDeviceRegisterSchema>;
export type CaptureDeviceApproveInput = z.infer<typeof captureDeviceApproveSchema>;
export type CaptureDeviceHeartbeatInput = z.infer<typeof captureDeviceHeartbeatSchema>;
export type CaptureDeviceRevokeInput = z.infer<typeof captureDeviceRevokeSchema>;
export type CaptureUploadDuplicateInput = z.infer<typeof captureUploadDuplicateSchema>;
export type CaptureUploadInitiateInput = z.infer<typeof captureUploadInitiateSchema>;
export type CaptureUploadPartUrlInput = z.infer<typeof captureUploadPartUrlSchema>;
export type CaptureUploadCompleteInput = z.infer<typeof captureUploadCompleteSchema>;
export type CaptureUploadAbortInput = z.infer<typeof captureUploadAbortSchema>;
