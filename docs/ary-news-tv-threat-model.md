# ARY News TV Threat Model

## Primary risks

- unauthorized source recording
- leaked source credentials
- permanent public clip URLs
- shell injection through FFmpeg command construction
- replayed upload completion requests creating duplicate segments
- unauthorized partner visibility across channels
- clip download by viewers without permission
- malformed manifests poisoning timeline metadata

## Controls

- authorization gate before recorder start
- server-side secret resolution only
- signed URLs with TTL
- structured FFmpeg command arguments rather than shell concatenation
- idempotency keys on upload and processing writes
- RLS by organization and role
- audit logs for downloads, review actions, source changes, and authorization changes
- deterministic sandbox labels to avoid production confusion
