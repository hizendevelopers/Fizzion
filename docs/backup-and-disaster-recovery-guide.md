# FizZion Backup and Disaster Recovery Guide

## Minimum controls

- Regular Postgres backups from Supabase
- Replicated object storage with lifecycle controls
- Recovery drills for queue consumers and worker redeployments
- Documented secret-rotation process

## Restore checklist

1. Restore database to a point-in-time snapshot.
2. Validate media object availability and checksums.
3. Restore worker and API environment variables.
4. Replay required queue jobs if derived assets are missing.

