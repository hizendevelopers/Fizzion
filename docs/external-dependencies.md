# FizZion External Dependencies and Commercial Constraints

## Activation blockers

These capabilities require real credentials, commercial agreements, hardware, or regional infrastructure before production claims can be made.

## Required credentials and services

### Platform infrastructure

- Supabase project
- Vercel project
- AWS account for ECS, SQS, EventBridge, CloudWatch, Secrets Manager, S3 or R2-compatible storage
- Sentry project

### TV intelligence

- Authorized Iraqi linear TV source access
- Iraq-based recording or relay partner
- Potential SRT contribution endpoint
- Upload operator accounts or SFTP credentials

### Social connectors

- Meta app with approved permissions
- YouTube Data API credentials
- YouTube Analytics API credentials for owned channels
- TikTok-approved app and use-case access
- X API credentials
- Any approved third-party monitoring provider used as fallback

### Website intelligence

- Iraq-geolocated proxy or browser node
- Approved traffic-intelligence or ranking source for target site selection

## Legally available social metrics by connection type

### Owned or authorized account

- May expose platform-approved private analytics such as reach, impressions, saves, account growth, and audience metrics
- Exact availability depends on platform scope, account type, permissions, and subscription tier

### Public monitored account

- May expose only public profile fields and public post-level metrics that are genuinely available
- Must render unavailable private metrics as `Not available for this connection type`

## Cannot be delivered without authorization

- Private reach and impression data for competitor accounts
- Direct messages or private audience demographics
- Non-public comments
- Platform-protected analytics outside approved scopes
- TV monitoring from unlicensed or unverified streams presented as verified Iraqi linear TV

## Sandbox data policy

Where credentials are unavailable:

- Build the real connector interface
- Support fixture-based sandbox responses for non-production environments
- Clearly label them as sandbox data
- Never surface sandbox metrics as production truth

