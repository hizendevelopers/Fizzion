import { makeRequestId } from "@/lib/tv-api";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  CAPTURE_ACCESS_TOKEN_TTL_HOURS,
  CAPTURE_REGISTRATION_TTL_MINUTES,
  CAPTURE_UPLOAD_SESSION_TTL_MINUTES,
  buildUploadReference,
  generateAccessToken,
  generateRegistrationCode,
  hashCaptureToken,
  nowPlusHours,
  nowPlusMinutes,
  parseBearerToken,
} from "@/lib/capture-utils";
import type {
  CaptureDeviceApproveInput,
  CaptureDeviceHeartbeatInput,
  CaptureDeviceRegisterInput,
  CaptureUploadAbortInput,
  CaptureUploadCompleteInput,
  CaptureUploadDuplicateInput,
  CaptureUploadInitiateInput,
  CaptureUploadPartUrlInput,
} from "@/lib/capture-schemas";

type GenericRow = Record<string, unknown>;

function rowString(row: GenericRow | null | undefined, key: string, fallback = "") {
  const value = row?.[key];
  return typeof value === "string" ? value : fallback;
}

function rowNullableString(row: GenericRow | null | undefined, key: string) {
  const value = row?.[key];
  return typeof value === "string" ? value : null;
}

function rowBoolean(row: GenericRow | null | undefined, key: string, fallback = false) {
  const value = row?.[key];
  return typeof value === "boolean" ? value : fallback;
}

function rowNumber(row: GenericRow | null | undefined, key: string, fallback = 0) {
  const value = row?.[key];
  return typeof value === "number" ? value : fallback;
}

async function resolveOrganizationAndChannel(organizationSlug: string, channelSlug: string) {
  const supabase = getSupabaseAdminClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", organizationSlug)
    .limit(1)
    .maybeSingle();

  if (!organization) {
    throw new Error(`Organization '${organizationSlug}' was not found.`);
  }

  const { data: channel } = await supabase
    .from("tv_channels")
    .select("id, slug, name, name_en, organization_id")
    .eq("organization_id", organization.id)
    .eq("slug", channelSlug)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!channel) {
    throw new Error(`TV channel '${channelSlug}' was not found for organization '${organizationSlug}'.`);
  }

  return {
    organization: organization as GenericRow,
    channel: channel as GenericRow,
  };
}

async function resolveChannelForOrganizationId(organizationId: string, channelSlug: string) {
  const supabase = getSupabaseAdminClient();
  const { data: channel } = await supabase
    .from("tv_channels")
    .select("id, slug, name, name_en, organization_id")
    .eq("organization_id", organizationId)
    .eq("slug", channelSlug)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!channel) {
    throw new Error(`TV channel '${channelSlug}' was not found for this organization.`);
  }

  return channel as GenericRow;
}

export async function registerCaptureDevice(input: CaptureDeviceRegisterInput) {
  const supabase = getSupabaseAdminClient();
  const { organization, channel } = await resolveOrganizationAndChannel(
    input.organizationSlug,
    input.channelSlug,
  );

  const registrationCode = generateRegistrationCode();
  const registrationHash = hashCaptureToken(registrationCode);
  const expiresAt = nowPlusMinutes(CAPTURE_REGISTRATION_TTL_MINUTES);

  const { data: device, error } = await supabase
    .from("capture_devices")
    .insert({
      organization_id: rowString(organization, "id"),
      device_name: input.deviceName,
      device_type: input.deviceType,
      operating_system: input.operatingSystem,
      agent_version: input.agentVersion,
      assigned_channel_id: rowString(channel, "id"),
      registration_status: "pending_approval",
      current_status: "initializing",
      local_timezone: input.localTimezone,
      capture_folder: input.captureFolder,
      total_disk_bytes: input.totalDiskBytes ?? null,
      available_disk_bytes: input.availableDiskBytes ?? null,
      obs_detected: false,
      chrome_detected: false,
      metadata: {
        channelSlug: input.channelSlug,
        registrationRequestId: makeRequestId(),
      },
    })
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error || !device) {
    throw new Error(error?.message ?? "Capture device registration could not be created.");
  }

  await supabase.from("capture_device_tokens").insert({
    organization_id: rowString(organization, "id"),
    device_id: rowString(device as GenericRow, "id"),
    token_hash: registrationHash,
    token_type: "registration",
    expires_at: expiresAt,
    metadata: {
      channelSlug: input.channelSlug,
    },
  });

  return {
    deviceId: rowString(device as GenericRow, "id"),
    registrationCode,
    registrationExpiresAt: expiresAt,
    organizationId: rowString(organization, "id"),
    assignedChannelId: rowString(channel, "id"),
    assignedChannelSlug: rowString(channel, "slug"),
    registrationStatus: "pending_approval",
  };
}

