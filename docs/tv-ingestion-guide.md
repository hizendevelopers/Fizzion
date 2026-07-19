# FizZion TV Ingestion Guide

## Source policy

Only authorized Iraqi linear TV recordings should be treated as verified TV monitoring sources.

## Ingestion stages

1. Validate file integrity and checksum.
2. Inspect media metadata with FFprobe.
3. Persist raw recording metadata and storage key.
4. Generate review proxies and timeline thumbnails.
5. Detect gaps, silence, black screens, and frozen frames.
6. Segment ad breaks and occurrences.
7. Export 5-second pre-context and post-context clips.
8. Route uncertain detections to review.

