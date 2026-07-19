# FizZion Navigation Map

## Global shell

- Left sidebar
  - Executive Overview
  - TV Intelligence
  - Social Intelligence
  - Web Advertising
  - OOH Intelligence
  - Creative Library
  - Campaigns
  - Brands and Competitors
  - Reports
  - Alerts
  - Data Quality
  - Administration
- Header
  - Global search
  - Date range
  - Market selector
  - Brand selector
  - Campaign selector
  - Language selector
  - Time-zone indicator
  - Data freshness
  - Notifications
  - User profile

## Routes

- `/login`
- `/forgot-password`
- `/mfa`
- `/overview`
- `/tv/channels`
- `/tv/channels/[channelId]`
- `/tv/recordings/[recordingId]`
- `/tv/occurrences`
- `/tv/creatives/[creativeId]`
- `/tv/review-queue`
- `/social/accounts`
- `/social/accounts/new`
- `/social/oauth/callback/[platform]`
- `/social/accounts/[accountId]`
- `/social/content/[postId]`
- `/social/comparison`
- `/websites`
- `/websites/[websiteId]`
- `/websites/[websiteId]/gallery`
- `/websites/[websiteId]/history`
- `/websites/ads/[occurrenceId]`
- `/ooh/map`
- `/ooh/locations`
- `/ooh/locations/[locationId]`
- `/ooh/locations/new`
- `/creatives`
- `/creatives/[creativeId]`
- `/brands`
- `/products`
- `/campaigns`
- `/campaigns/[campaignId]`
- `/reports`
- `/alerts`
- `/data-quality`
- `/admin/users`
- `/admin/roles`
- `/admin/integrations`
- `/admin/sources`
- `/admin/retention`
- `/admin/audit-logs`
- `/admin/system-health`
- `/settings`

## Information architecture principles

- Dashboards focus on decision-making and health, not raw table dumps.
- Detail pages keep provenance and operational context visible.
- Review flows keep ambiguous detections separate from executive reporting.
- Filters must serialize into the URL for shareable views.

