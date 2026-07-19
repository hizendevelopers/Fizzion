# ARY News TV Queue Contracts

## Queues

- `tv-recording-validate`
- `tv-recording-proxy`
- `tv-ad-break-detect`
- `tv-ad-candidate-classify`
- `tv-creative-match`
- `tv-occurrence-clip-generate`
- `tv-thumbnail-generate`
- `tv-review-reprocess`
- `tv-retention-cleanup`
- `tv-alert-dispatch`

## Shared payload fields

- `organizationId`
- `channelId`
- `sourceId`
- `recordingFileId`
- `occurrenceId`
- `jobType`
- `idempotencyKey`
- `requestedAt`
- `workerVersion`

## Operational rules

- all consumers must be idempotent
- retries must not create duplicate occurrence rows
- failed jobs go to dead-letter queues after max receive count
- each processing job row stores queue, attempt count, worker version, and last error
