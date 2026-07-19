import { getOptionalSupabaseAdminClient, getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  buildTvRecordingFilename,
  isSourceAuthorizedForRecording,
  toBaghdadDateTime,
} from "@/lib/tv-utils";

const ARY_SLUG = "ary-news";

type GenericRow = Record<string, unknown>;

export type TvSourceSummary = {
  id: string;
  sourceType: string;
  authorizationStatus: string;
  verificationStatus: string;
  expectedSchedule: string | null;
  sourceTimezone: string;
  isPrimary: boolean;
  isActive: boolean;
  secretReference: string | null;
  lastHeartbeatAt: string | null;
  lastSuccessAt: string | null;
};

export type TvAuthorizationSummary = {
  id: string;
  status: string;
  agreementReference: string | null;
  territory: string;
  permittedMonitoring: boolean;
  permittedRecording: boolean;
  permittedClipping: boolean;
  permittedInternalPlayback: boolean;
  permittedDownload: boolean;
  validFrom: string | null;
  validUntil: string | null;
  approvedAt: string | null;
  notes: string | null;
};

export type TvChannelOverview = {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
  nameAr: string | null;
  countryCode: string | null;
  monitoringMarket: string;
  category: string | null;
  recordingStatus: string;
  sourceVerificationState: string;
  sourceAuthorizationStatus: string;
  currentSourceHealth: string;
  currentVideoResolution: string | null;
  currentAudioCodec: string | null;
  currentVideoCodec: string | null;
  lastHeartbeatAt: string | null;
  lastSuccessfulFileAt: string | null;
  lastProcessedAt: string | null;
  displayTimezone: string;
  sourceTimezone: string;
  expectedSchedule: string | null;
  notes: string | null;
  source: TvSourceSummary | null;
  authorization: TvAuthorizationSummary | null;
  metrics: {
    adsDetectedToday: number;
    uniqueCreativesToday: number;
    totalAdDurationMsToday: number;
    confirmedAds: number;
    needsReviewAds: number;
    unknownAds: number;
    recordingUptimeSegments: number;
    recordingGapCount: number;
    lastSuccessfulSegment: string | null;
  };
  recentOccurrences: TvOccurrenceSummary[];
  recentSegments: TvSegmentSummary[];
};

export type TvOccurrenceSummary = {
  id: string;
  brand: string;
  product: string;
  campaign: string;
  creative: string;
  confidenceScore: number | null;
  reviewStatus: string;
  classification: string;
  isFirstSeen: boolean;
  startedAtUtc: string | null;
  endedAtUtc: string | null;
  iraqTimeLabel: string | null;
  durationMs: number;
  clipStatus: string;
};

export type TvSegmentSummary = {
  id: string;
  filename: string;
  startTimeUtc: string | null;
  endTimeUtc: string | null;
  validationStatus: string | null;
  processingStatus: string | null;
  durationMs: number;
};

export type TvOccurrenceDetail = TvOccurrenceSummary & {
  channel: string;
  sourceType: string | null;
  sourceVerificationState: string | null;
  clip: {
    id: string | null;
    storageKey: string | null;
    proxyStorageKey: string | null;
    thumbnailStorageKey: string | null;
    contextStatus: string;
    contextStartTimeUtc: string | null;
    contextEndTimeUtc: string | null;
    exactAdStartOffsetMs: number | null;
    exactAdEndOffsetMs: number | null;
    preContextMs: number | null;
    postContextMs: number | null;
    clipDurationMs: number | null;
    generationStatus: string;
  } | null;
  evidence: Array<{
    id: string;
    evidenceType: string;
    provider: string | null;
    score: number | null;
    detectedValue: string | null;
    modelVersion: string | null;
    structuredResult: Record<string, unknown>;
  }>;
  sources: Array<{
    recordingFileId: string;
    filename: string;
    sequenceOrder: number;
    sourceOffsetStartMs: number;
    sourceOffsetEndMs: number;
  }>;
  reviewHistory: Array<{
    id: string;
    actionType: string;
    notes: string | null;
    createdAt: string;
  }>;
};

