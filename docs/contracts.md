# FizZion API and Worker Contracts

## Core principles

- Every long-running job is asynchronous and queue-backed.
- Every ingestion action is idempotent.
- Every source record includes provenance, processing version, and reviewer lineage.

## Application API domains

### Auth and identity

- `POST /api/auth/invite`
- `POST /api/auth/mfa/verify`
- `GET /api/me`

### Executive and search

- `GET /api/overview`
- `GET /api/search`
- `POST /api/saved-views`

### TV

- `POST /api/tv/uploads/presign`
- `POST /api/tv/uploads/complete`
- `GET /api/tv/channels`
- `GET /api/tv/channels/:id`
- `GET /api/tv/occurrences`
- `POST /api/tv/review-actions`
- `POST /api/tv/clips/:occurrenceId/sign`

### Social

- `POST /api/social/accounts/resolve`
- `POST /api/social/accounts`
- `GET /api/social/accounts`
- `GET /api/social/accounts/:id`
- `POST /api/social/oauth/:platform/start`
- `GET /api/social/oauth/:platform/callback`

### Websites

- `GET /api/websites`
- `GET /api/websites/:id`
- `GET /api/websites/:id/gallery`
- `POST /api/websites/:id/crawl`

### OOH

- `GET /api/ooh/locations`
- `POST /api/ooh/locations`
- `GET /api/ooh/locations/:id`
- `POST /api/ooh/assignments`

### Reports and alerts

- `GET /api/reports`
- `POST /api/reports`
- `GET /api/alerts`
- `POST /api/alerts/:id/acknowledge`

## Queue contracts

### `tv.recording.received`

```json
{
  "recordingFileId": "uuid",
  "organizationId": "uuid",
  "channelId": "uuid",
  "storageKey": "tv/raw/channel_slug/2026-07-16/file.mp4",
  "sourceTimestamp": "2026-07-16T09:00:00Z",
  "checksumSha256": "hex",
  "ingestionMode": "multipart_upload"
}
```

### `tv.recording.process`

```json
{
  "recordingFileId": "uuid",
  "proxyProfile": "review-low",
  "thumbnailProfile": "timeline-v1",
  "processingVersion": "tv-pipeline-1"
}
```

### `tv.ad.detect`

```json
{
  "recordingFileId": "uuid",
  "channelId": "uuid",
  "organizationId": "uuid",
  "evidenceModes": ["audio_fingerprint", "ocr", "visual_hash", "stt"],
  "contextPaddingSeconds": 5
}
```

### `social.sync.requested`

```json
{
  "socialAccountId": "uuid",
  "connectionId": "uuid",
  "syncMode": "incremental",
  "requestedAt": "2026-07-16T10:00:00Z"
}
```

### `website.crawl.requested`

```json
{
  "websiteId": "uuid",
  "crawlConfigId": "uuid",
  "browserProfileId": "uuid",
  "geoRegion": "IQ",
  "scheduledFor": "2026-07-16T10:15:00Z"
}
```

### `report.run.requested`

```json
{
  "reportId": "uuid",
  "reportRunId": "uuid",
  "requestedBy": "uuid",
  "format": "pdf"
}
```

## TV source and Iraq partner contract

Required fields per delivery:

- Channel identifier
- Source-local timestamp
- IANA timezone string
- Recording duration
- File checksum
- Delivery manifest ID
- Source partner ID
- Upload completion signal

Required partner controls:

- Iraq-side rolling backup for at least 72 hours
- Time synchronization policy
- Escalation contact path
- Missed-upload SLA
- Permitted source and licensing attestation

