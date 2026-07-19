# FizZion Deployment Guide

## Environments

- Local
- Development
- Staging
- Production

## Web deployment

1. Create a Vercel project for `apps/web`.
2. Set environment variables from `.env.example`.
3. Attach the Supabase project and Sentry DSN.
4. Configure production domains and security headers.

## Data plane

1. Provision Supabase.
2. Apply `supabase/migrations/202607160001_initial.sql`.
3. Apply `supabase/seed.sql`.
4. Enable MFA and configure SMTP for auth emails.

## Media and processing plane

1. Provision private S3 or R2 buckets.
2. Create SQS queues and DLQs for TV, social, web, reporting, and ops.
3. Deploy the Media AI FastAPI service to ECS Fargate.
4. Deploy worker services to ECS Fargate with queue-specific entrypoints.
5. Configure EventBridge schedules for website crawls, social sync, and retention jobs.

## Observability

1. Connect Sentry to web, workers, and FastAPI.
2. Configure CloudWatch log groups and alerts.
3. Instrument critical jobs with queue depth and failure alarms.

