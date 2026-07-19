# ARY News TV External Dependencies

## Required before live production activation

- authorized ARY News live feed or exact licensed simulcast
- source agreement permitting recording, clipping, internal playback, and retention
- AWS or R2 media buckets
- SQS queues and DLQs
- ECS worker deployment
- Secrets Manager entry for source access
- OCR / STT / AI provider credentials if AI classification is enabled

## Safe fallback dependencies already supported

- sandbox fixture source
- manual upload
- partner upload metadata

## Current blocker states

- if no authorized feed exists, the channel remains in `awaiting_authorized_feed`
- recording APIs refuse to start live capture until approval is configured