export async function approveCaptureDevice(input: CaptureDeviceApproveInput) {
  const supabase = getSupabaseAdminClient();
  let device: GenericRow | null = null;
  let organizationId = "";

  if (input.deviceId) {
    const { data } = await supabase
      .from("capture_devices")
      .select("*")
      .eq("id", input.deviceId)
      .limit(1)
      .maybeSingle();
    device = (data as GenericRow | null) ?? null;
  } else if (input.registrationCode) {
    const tokenHash = hashCaptureToken(input.registrationCode);
    const { data: token } = await supabase
      .from("capture_device_tokens")
      .select("device_id, organization_id, expires_at, revoked_at")
      .eq("token_hash", tokenHash)
      .eq("token_type", "registration")
      .is("revoked_at", null)
      .limit(1)
      .maybeSingle();

    if (token && rowNullableString(token as GenericRow, "expires_at")) {
      const expiresAt = new Date(rowString(token as GenericRow, "expires_at"));
      if (expiresAt.getTime() < Date.now()) {
        throw new Error("Registration code has expired.");
      }
    }

    if (token?.device_id) {
      organizationId = token.organization_id;
      const { data } = await supabase
        .from("capture_devices")
        .select("*")
        .eq("id", token.device_id)
        .limit(1)
        .maybeSingle();
      device = (data as GenericRow | null) ?? null;
    }
  }

  if (!device) {
    throw new Error("Capture device registration request was not found.");
  }

  organizationId ||= rowString(device, "organization_id");

  const channel = await resolveChannelForOrganizationId(organizationId, input.assignChannelSlug);
  const accessToken = generateAccessToken();
  const accessHash = hashCaptureToken(accessToken);
  const expiresAt = nowPlusHours(CAPTURE_ACCESS_TOKEN_TTL_HOURS);

  await supabase
    .from("capture_devices")
    .update({
      assigned_channel_id: rowString(channel, "id"),
      registration_status: "approved",
      current_status: "ready",
      revoked_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rowString(device, "id"));

  await supabase
    .from("capture_device_tokens")
    .update({
      revoked_at: new Date().toISOString(),
    })
    .eq("device_id", rowString(device, "id"))
    .eq("token_type", "registration")
    .is("revoked_at", null);

  await supabase.from("capture_device_tokens").insert({
    organization_id: organizationId,
    device_id: rowString(device, "id"),
    token_hash: accessHash,
    token_type: "access",
    expires_at: expiresAt,
    metadata: {
      assignedChannelSlug: input.assignChannelSlug,
    },
  });

  return {
    deviceId: rowString(device, "id"),
    assignedChannelId: rowString(channel, "id"),
    assignedChannelSlug: rowString(channel, "slug"),
    accessToken,
    tokenExpiresAt: expiresAt,
    registrationStatus: "approved",
    currentStatus: "ready",
  };
}

export async function revokeCaptureDevice(deviceId: string, reason?: string) {
  const supabase = getSupabaseAdminClient();
  const revokedAt = new Date().toISOString();

  await supabase
    .from("capture_devices")
    .update({
      registration_status: "revoked",
      current_status: "failed",
      revoked_at: revokedAt,
      updated_at: revokedAt,
      metadata: {
        revokedReason: reason ?? null,
      },
    })
    .eq("id", deviceId);

  await supabase
    .from("capture_device_tokens")
    .update({
      revoked_at: revokedAt,
    })
    .eq("device_id", deviceId)
    .is("revoked_at", null);

  return {
    deviceId,
    revokedAt,
  };
}

export async function authenticateCaptureDevice(request: Request) {
  const supabase = getSupabaseAdminClient();
  const token = parseBearerToken(request);
  if (!token) {
    throw new Error("Capture device bearer token is required.");
  }

  const tokenHash = hashCaptureToken(token);
  const { data: tokenRow } = await supabase
    .from("capture_device_tokens")
    .select("device_id, organization_id, expires_at, revoked_at, token_type")
    .eq("token_hash", tokenHash)
    .eq("token_type", "access")
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  if (!tokenRow) {
    throw new Error("Capture device token is invalid.");
  }

  const expiresAt = new Date(rowString(tokenRow as GenericRow, "expires_at"));
  if (expiresAt.getTime() < Date.now()) {
    throw new Error("Capture device token has expired.");
  }

  const { data: device } = await supabase
    .from("capture_devices")
    .select("*")
    .eq("id", tokenRow.device_id)
    .limit(1)
    .maybeSingle();

  if (!device || rowNullableString(device as GenericRow, "revoked_at")) {
    throw new Error("Capture device is not active.");
  }

  await supabase
    .from("capture_device_tokens")
    .update({
      last_used_at: new Date().toISOString(),
    })
    .eq("token_hash", tokenHash)
    .eq("token_type", "access");

  return {
    tokenHash,
    device: device as GenericRow,
    organizationId: rowString(device as GenericRow, "organization_id"),
    deviceId: rowString(device as GenericRow, "id"),
    channelId: rowNullableString(device as GenericRow, "assigned_channel_id"),
  };
}

export async function recordCaptureHeartbeat(request: Request, input: CaptureDeviceHeartbeatInput) {
  const supabase = getSupabaseAdminClient();
  const auth = await authenticateCaptureDevice(request);
  const recordedAt = new Date().toISOString();
  const currentUploadId = input.currentUploadId ?? null;

  await supabase.from("capture_device_heartbeats").insert({
    organization_id: auth.organizationId,
    device_id: auth.deviceId,
    status: input.status,
    obs_running: input.obsRunning,
    chrome_running: input.chromeRunning,
    disk_free_bytes: input.diskFreeBytes ?? input.availableDiskBytes ?? null,
    pending_files: input.pendingFiles,
    current_upload_id: currentUploadId,
    payload: input.payload,
    recorded_at: recordedAt,
  });

  await supabase
    .from("capture_devices")
    .update({
      current_status: input.status,
      obs_detected: input.obsRunning,
      chrome_detected: input.chromeRunning,
      available_disk_bytes: input.availableDiskBytes ?? input.diskFreeBytes ?? null,
      total_disk_bytes: input.totalDiskBytes ?? null,
      capture_folder: input.captureFolder ?? rowNullableString(auth.device, "capture_folder"),
      last_heartbeat_at: recordedAt,
      last_seen_ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      updated_at: recordedAt,
    })
    .eq("id", auth.deviceId);

  return {
    deviceId: auth.deviceId,
    recordedAt,
    status: input.status,
  };
}

export async function listCaptureDevices() {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("capture_devices")
    .select("*")
    .order("updated_at", { ascending: false });

  return ((data ?? []) as GenericRow[]).map((row) => ({
    id: rowString(row, "id"),
    organizationId: rowString(row, "organization_id"),
    assignedChannelId: rowNullableString(row, "assigned_channel_id"),
    deviceName: rowString(row, "device_name"),
    deviceType: rowString(row, "device_type"),
    operatingSystem: rowString(row, "operating_system"),
    agentVersion: rowNullableString(row, "agent_version"),
    registrationStatus: rowString(row, "registration_status"),
    currentStatus: rowString(row, "current_status"),
    localTimezone: rowString(row, "local_timezone", "Asia/Baghdad"),
    captureFolder: rowNullableString(row, "capture_folder"),
    availableDiskBytes: rowNumber(row, "available_disk_bytes", 0),
    totalDiskBytes: rowNumber(row, "total_disk_bytes", 0),
    obsDetected: rowBoolean(row, "obs_detected"),
    chromeDetected: rowBoolean(row, "chrome_detected"),
    lastHeartbeatAt: rowNullableString(row, "last_heartbeat_at"),
    revokedAt: rowNullableString(row, "revoked_at"),
    createdAt: rowNullableString(row, "created_at"),
    updatedAt: rowNullableString(row, "updated_at"),
  }));
}

export async function getCaptureDevice(deviceId: string) {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("capture_devices")
    .select("*")
    .eq("id", deviceId)
    .limit(1)
    .maybeSingle();

  return (data as GenericRow | null) ?? null;
}

export async function getCaptureDeviceHealth(deviceId: string) {
  const supabase = getSupabaseAdminClient();
  const { data: device } = await supabase
    .from("capture_devices")
    .select("*")
    .eq("id", deviceId)
    .limit(1)
    .maybeSingle();

  if (!device) {
    return null;
  }

  const { data: heartbeat } = await supabase
    .from("capture_device_heartbeats")
    .select("*")
    .eq("device_id", deviceId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    deviceId,
    deviceName: rowString(device as GenericRow, "device_name"),
    registrationStatus: rowString(device as GenericRow, "registration_status"),
    currentStatus: rowString(device as GenericRow, "current_status"),
    lastHeartbeatAt: rowNullableString(device as GenericRow, "last_heartbeat_at"),
    obsDetected: rowBoolean(device as GenericRow, "obs_detected"),
    chromeDetected: rowBoolean(device as GenericRow, "chrome_detected"),
    captureFolder: rowNullableString(device as GenericRow, "capture_folder"),
    heartbeat: heartbeat
      ? {
          status: rowString(heartbeat as GenericRow, "status"),
          recordedAt: rowString(heartbeat as GenericRow, "recorded_at"),
          diskFreeBytes: rowNumber(heartbeat as GenericRow, "disk_free_bytes", 0),
          pendingFiles: rowNumber(heartbeat as GenericRow, "pending_files", 0),
          currentUploadId: rowNullableString(heartbeat as GenericRow, "current_upload_id"),
          payload: (heartbeat as GenericRow).payload ?? {},
        }
      : null,
  };
}

export async function checkCaptureUploadDuplicate(request: Request, input: CaptureUploadDuplicateInput) {
  const supabase = getSupabaseAdminClient();
  const auth = await authenticateCaptureDevice(request);
  const channelId = auth.channelId;

  if (!channelId) {
    throw new Error("Capture device is not assigned to a TV channel.");
  }

  const { data } = await supabase
    .from("tv_recording_files")
    .select("id, filename, start_time_utc, end_time_utc, checksum_sha256, file_size_bytes, processing_status")
    .eq("channel_id", channelId)
    .eq("checksum_sha256", input.sha256)
    .limit(1)
    .maybeSingle();

  return {
    duplicate: Boolean(data),
    recording: data ?? null,
  };
}

export async function initiateCaptureUpload(request: Request, input: CaptureUploadInitiateInput) {
  const supabase = getSupabaseAdminClient();
  const auth = await authenticateCaptureDevice(request);
  const channelId = auth.channelId;

  if (!channelId) {
    throw new Error("Capture device is not assigned to a TV channel.");
  }

  const duplicate = await checkCaptureUploadDuplicate(request, {
    channelSlug: input.channelSlug,
    sha256: input.sha256,
    fileSizeBytes: input.fileSizeBytes,
    sourceStartTime: input.sourceStartTime,
    durationMs: input.durationMs,
  });

  if (duplicate.duplicate) {
    return {
      duplicate: true,
      recording: duplicate.recording,
    };
  }

  const expiresAt = nowPlusMinutes(CAPTURE_UPLOAD_SESSION_TTL_MINUTES);
  const uploadReference = buildUploadReference(auth.deviceId, input.filename);
  const { data: session, error } = await supabase
    .from("tv_upload_sessions")
    .insert({
      organization_id: auth.organizationId,
      device_id: auth.deviceId,
      channel_id: channelId,
      filename: input.filename,
      file_size_bytes: input.fileSizeBytes,
      sha256: input.sha256,
      multipart_upload_reference: uploadReference,
      status: "initialized",
      uploaded_bytes: 0,
      expires_at: expiresAt,
      metadata: {
        sourceStartTime: input.sourceStartTime,
        sourceEndTime: input.sourceEndTime ?? null,
        sourceTimezone: input.sourceTimezone,
        durationMs: input.durationMs,
        timestampConfidence: input.timestampConfidence,
      },
    })
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error || !session) {
    throw new Error(error?.message ?? "TV upload session could not be created.");
  }

  return {
    duplicate: false,
    uploadSessionId: rowString(session as GenericRow, "id"),
    status: rowString(session as GenericRow, "status"),
    multipartUploadReference: rowNullableString(session as GenericRow, "multipart_upload_reference"),
    expiresAt,
    recommendedChunkBytes: 8 * 1024 * 1024,
  };
}

