# FizZion Workers

Queue-driven workers run outside Vercel and handle TV ingestion, FFmpeg processing, crawling, reporting, and operational jobs.

Each worker is designed for ECS Fargate deployment and SQS-triggered execution.

## ARY News TV workers

- `tv_recorder`: long-running recorder supervisor and heartbeat loop
- `recording_validator`: FFprobe, checksum, corruption, black/freeze/silence checks
- `ad_break_detector`: commercial-break and ad-candidate detection
- `creative_matcher`: fingerprint and creative-identity matching
- `ai_classifier`: OCR, transcript, logo, and product evidence
- `clip_generator`: five-second-context clip generation and derivatives
- `retention_worker`: lifecycle and legal-hold-aware cleanup
