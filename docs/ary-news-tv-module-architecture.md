# ARY News TV Module Architecture

## Scope

This architecture extends FizZion with a production-oriented ARY News TV monitoring module that supports:

- authorized live source onboarding through secret references
- authorization gating before recording can start
- sandbox and manual upload fallback while authorization is pending
- continuous recording outside Vercel
- recording validation and operational telemetry
- advertisement occurrence detection, review, and clip generation
- signed internal playback without exposing source credentials

## Runtime split

### Vercel / Next.js

- authenticated workspace UI
- admin configuration pages
- short-lived application APIs
- signed upload initiation and completion orchestration
- signed clip playback URLs
- operational dashboards for channel health, timeline, occurrences, and review

### Supabase

- normalized metadata storage
- row level security
- audit logs
- realtime status updates
- saved views and notification records

### ECS / container workers

- recorder supervisor
- recording validator
- ad-break detector
- creative matcher
- AI classifier
- clip generator
- retention worker

### AWS supporting services

- S3 or R2 private object storage for raw and derived media
- SQS queues plus dead-letter queues
- EventBridge reconciliation schedules
- Secrets Manager references for source credentials
- CloudWatch logs and alarms

## High-level component map

1. Admin configures `tv_channel`, `tv_source`, authorization, thresholds, and detection settings.
2. Recorder worker resolves source secrets server-side and refuses to record until authorization is approved.
3. Recorder rotates media into timestamped segments and uploads them privately.
4. Validation worker probes each segment, records media quality signals, and emits timeline health.
5. Detection workers produce break candidates, ad candidates, evidence, creative matches, and occurrence records.
6. Clip generator creates a five-second-context occurrence clip and derivative assets.
7. Next.js surfaces health, timeline, occurrences, review actions, and exports through authenticated APIs.

## Authorized-source gate

Recording is disabled unless all of the following are true:

- `tv_sources.is_active = true`
- `tv_sources.authorization_status = 'approved'`
- there is a current authorization row with `status = 'approved'`
- current time is inside the authorization validity window if defined
- the source type is one of the approved adapters or an explicitly labeled sandbox fixture

## Sandbox mode

Until an ARY News source is formally authorized, the module operates in one of two safe modes:

- `sandbox_fixture`: deterministic fixture records labeled as synthetic
- `manual_upload`: partner or admin uploads files for validation and review

Neither mode claims to be live ARY News production monitoring.

## Security boundaries

- raw source URLs never reach the browser
- only secret references are stored in PostgreSQL
- clips are served through short-lived signed URLs
- admin actions that affect recording, authorization, or review write audit rows
- partner uploaders are isolated to assigned channels

## Initial implementation slice

This repo update covers:

- ARY-specific schema extensions
- queue, source-adapter, threat-model, and API contract docs
- ARY seed channel and pending authorization records
- channel, source, authorization, and occurrence APIs
- ARY channel detail, occurrence list/detail, and TV admin surfaces
- sandbox-aware UI states for awaiting authorized feed

Live feed recording remains blocked until a genuinely authorized source is configured and tested.