export async function getCaptureUploadPartTarget(request: Request, input: CaptureUploadPartUrlInput) {
  const supabase = getSupabaseAdminClient();
  const auth = await authenticateCaptureDevice(request);
  const { data: session } = await supabase
    .from("tv_upload_sessions")
    .select("*")
    .eq("id", input.uploadSessionId)
    .eq("device_id", auth.deviceId)
    .limit(1)
    .maybeSingle();

  if (!session) {
    throw new Error("TV upload session was not found.");
  }

  await supabase
    .from("tv_upload_sessions")
    .update({
      status: "uploading",
    })
    .eq("id", input.uploadSessionId);

  return {
    uploadSessionId: input.uploadSessionId,
    partNumber: input.partNumber,
    status: "uploading",
    uploadStrategy: "phase1_metadata_only",
    partHeaders: {
      "x-fizzion-upload-session": input.uploadSessionId,
      "x-fizzion-part-number": String(input.partNumber),
    },
  };
}

export async function completeCaptureUpload(request: Request, input: CaptureUploadCompleteInput) {
  const supabase = getSupabaseAdminClient();
  const auth = await authenticateCaptureDevice(request);
  const completedAt = new Date().toISOString();
  const { data: session } = await supabase
    .from("tv_upload_sessions")
    .select("*")
    .eq("id", input.uploadSessionId)
    .eq("device_id", auth.deviceId)
    .limit(1)
    .maybeSingle();

  if (!session) {
    throw new Error("TV upload session was not found.");
  }

  await supabase
    .from("tv_upload_sessions")
    .update({
      status: "completed",
      uploaded_bytes: input.uploadedBytes,
      storage_key: input.storageKey,
      completed_at: completedAt,
      metadata: {
        ...(((session as GenericRow).metadata as Record<string, unknown> | null) ?? {}),
        parts: input.parts,
      },
    })
    .eq("id", input.uploadSessionId);

  return {
    uploadSessionId: input.uploadSessionId,
    status: "completed",
    completedAt,
  };
}