export type TvAdminSourceRecord = {
  source: TvSourceSummary;
  channelName: string;
  channelId: string;
  organizationId: string;
  authorization: TvAuthorizationSummary | null;
};

function safeText(value: unknown, fallback = "Unassigned") {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return fallback;
}

function rowString(row: GenericRow, key: string, fallback = "") {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function rowNullableString(row: GenericRow, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function rowNumber(row: GenericRow, key: string, fallback = 0) {
  const value = row[key];
  return typeof value === "number" ? value : fallback;
}

function rowBoolean(row: GenericRow, key: string, fallback = false) {
  const value = row[key];
  return typeof value === "boolean" ? value : fallback;
}

export async function getTvChannelOverview(channelSlug = ARY_SLUG): Promise<TvChannelOverview | null> {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data: channel, error } = await supabase
    .from("tv_channels")
    .select("*")
    .eq("slug", channelSlug)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (error || !channel) {
    return null;
  }

  const channelRow = channel as GenericRow;

  const { data: sources } = await supabase
    .from("tv_sources")
    .select("*")
    .eq("channel_id", rowString(channelRow, "id"))
    .order("is_primary", { ascending: false })
    .order("priority", { ascending: true });

  const sourceRow = (sources?.[0] ?? null) as GenericRow | null;

  const { data: authorization } = sourceRow
    ? await supabase
        .from("tv_source_authorizations")
        .select("*")
        .eq("source_id", rowString(sourceRow, "id"))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const [occurrenceRows, recordingRows, gapRows] = await Promise.all([
    supabase
      .from("tv_ad_occurrences")
      .select("*")
      .eq("channel_id", rowString(channelRow, "id"))
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("tv_recording_files")
      .select("*")
      .eq("channel_id", rowString(channelRow, "id"))
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("tv_recording_gaps")
      .select("id", { count: "exact" })
      .eq("channel_id", rowString(channelRow, "id")),
  ]);

  const occurrenceData = (occurrenceRows.data ?? []) as GenericRow[];
  const recordingData = (recordingRows.data ?? []) as GenericRow[];

  const recentOccurrences = occurrenceData.map((row) => mapOccurrenceSummary(row));
  const recentSegments = recordingData.map((row) => ({
    id: rowString(row, "id"),
    filename: safeText(row.filename, buildTvRecordingFilename(channelSlug, new Date().toISOString())),
    startTimeUtc: rowNullableString(row, "start_time_utc") ?? rowNullableString(row, "source_timestamp"),
    endTimeUtc: rowNullableString(row, "end_time_utc") ?? rowNullableString(row, "source_end_time"),
    validationStatus: rowNullableString(row, "validation_status") ?? rowNullableString(row, "integrity_status"),
    processingStatus: rowNullableString(row, "processing_status"),
    durationMs:
      rowNumber(row, "duration_ms") ||
      Math.round((rowNumber(row, "duration_seconds") || 0) * 1000),
  }));

  const todayOccurrenceCount = recentOccurrences.length;
  const uniqueCreativesToday = new Set(
    recentOccurrences.map((occurrence) => occurrence.creative).filter(Boolean),
  ).size;
  const confirmedAds = recentOccurrences.filter((occurrence) => occurrence.reviewStatus === "approved").length;
  const needsReviewAds = recentOccurrences.filter((occurrence) =>
    ["pending", "needs_review"].includes(occurrence.reviewStatus),
  ).length;
  const unknownAds = recentOccurrences.filter((occurrence) => occurrence.brand === "Unknown").length;

  return {
    id: rowString(channelRow, "id"),
    organizationId: rowString(channelRow, "organization_id"),
    slug: rowString(channelRow, "slug"),
    name: rowString(channelRow, "name_en") || rowString(channelRow, "name"),
    nameAr: rowNullableString(channelRow, "name_ar"),
    countryCode: rowNullableString(channelRow, "country_code"),
    monitoringMarket: rowString(channelRow, "monitoring_market", "Iraq"),
    category: rowNullableString(channelRow, "category"),
    recordingStatus: rowString(channelRow, "recording_status", "inactive"),
    sourceVerificationState: rowString(
      channelRow,
      "source_verification_state",
      "pending_authorization",
    ),
    sourceAuthorizationStatus: rowString(
      channelRow,
      "source_authorization_status",
      "pending_authorization",
    ),
    currentSourceHealth: rowString(
      channelRow,
      "current_source_health",
      rowString(channelRow, "monitoring_health", "awaiting_authorized_feed"),
    ),
    currentVideoResolution: rowNullableString(channelRow, "current_video_resolution"),
    currentAudioCodec: rowNullableString(channelRow, "current_audio_codec"),
    currentVideoCodec: rowNullableString(channelRow, "current_video_codec"),
    lastHeartbeatAt: rowNullableString(channelRow, "last_heartbeat_at"),
    lastSuccessfulFileAt: rowNullableString(channelRow, "last_successful_file_at"),
    lastProcessedAt: rowNullableString(channelRow, "last_processed_at"),
    displayTimezone: rowString(channelRow, "display_timezone", "Asia/Baghdad"),
    sourceTimezone: rowString(channelRow, "source_timezone", "Asia/Baghdad"),
    expectedSchedule: rowNullableString(channelRow, "expected_schedule"),
    notes: rowNullableString(channelRow, "notes"),
    source: sourceRow ? mapSourceSummary(sourceRow) : null,
    authorization: authorization ? mapAuthorizationSummary(authorization as GenericRow) : null,
    metrics: {
      adsDetectedToday: todayOccurrenceCount,
      uniqueCreativesToday,
      totalAdDurationMsToday: recentOccurrences.reduce((sum, item) => sum + item.durationMs, 0),
      confirmedAds,
      needsReviewAds,
      unknownAds,
      recordingUptimeSegments: recentSegments.length,
      recordingGapCount: gapRows.count ?? 0,
      lastSuccessfulSegment: recentSegments[0]?.startTimeUtc ?? null,
    },
    recentOccurrences,
    recentSegments,
  };
}

export async function listTvOccurrences(filters?: {
  reviewStatus?: string;
  classification?: string;
  limit?: string | number;
  page?: string | number;
}) {
  const limit = Math.min(Number(filters?.limit ?? 25) || 25, 100);
  const page = Math.max(Number(filters?.page ?? 1) || 1, 1);
  const supabase = getOptionalSupabaseAdminClient();

  if (!supabase) {
    return {
      total: 0,
      page,
      limit,
      items: [],
    };
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("tv_ad_occurrences")
    .select("*", { count: "exact" })
    .order("exact_start_time_utc", { ascending: false, nullsFirst: false })
    .order("started_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  const reviewStatus = typeof filters?.reviewStatus === "string" ? filters.reviewStatus : null;
  const classification = typeof filters?.classification === "string" ? filters.classification : null;

  if (reviewStatus) {
    query = query.eq("review_status", reviewStatus);
  }

  if (classification) {
    query = query.eq("classification", classification);
  }

  const { data, count } = await query;

  const rows = (data ?? []) as GenericRow[];

  return {
    total: count ?? rows.length,
    page,
    limit,
    items: rows.map((row) => mapOccurrenceSummary(row)),
  };
}

export async function getTvOccurrenceDetail(occurrenceId: string): Promise<TvOccurrenceDetail | null> {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data: occurrence, error } = await supabase
    .from("tv_ad_occurrences")
    .select("*")
    .eq("id", occurrenceId)
    .limit(1)
    .maybeSingle();

  if (error || !occurrence) {
    return null;
  }

  const occurrenceRow = occurrence as GenericRow;
  const channelId = rowString(occurrenceRow, "channel_id");

  const [channel, clip, evidence, sources, reviewHistory] = await Promise.all([
    supabase.from("tv_channels").select("*").eq("id", channelId).limit(1).maybeSingle(),
    supabase
      .from("tv_ad_occurrence_clips")
      .select("*")
      .eq("occurrence_id", occurrenceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("tv_detection_evidence")
      .select("*")
      .eq("occurrence_id", occurrenceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("tv_ad_occurrence_sources")
      .select("*")
      .eq("occurrence_id", occurrenceId)
      .order("sequence_order", { ascending: true }),
    supabase
      .from("tv_review_actions")
      .select("*")
      .eq("occurrence_id", occurrenceId)
      .order("created_at", { ascending: false }),
  ]);

  const recordingIds = ((sources.data ?? []) as GenericRow[]).map((row) => rowString(row, "recording_file_id"));
  const recordingLookup = new Map<string, string>();

  if (recordingIds.length > 0) {
    const { data: recordingRows } = await supabase
      .from("tv_recording_files")
      .select("id, filename")
      .in("id", recordingIds);

    for (const row of (recordingRows ?? []) as GenericRow[]) {
      recordingLookup.set(rowString(row, "id"), rowString(row, "filename"));
    }
  }

  return {
    ...mapOccurrenceSummary(occurrenceRow),
    channel: channel.data ? safeText((channel.data as GenericRow).name_en ?? (channel.data as GenericRow).name) : "ARY News",
    sourceType: channel.data ? rowNullableString(channel.data as GenericRow, "source_type") : null,
    sourceVerificationState: channel.data
      ? rowNullableString(channel.data as GenericRow, "source_verification_state")
      : null,
    clip: clip.data
      ? {
          id: rowNullableString(clip.data as GenericRow, "id"),
          storageKey: rowNullableString(clip.data as GenericRow, "storage_key"),
          proxyStorageKey: rowNullableString(clip.data as GenericRow, "proxy_storage_key"),
          thumbnailStorageKey: rowNullableString(clip.data as GenericRow, "thumbnail_storage_key"),
          contextStatus: rowString(clip.data as GenericRow, "context_status", "pending"),
          contextStartTimeUtc:
            rowNullableString(clip.data as GenericRow, "context_start_time_utc") ??
            rowNullableString(clip.data as GenericRow, "clip_started_at"),
          contextEndTimeUtc:
            rowNullableString(clip.data as GenericRow, "context_end_time_utc") ??
            rowNullableString(clip.data as GenericRow, "clip_ended_at"),
          exactAdStartOffsetMs:
            (clip.data as GenericRow).exact_ad_start_offset_ms as number | null,
          exactAdEndOffsetMs:
            (clip.data as GenericRow).exact_ad_end_offset_ms as number | null,
          preContextMs: (clip.data as GenericRow).pre_context_ms as number | null,
          postContextMs: (clip.data as GenericRow).post_context_ms as number | null,
          clipDurationMs: (clip.data as GenericRow).clip_duration_ms as number | null,
          generationStatus: rowString(clip.data as GenericRow, "generation_status", "pending"),
        }
      : null,
    evidence: ((evidence.data ?? []) as GenericRow[]).map((row) => ({
      id: rowString(row, "id"),
      evidenceType: rowString(row, "evidence_type"),
      provider: rowNullableString(row, "provider"),
      score: (row.score as number | null) ?? null,
      detectedValue: rowNullableString(row, "detected_value"),
      modelVersion: rowNullableString(row, "model_version"),
      structuredResult: (row.structured_result as Record<string, unknown>) ?? {},
    })),
    sources: ((sources.data ?? []) as GenericRow[]).map((row) => ({
      recordingFileId: rowString(row, "recording_file_id"),
      filename: recordingLookup.get(rowString(row, "recording_file_id")) ?? "Unknown segment",
      sequenceOrder: rowNumber(row, "sequence_order", 1),
      sourceOffsetStartMs: rowNumber(row, "source_offset_start_ms"),
      sourceOffsetEndMs: rowNumber(row, "source_offset_end_ms"),
    })),
    reviewHistory: ((reviewHistory.data ?? []) as GenericRow[]).map((row) => ({
      id: rowString(row, "id"),
      actionType: rowString(row, "action_type"),
      notes: rowNullableString(row, "notes"),
      createdAt: rowString(row, "created_at"),
    })),
  };
}

export async function listTvAdminSources(): Promise<TvAdminSourceRecord[]> {
  const supabase = getOptionalSupabaseAdminClient();
  if (!supabase) {
    return [];
  }

  const { data: sources } = await supabase.from("tv_sources").select("*").order("created_at");
  const sourceRows = (sources ?? []) as GenericRow[];

  if (sourceRows.length === 0) {
    return [];
  }

  const channelIds = sourceRows.map((row) => rowString(row, "channel_id"));
  const sourceIds = sourceRows.map((row) => rowString(row, "id"));

  const [channels, authorizations] = await Promise.all([
    supabase.from("tv_channels").select("*").in("id", channelIds),
    supabase
      .from("tv_source_authorizations")
      .select("*")
      .in("source_id", sourceIds)
      .order("created_at", { ascending: false }),
  ]);

  const channelLookup = new Map(
    ((channels.data ?? []) as GenericRow[]).map((row) => [rowString(row, "id"), row]),
  );
  const authLookup = new Map<string, GenericRow>();
  for (const row of (authorizations.data ?? []) as GenericRow[]) {
    const sourceId = rowString(row, "source_id");
    if (!authLookup.has(sourceId)) {
      authLookup.set(sourceId, row);
    }
  }

  return sourceRows.map((row) => ({
    source: mapSourceSummary(row),
    channelName: safeText(channelLookup.get(rowString(row, "channel_id"))?.name_en ?? channelLookup.get(rowString(row, "channel_id"))?.name, "Unknown channel"),
    channelId: rowString(row, "channel_id"),
    organizationId: rowString(row, "organization_id"),
    authorization: authLookup.has(rowString(row, "id"))
      ? mapAuthorizationSummary(authLookup.get(rowString(row, "id")) as GenericRow)
      : null,
  }));
}

export async function getSourceRecord(sourceId: string) {
  const records = await listTvAdminSources();
  return records.find((record) => record.source.id === sourceId) ?? null;
}

export async function createUploadProcessingMetadata(input: {
  channelId: string;
  organizationId: string;
  sourceId: string | null;
  manifest: {
    filename: string;
    sourceStartTime: string;
    sourceTimezone: string;
    expectedDurationSeconds: number;
    sha256: string;
    storageKey: string;
  };
}) {
  const supabase = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const { data: recording } = await supabase
    .from("tv_recording_files")
    .insert({
      organization_id: input.organizationId,
      channel_id: input.channelId,
      tv_source_id: input.sourceId,
      storage_key: input.manifest.storageKey,
      filename: input.manifest.filename,
      source_timestamp: input.manifest.sourceStartTime,
      source_timezone: input.manifest.sourceTimezone,
      duration_seconds: input.manifest.expectedDurationSeconds,
      checksum_sha256: input.manifest.sha256,
      upload_mode: "manual_upload",
      media_metadata: {
        mode: "manual_upload",
      },
      integrity_status: "pending",
      processing_status: "received",
      start_time_utc: input.manifest.sourceStartTime,
      end_time_utc: new Date(
        new Date(input.manifest.sourceStartTime).getTime() +
          input.manifest.expectedDurationSeconds * 1000,
      ).toISOString(),
      duration_ms: input.manifest.expectedDurationSeconds * 1000,
      validation_status: "pending",
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select("id")
    .limit(1)
    .maybeSingle();

  if (!recording?.id) {
    throw new Error("Recording metadata could not be created.");
  }

  await supabase.from("tv_processing_jobs").insert({
    organization_id: input.organizationId,
    channel_id: input.channelId,
    recording_file_id: recording.id,
    job_type: "tv-recording-validate",
    queue_name: "tv-recording-validate",
    status: "queued",
    attempts: 0,
    payload: {
      sourceId: input.sourceId,
      mode: "manual_upload",
      storageKey: input.manifest.storageKey,
    },
    worker_version: "repo-scaffold",
  });

  return recording.id;
}

export async function writeAuditLog(entry: {
  organizationId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdminClient();
  await supabase.from("audit_logs").insert({
    organization_id: entry.organizationId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    payload: entry.payload ?? {},
  });
}

export async function ensureSandboxFixtureData(input: {
  organizationId: string;
  channelId: string;
  sourceId: string;
}) {
  const supabase = getSupabaseAdminClient();
  const existing = await supabase
    .from("tv_ad_occurrences")
    .select("id")
    .eq("channel_id", input.channelId)
    .eq("first_detection_method", "sandbox_fixture")
    .limit(1)
    .maybeSingle();

  if (existing.data?.id) {
    return { occurrenceId: existing.data.id, created: false };
  }

  const now = new Date();
  const startedAt = new Date(now.getTime() - 45 * 60 * 1000);
  const segmentEnd = new Date(startedAt.getTime() + 5 * 60 * 1000);
  const adStart = new Date(startedAt.getTime() + 95 * 1000);
  const adEnd = new Date(adStart.getTime() + 30 * 1000);
  const clipStart = new Date(adStart.getTime() - 5 * 1000);
  const clipEnd = new Date(adEnd.getTime() + 5 * 1000);
  const sourceDatePath = startedAt.toISOString().slice(0, 10).replaceAll("-", "/");
  const checksum = `sandbox-${input.channelId}-fixture-001`;

  const brandLookup = await supabase
    .from("brands")
    .select("id, name")
    .eq("organization_id", input.organizationId)
    .eq("name", "Coca-Cola")
    .limit(1)
    .maybeSingle();

  const { data: recorderSession } = await supabase
    .from("tv_recorder_sessions")
    .insert({
      organization_id: input.organizationId,
      channel_id: input.channelId,
      source_id: input.sourceId,
      worker_id: "sandbox-fixture-worker",
      started_at: startedAt.toISOString(),
      status: "sandbox_active",
      restart_count: 0,
      last_heartbeat_at: now.toISOString(),
    })
    .select("id")
    .limit(1)
    .maybeSingle();

  const { data: recording } = await supabase
    .from("tv_recording_files")
    .insert({
      organization_id: input.organizationId,
      channel_id: input.channelId,
      tv_source_id: input.sourceId,
      recorder_session_id: recorderSession?.id ?? null,
      storage_key: `tv/raw/ary-news/sandbox/${sourceDatePath}/ary-news__fixture__001.ts`,
      proxy_storage_key: `tv/proxies/ary-news/sandbox/${sourceDatePath}/ary-news__fixture__001.mp4`,
      thumbnail_manifest_key: `tv/thumbnails/ary-news/sandbox/${sourceDatePath}/ary-news__fixture__001.json`,
      filename: "ary-news__fixture__001__Asia-Karachi.ts",
      source_timestamp: startedAt.toISOString(),
      source_end_time: segmentEnd.toISOString(),
      source_timezone: "Asia/Karachi",
      start_time_utc: startedAt.toISOString(),
      end_time_utc: segmentEnd.toISOString(),
      duration_seconds: 300,
      duration_ms: 300_000,
      file_size_bytes: 24_000_000,
      checksum_sha256: checksum,
      upload_mode: "sandbox_fixture",
      container_format: "mpegts",
      video_codec: "h264",
      audio_codec: "aac",
      width: 1280,
      height: 720,
      frame_rate: 25,
      bitrate: 2400000,
      audio_sample_rate: 48000,
      media_metadata: {
        mode: "sandbox_fixture",
        label: "Synthetic or licensed test fixture — not live ARY News production monitoring.",
      },
      source_provenance: {
        mode: "sandbox_fixture",
      },
      integrity_status: "valid",
      validation_status: "valid",
      processing_status: "processed",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .select("id")
    .limit(1)
    .maybeSingle();

  if (!recording?.id) {
    throw new Error("Sandbox recording fixture could not be created.");
  }

  const { data: adBreak } = await supabase
    .from("tv_ad_breaks")
    .insert({
      organization_id: input.organizationId,
      recording_file_id: recording.id,
      channel_id: input.channelId,
      break_start_at: adStart.toISOString(),
      break_end_at: adEnd.toISOString(),
      duration_ms: 30_000,
      confidence: 0.96,
      detection_status: "detected",
      reviewer_status: "pending",
    })
    .select("id")
    .limit(1)
    .maybeSingle();

  const { data: occurrence } = await supabase
    .from("tv_ad_occurrences")
    .insert({
      organization_id: input.organizationId,
      channel_id: input.channelId,
      recording_file_id: recording.id,
      ad_break_id: adBreak?.id ?? null,
      brand_id: brandLookup.data?.id ?? null,
      started_at: adStart.toISOString(),
      ended_at: adEnd.toISOString(),
      duration_seconds: 30,
      exact_start_time_utc: adStart.toISOString(),
      exact_end_time_utc: adEnd.toISOString(),
      exact_duration_ms: 30_000,
      display_timezone: "Asia/Baghdad",
      classification: "commercial",
      confidence_score: 0.96,
      review_status: "needs_review",
      reviewer_status: "needs_review",
      content_type: "commercial",
      first_detection_method: "sandbox_fixture",
      is_first_seen: true,
      source_provenance: {
        mode: "sandbox_fixture",
      },
      detection_summary: "Deterministic sandbox fixture for ARY News workflow verification.",
    })
    .select("id")
    .limit(1)
    .maybeSingle();

  if (!occurrence?.id) {
    throw new Error("Sandbox occurrence fixture could not be created.");
  }

  await supabase.from("tv_ad_occurrence_sources").insert({
    organization_id: input.organizationId,
    occurrence_id: occurrence.id,
    recording_file_id: recording.id,
    source_offset_start_ms: 95_000,
    source_offset_end_ms: 125_000,
    sequence_order: 1,
  });

  await supabase.from("tv_ad_occurrence_clips").insert({
    organization_id: input.organizationId,
    occurrence_id: occurrence.id,
    storage_key: `tv/occurrences/ary-news/sandbox/${sourceDatePath}/occurrence-fixture-001.mp4`,
    proxy_storage_key: `tv/occurrences/ary-news/sandbox/${sourceDatePath}/occurrence-fixture-001-proxy.mp4`,
    thumbnail_storage_key: `tv/thumbnails/ary-news/sandbox/${sourceDatePath}/occurrence-fixture-001.jpg`,
    clip_started_at: clipStart.toISOString(),
    clip_ended_at: clipEnd.toISOString(),
    context_start_time_utc: clipStart.toISOString(),
    context_end_time_utc: clipEnd.toISOString(),
    exact_ad_start_offset_ms: 5_000,
    exact_ad_end_offset_ms: 35_000,
    pre_context_seconds: 5,
    post_context_seconds: 5,
    pre_context_ms: 5_000,
    post_context_ms: 5_000,
    context_status: "full",
    clip_duration_ms: 40_000,
    generation_status: "generated",
    checksum_sha256: `${checksum}-clip`,
    generated_at: now.toISOString(),
  });

  await supabase.from("tv_detection_evidence").insert([
    {
      organization_id: input.organizationId,
      occurrence_id: occurrence.id,
      evidence_type: "ocr",
      provider: "sandbox-fixture",
      score: 0.94,
      detected_value: "Coca-Cola",
      structured_result: {
        language: "en",
        text: "Coca-Cola Summer Spark",
      },
      model_version: "sandbox-v1",
    },
    {
      organization_id: input.organizationId,
      occurrence_id: occurrence.id,
      evidence_type: "logo_detection",
      provider: "sandbox-fixture",
      score: 0.97,
      detected_value: "Coca-Cola",
      structured_result: {
        matches: ["coca-cola"],
      },
      model_version: "sandbox-v1",
    },
  ]);

  await supabase.from("tv_processing_jobs").insert({
    organization_id: input.organizationId,
    channel_id: input.channelId,
    recording_file_id: recording.id,
    job_type: "tv-sandbox-fixture-bootstrap",
    queue_name: "tv-sandbox-fixture-bootstrap",
    status: "completed",
    attempts: 1,
    payload: {
      sourceId: input.sourceId,
      mode: "sandbox_fixture",
      occurrenceId: occurrence.id,
    },
    worker_version: "repo-scaffold",
    started_at: now.toISOString(),
    completed_at: now.toISOString(),
  });

  return { occurrenceId: occurrence.id, created: true };
}

export function mapSourceSummary(row: GenericRow): TvSourceSummary {
  return {
    id: rowString(row, "id"),
    sourceType: rowString(row, "source_type"),
    authorizationStatus: rowString(row, "authorization_status", "pending_authorization"),
    verificationStatus: rowString(row, "verification_status", "pending_authorization"),
    expectedSchedule: rowNullableString(row, "expected_schedule"),
    sourceTimezone: rowString(row, "source_timezone", "Asia/Baghdad"),
    isPrimary: rowBoolean(row, "is_primary"),
    isActive: rowBoolean(row, "is_active", true),
    secretReference: rowNullableString(row, "secret_reference"),
    lastHeartbeatAt: rowNullableString(row, "last_heartbeat_at"),
    lastSuccessAt: rowNullableString(row, "last_success_at"),
  };
}

export function mapAuthorizationSummary(row: GenericRow): TvAuthorizationSummary {
  return {
    id: rowString(row, "id"),
    status: rowString(row, "status", "pending"),
    agreementReference: rowNullableString(row, "agreement_reference"),
    territory: rowString(row, "territory", "Iraq"),
    permittedMonitoring: rowBoolean(row, "permitted_monitoring"),
    permittedRecording: rowBoolean(row, "permitted_recording"),
    permittedClipping: rowBoolean(row, "permitted_clipping"),
    permittedInternalPlayback: rowBoolean(row, "permitted_internal_playback"),
    permittedDownload: rowBoolean(row, "permitted_download"),
    validFrom: rowNullableString(row, "valid_from"),
    validUntil: rowNullableString(row, "valid_until"),
    approvedAt: rowNullableString(row, "approved_at"),
    notes: rowNullableString(row, "notes"),
  };
}

export function mapOccurrenceSummary(row: GenericRow): TvOccurrenceSummary {
  const startedAtUtc = rowNullableString(row, "exact_start_time_utc") ?? rowNullableString(row, "started_at");
  const endedAtUtc = rowNullableString(row, "exact_end_time_utc") ?? rowNullableString(row, "ended_at");
  const durationMs =
    rowNumber(row, "exact_duration_ms") || Math.round((rowNumber(row, "duration_seconds") || 0) * 1000);

  return {
    id: rowString(row, "id"),
    brand: safeText(row.brand_name ?? row.brand ?? row.brand_id, "Unknown"),
    product: safeText(row.product_name ?? row.product ?? row.product_id),
    campaign: safeText(row.campaign_name ?? row.campaign ?? row.campaign_id),
    creative: safeText(row.creative_name ?? row.creative_variant_id ?? row.creative_asset_id),
    confidenceScore:
      typeof row.confidence_score === "number"
        ? row.confidence_score
        : typeof row.confidence === "number"
          ? row.confidence
          : null,
    reviewStatus: safeText(row.review_status ?? row.reviewer_status, "pending"),
    classification: safeText(row.classification ?? row.content_type, "commercial"),
    isFirstSeen: rowBoolean(row, "is_first_seen"),
    startedAtUtc,
    endedAtUtc,
    iraqTimeLabel: toBaghdadDateTime(startedAtUtc),
    durationMs,
    clipStatus: safeText(row.generation_status ?? row.clip_status, "pending"),
  };
}

export function getAuthorizationGateSummary(
  source: TvSourceSummary | null,
  authorization: TvAuthorizationSummary | null,
) {
  const canRecord = authorization
    ? isSourceAuthorizedForRecording({
        authorizationStatus: authorization.status,
        validFrom: authorization.validFrom,
        validUntil: authorization.validUntil,
        permittedMonitoring: authorization.permittedMonitoring,
        permittedRecording: authorization.permittedRecording,
        permittedClipping: authorization.permittedClipping,
      })
    : false;

  return {
    canRecord,
    message: canRecord
      ? "Authorized source is eligible for recording."
      : "Recording is disabled until an authorized broadcast source and monitoring approval are configured.",
    previewAllowed: authorization?.permittedInternalPlayback ?? false,
    sandboxMode: source?.sourceType === "sandbox_fixture",
  };
}