export async function abortCaptureUpload(request: Request, input: CaptureUploadAbortInput) {
  const supabase = getSupabaseAdminClient();
  const auth = await authenticateCaptureDevice(request);

  await supabase
    .from("tv_upload_sessions")
    .update({
      status: "aborted",
      metadata: {
        abortReason: input.reason ?? null,
      },
    })
    .eq("id", input.uploadSessionId)
    .eq("device_id", auth.deviceId);

  return {
    uploadSessionId: input.uploadSessionId,
    status: "aborted",
  };
}

export async function createCaptureRecordingFromUploadSession(uploadSessionId: string) {
  const supabase = getSupabaseAdminClient();
  const { data: session } = await supabase
    .from("tv_upload_sessions")
    .select("*")
    .eq("id", uploadSessionId)
    .limit(1)
    .maybeSingle();

  if (!session) {
    throw new Error("TV upload session was not found.");
  }

  const metadata = (((session as GenericRow).metadata as Record<string, unknown> | null) ?? {});
  const sourceStartTime = typeof metadata.sourceStartTime === "string"
    ? metadata.sourceStartTime
    : new Date().toISOString();
  const sourceEndTime = typeof metadata.sourceEndTime === "string"
    ? metadata.sourceEndTime
    : null;
  const durationMs = typeof metadata.durationMs === "number" ? metadata.durationMs : 0;
  const sourceTimezone = typeof metadata.sourceTimezone === "string" ? metadata.sourceTimezone : "Asia/Baghdad";
  const timestampConfidence = typeof metadata.timestampConfidence === "string"
    ? metadata.timestampConfidence
    : "unknown";

  const { data: existing } = await supabase
    .from("tv_recording_files")
    .select("id")
    .eq("channel_id", rowString(session as GenericRow, "channel_id"))
    .eq("checksum_sha256", rowString(session as GenericRow, "sha256"))
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return {
      recordingFileId: existing.id,
      created: false,
    };
  }

  const start = new Date(sourceStartTime);
  const end = sourceEndTime
    ? new Date(sourceEndTime)
    : new Date(start.getTime() + durationMs);

  const { data: recording, error } = await supabase
    .from("tv_recording_files")
    .insert({
      organization_id: rowString(session as GenericRow, "organization_id"),
      channel_id: rowString(session as GenericRow, "channel_id"),
      capture_device_id: rowString(session as GenericRow, "device_id"),
      storage_key: rowNullableString(session as GenericRow, "storage_key") ?? rowString(session as GenericRow, "multipart_upload_reference"),
      filename: rowString(session as GenericRow, "filename"),
      source_timestamp: sourceStartTime,
      source_start_time: sourceStartTime,
      source_end_time: end.toISOString(),
      source_timezone: sourceTimezone,
      start_time_utc: start.toISOString(),
      end_time_utc: end.toISOString(),
      duration_seconds: durationMs > 0 ? durationMs / 1000 : null,
      duration_ms: durationMs || null,
      file_size_bytes: rowNumber(session as GenericRow, "file_size_bytes", 0),
      checksum_sha256: rowString(session as GenericRow, "sha256"),
      upload_mode: "local_laptop_capture",
      source_type: "local_laptop_capture",
      validation_status: "pending",
      integrity_status: "pending",
      processing_status: "received",
      timestamp_confidence: timestampConfidence,
      media_metadata: {
        uploadSessionId,
      },
      quality_summary: {},
    })
    .select("id")
    .limit(1)
    .maybeSingle();

  if (error || !recording?.id) {
    throw new Error(error?.message ?? "TV recording file could not be created from upload session.");
  }

  await supabase.from("tv_processing_jobs").insert({
    organization_id: rowString(session as GenericRow, "organization_id"),
    channel_id: rowString(session as GenericRow, "channel_id"),
    capture_device_id: rowString(session as GenericRow, "device_id"),
    recording_file_id: recording.id,
    job_type: "tv-recording-validate",
    queue_name: "tv-recording-validate",
    status: "queued",
    attempts: 0,
    payload: {
      uploadSessionId,
      recordingFileId: recording.id,
    },
    worker_version: "phase1-foundation",
  });

  return {
    recordingFileId: recording.id,
    created: true,
  };
}
