# Media Monitoring Platform Report
Date: Thursday, July 23, 2026

## Purpose
This document explains the current platform page by page:

- what each page does
- what input it takes from the user
- what output it shows
- which major features are active
- where the platform is using live/connected data, imported data, uploaded data, or preview/demo data

This report is based on the current implemented routes, UI flows, and data surfaces in the repository as of July 23, 2026.

---

## 1. Global Platform Shell

### Route scope
- Applies across authenticated app pages under `apps/web/src/app/(app)`

### What it does
- Provides the global app layout
- Shows the platform branding strip
- Shows the sticky header/topbar
- Shows the sticky sidebar navigation
- Keeps only the main content area scrollable

### User input
- Global search field
- Date-range shortcut in topbar
- Market selector
- Brand selector
- Campaign selector
- Locale selector
- Timezone selector
- Navigation clicks from sidebar

### Platform output
- Fixed header that stays visible while scrolling
- Fixed sidebar that stays visible while scrolling
- Main content pane that scrolls independently
- Shared navigation access to all intelligence modules

### Current features
- Sticky header
- Sticky sidebar
- Responsive content wrapper
- Shared branded shell styling
- Shared navigation labels from `packages/config/src/navigation.ts`

---

## 2. Executive Overview

### Route
- `/executive-overview`
- alias: `/overview`

### What it does
- Gives leadership a unified cross-platform view across:
  - OOH Intelligence
  - Social Intelligence
  - Web Advertising

### User input
- Current page uses a fixed 30-day overview scope
- Shortcut links into deeper modules

### Platform output
- KPI cards:
  - Connected Data Sources
  - Active Campaigns
  - Total Touchpoints
  - Reported Reach Across Sources
- Channel cards:
  - OOH Intelligence
  - Social Intelligence
  - Web Advertising
- Graphs:
  - Platform Activity Trend
  - Source Health
  - Touchpoints by Channel
  - Share Of Voice by Channel
  - Data Health Breakdown
  - Healthy Source Ratio
- Campaign overview table
- Alerts/data health block
- Recent activity feed

### Data inputs used by platform
- Executive overview aggregate queries from internal records
- Social summary data
- OOH analytics
- Website/ad analytics
- Recent platform activity records

### Output type
- Cross-module KPIs
- Graphs
- Distribution charts
- Health summaries
- Module shortcut cards

### Notes
- This page is DB-backed
- Fake KPI totals are not intentionally hardcoded here

---

## 3. TV Intelligence

### Main route
- `/tv/channels`

### What it does
- Acts as the main TV Intelligence dashboard
- Uses internal tabs instead of sidebar sub-items

### Internal tabs
1. `TV Channels`
2. `YouTube Live Channels`
3. `Ads Detected`

---

### 3.1 TV Channels tab

### What it does
- Shows monitored TV channels in a single operational surface

### Initial connected channels shown
- ARY News
- Geo News
- Hum News

### User input
- Date filter:
  - Today
  - 7 days
  - 14 days
  - 30 days
- Brand filter
- Channel filter
- Advertisement category filter
- Time-slot filter
- Duration band filter
- Media-value band filter
- Reset filters
- Select channel card
- Open detail actions

### Platform output
- KPI cards:
  - Detected advertisements
  - Total ad duration
  - Estimated ad value
  - Top channel
- Graphs:
  - Advertisement occurrences over time
  - Estimated advertising value trend
  - Advertisement duration trend
  - Brand-wise advertisement share
  - Channel-wise advertisement volume
  - Ads by time of day
- Channel cards with:
  - Logo/label
  - Connection status
  - Live/offline status
  - Total detected ads
  - Total duration
  - Estimated value
  - Last detected ad
- Detailed selected-channel section
- Advertisement rows/cards for the selected channel

### Ad-level output
Each ad can show:
- Brand
- Product or campaign
- Channel
- Category
- Detection date/time
- Start and end time labels
- Duration
- Estimated media value
- Occurrence count
- Detection confidence
- Program name
- Transcript
- Thumbnail
- Video clip if available
- View details/report action

### Special Hum News output
- At least one Hum News advertisement is shown
- A playable recorded clip is provided through a preview/sample playback flow

### Current data behavior
- ARY News uses existing TV data layer more directly
- Geo News and Hum News are currently surfaced as monitoring-ready preview cards
- Hum ad playback currently relies on available playable clip/sample evidence instead of a fully universal clip store for every channel

---

### 3.2 YouTube Live Channels tab

### What it does
- Allows users to search and connect YouTube channels
- Shows live, upcoming, and recorded video data for connected channels
- Allows playback inside the platform

### User input
- Search YouTube channels by name or handle
- Connect channel
- Refresh all channels
- Refresh a single connected channel
- Disconnect channel
- Open channel detail
- Filter by:
  - Channel
  - Video status
  - Live/recorded mode

### Platform output
- Connected channel cards
- Pinned live stream section
- Embedded live player
- Embedded recorded/upcoming feed previews
- Graphs:
  - Views over time
  - Channel comparison
  - Upload activity trend
- Stats such as:
  - Subscribers
  - Video count
  - Views
  - Live count
  - Upcoming count
  - Recorded count

### Video-level output
Per video/stream the platform can show:
- Thumbnail
- Video title
- Channel name
- Stream status
- Published time
- Duration label
- Views
- Open original video action
- Embedded playback when supported by YouTube embed

### Data inputs used by platform
- YouTube Data API
- Connected channel records in `tv_youtube_channels`
- Current channel feed fetches

### Notes
- Advanced YouTube analytics like impressions/CTR are only displayable if authorized analytics coverage exists
- Platform avoids fake zero-fill for unsupported advanced metrics

---

### 3.3 Ads Detected tab

### What it does
- Shows all detected TV ads from connected TV monitoring in one central place

### User input
- Brand filter
- Channel filter
- Category filter
- Time-slot filter
- Date scope
- Duration band
- Value band
- Reset filters
- Select ad from list

### Platform output
- Central detected ads list
- Selected ad detail pane with:
  - Playable clip or thumbnail
  - Brand
  - Product/campaign
  - Channel
  - Date/time
  - Duration
  - Media value
  - Confidence
  - Occurrences
  - Transcript
  - View details action
- Graphs:
  - Brand share
  - Top brands
  - Channel distribution

---

### 3.4 TV detail and supporting pages

#### `/tv/channels/[channelId]`
- Channel-specific detail page
- Shows selected channel profile and feed/history

#### `/tv/occurrences`
- TV occurrences listing
- Operational review list of detections

#### `/tv/occurrences/[occurrenceId]`
- Detailed occurrence review page

#### `/tv/review-queue`
- Review queue for occurrence validation/processing

#### `/tv/recordings/[recordingId]`
- Recording-specific review context

#### `/tv/creatives/[creativeId]`
- Creative-level TV detail page

### Supporting admin TV pages
- `/admin/tv/authorizations`
- `/admin/tv/channels`
- `/admin/tv/channels/ary-news`
- `/admin/tv/detection-settings`
- `/admin/tv/queues`
- `/admin/tv/retention`
- `/admin/tv/sources`
- `/admin/tv/workers`

These pages are more operational/admin-facing and support source governance, worker health, queue oversight, and TV monitoring controls.

---

## 4. Social Intelligence

### Main route
- `/social-intelligence`

### What it does
- Acts as the main Social Intelligence workspace
- Uses internal tabs instead of sidebar sub-items

### Internal tabs
1. `Brands`
2. `Influencers`
3. `Report`

---

### 4.1 Brands tab

### What it does
- Shows connected brand social accounts
- Lets the user open a selected brand account in-page
- Supports overview and synchronized content views

### User input
- Duration filter:
  - Today
  - Last 7 days
  - Last 14 days
  - Last 30 days
- Platform filter
- Content-type filter
- Performance filter
- Search query
- Select account
- Switch sub-tab:
  - Overview
  - Content
- Connect account wizard
- Download report

### Platform output
- KPI summary:
  - Accounts in scope
  - Followers
  - Reach
  - Engagements
  - Views
- Connected account cards
- Selected account identity block:
  - Original profile image when returned
  - Name
  - Username
  - Platform
  - Bio
  - Last sync
- Overview graphs:
  - Reach trend
  - Engagement trend
  - Followers growth
  - Views trend
  - Platform performance
  - Content-type performance
- Content sub-tab:
  - Media preview
  - Caption
  - Platform
  - Content type
  - Views
  - Likes
  - Comments
  - Shares
  - Reach
  - Engagement rate
  - Hashtags
  - Open details
  - Open original post

### Inputs used by platform
- Connected social account records
- Imported social content
- Imported metric snapshots
- Apify-backed social scraping flows where configured

### Notes
- Brand tab uses only connected/imported data
- Unsupported metrics remain hidden or unavailable instead of fake-filled

---

### 4.2 Influencers tab

### What it does
- Mirrors the Brands tab structure but uses influencer-like accounts

### User input
- Same filter model as Brands
- Same account selection flow
- Same Overview/Content split

### Platform output
- Influencer account cards
- Selected influencer overview
- Graphs:
  - Reach trend
  - Engagement trend
  - Followers growth
  - Views trend
  - Platform performance
  - Content-type performance
- Content list:
  - Posts
  - Reels/videos
  - Captions
  - Metrics
  - Original post action

### Persona logic
- Current code classifies accounts heuristically using account-type/name text
- If the system identifies an account as creator/influencer-like, it appears here

---

### 4.3 Report tab

### What it does
- Produces a summary reporting layer for connected brand accounts
- Supports download/export

### User input
- Range filter
- Platform filter
- Content type filter
- Performance filter
- Search filter
- Download PDF
- Download CSV

### Platform output
- Executive summary block
- KPI summary:
  - Brands compared
  - Total reach
  - Total engagements
  - Total views
  - Total followers
- Comparison graphs:
  - Reach comparison
  - Engagement comparison
  - Views comparison
  - Followers growth
- Distribution graphs:
  - Platform contribution
  - Brand share
- Best-performing brands section

### Export output
- PDF report
- CSV report

### Current export behavior
- CSV export is supported
- PDF export now exists and produces a structured summary report using current data
- Export respects report type and date-range input at the current implementation level

---

### 4.4 Social detail and supporting pages

#### `/social/accounts`
- Older portfolio-style social accounts listing
- Still useful as a detailed connected-accounts index

#### `/social/accounts/new`
- Account connection page

#### `/social/accounts/[accountId]`
- Deep detail page for one social account
- Shows:
  - account identity
  - detailed KPIs
  - multiple trend charts
  - history table
  - synchronized content feed
  - connection health

#### `/social/content/[postId]`
- Deep content detail page
- Shows media, caption, metrics, comments, and related metadata

#### `/social/comparison`
- Legacy comparison page for social accounts

#### `/social/oauth/callback/[platform]`
- OAuth callback path support where relevant

---

## 5. Web Advertising

### Main route
- `/web-advertising`

### Important note
- This page was explicitly requested to remain unchanged in the recent scope
- It remains one of the current strongest operational dashboards

### What it does
- Monitors websites
- Shows detected advertisement evidence
- Displays scan health and review readiness

### User input
- Search
- Website filter
- Review status filter
- Confidence filter
- Sort option
- Scan Now action
- Open detail pages

### Platform output
- KPI cards
- Website cards
- Operational snapshot
- Graphs:
  - Detection Trend
  - Review Readiness
  - Website Coverage
  - Share Of Voice by Website
  - Review Status Mix
- Advertisement gallery
- Screenshot evidence
- Ad detail actions

### Supporting pages
- `/web-advertising/websites/[websiteId]`
- `/web-advertising/ads/[advertisementId]`

### Alias routes
- `/websites`
- `/websites/[websiteId]`
- `/websites/[websiteId]/gallery`
- `/websites/[websiteId]/history`
- `/websites/ads/[occurrenceId]`

---

## 6. OOH Intelligence

### Main route
- `/ooh-intelligence`

### What it does
- Handles OOH inventory, locations, campaigns, brand mapping, audience data, and uploaded media

### User input
- Asset listing filters from query params
- Open asset detail
- Add new asset/location
- Upload images
- Edit inventory

### Platform output
- OOH inventory client UI
- Asset list
- Analytics summary
- Area data
- Brand data

### Detail routes
- `/ooh-intelligence/assets/new`
- `/ooh-intelligence/assets/[assetId]`
- `/ooh-intelligence/assets/[assetId]/edit`

### Input fields supported in OOH asset form
- Brand
- Location
- Per-day cost
- Start date
- End date
- Size
- Media type
- Picture uploads
- Audience inputs
- Coordinates
- Creative image URL
- Proof-of-play image URL

### Output behavior
- Auto weekly cost
- Auto monthly cost
- Auto campaign budget from daily cost × campaign days
- Uploaded images preview
- Hero image fallback logic on detail pages

### Related OOH pages
- `/ooh/locations`
- `/ooh/locations/new`
- `/ooh/locations/[locationId]`
- `/ooh/map`

---

## 7. Campaigns

### Route
- `/campaigns`

### What it does
- Shows campaign monitoring dashboard for Coke and competitors

### User input
- Open campaign cards
- Review monitoring summaries

### Platform output
- Campaign cards
- Channel contribution graph
- Campaign pressure trend
- SOV visual
- Monitoring/reporting summaries

### Supporting route
- `/campaigns/[campaignId]`

---

## 8. Reports

### Route
- `/reports`

### What it does
- Presents report-oriented monitoring summaries

### User input
- Open report cards
- Review report coverage and output summaries

### Platform output
- Report cards
- Report output trend
- Coverage chart
- Export format badges
- SOV reporting visual

---

## 9. Brands and Competitors

### Route
- `/brands`

### What it does
- Shows monitored brand and competitor intelligence

### User input
- Open portfolio/competitor monitoring views

### Platform output
- Coca-Cola portfolio watchlist
- Competitor watchlist
- Brand touchpoint distribution
- Competitor share split
- Brand domains
- Social handles
- Keywords
- Momentum notes

---

## 10. Products

### Route
- `/products`

### What it does
- Shows Coke and competitor product intelligence catalog

### User input
- Browse products

### Platform output
- Product cards with:
  - Product logo/image
  - Brand
  - Category
  - Volume
  - Channels
  - Touchpoints
  - Share of voice
  - Notes

### Current behavior
- Product page uses visual/logo-backed product cards

---

## 11. Creative Library

### Route
- `/creatives`

### What it does
- Shows creative library preview/monitoring dashboard

### User input
- Browse creatives
- Open creative details

### Platform output
- Creative cards with:
  - Preview thumbnail
  - Brand
  - Product
  - Campaign
  - Media type
  - Duration
  - Occurrences
  - First seen / last seen
  - Tags
  - Approval state

### Supporting route
- `/creatives/[creativeId]`

---

## 12. Alerts

### Route
- `/alerts`

### What it does
- Intended for platform alert monitoring

### Likely output scope
- Operational alerts
- Source-health or monitoring exceptions
- Workflow follow-up items

---

## 13. Data Quality

### Route
- `/data-quality`

### What it does
- Intended for platform data-health inspection

### Output scope
- Missing data checks
- Source inconsistencies
- Quality review surfaces

---

## 14. Settings

### Route
- `/settings`

### What it does
- Settings and preference surface for workspace/user/system controls

### Output scope
- Configuration panels
- Preference controls
- General platform setup

---

## 15. Admin Pages

### Routes
- `/admin/[section]`
- plus the TV admin routes listed above

### What they do
- Administrative and system-governance functions
- Source management
- Worker management
- Queue/detection settings
- Retention settings
- Audit/system controls depending on configured section

---

## 16. Remaining Utility Pages

### `/alerts`
- Monitoring alert surface

### `/data-quality`
- Quality and integrity surface

### `/settings`
- Config/settings surface

### `/overview`
- Alias to executive overview

---

## 17. Platform Inputs Summary

The platform currently accepts these main kinds of input:

### Manual user input
- Search fields
- Filters
- Date ranges
- Brand/channel/platform selectors
- Uploads
- OOH asset form values
- Website configuration values
- Social account connect inputs
- YouTube channel search/connect actions

### Imported/connected input
- Social account profile/content/metrics
- YouTube channel feed/video metadata
- TV occurrence/detection records
- Website scan/ad evidence records
- OOH inventory and image uploads

### System/generated input
- Calculated weekly/monthly OOH cost
- Calculated campaign budget
- Derived engagement values
- Health/freshness states
- Trend aggregations
- SOV distributions

---

## 18. Platform Outputs Summary

The platform currently outputs:

### KPI outputs
- Counts
- Reach
- Engagement
- Views
- Touchpoints
- Source totals
- Ad totals
- Scan totals
- Campaign summaries

### Visualization outputs
- Trend charts
- Category bar charts
- Radial health charts
- Share of Voice bottle visuals
- Coverage distributions

### Evidence/media outputs
- Embedded YouTube live streams
- Embedded YouTube recordings
- TV ad clips or playable preview clips where available
- Social media previews
- OOH uploaded images
- Web advertising screenshots

### Reporting outputs
- CSV social reports
- PDF social reports
- Campaign/report dashboard summaries

---

## 19. Current Data Modes by Module

### Mostly connected/live-backed
- Executive Overview
- Web Advertising
- Social Intelligence connected accounts/content surfaces
- YouTube TV monitoring

### Mixed real + preview/demo support
- TV Intelligence channel layer
- Campaigns
- Reports
- Brands and Competitors
- Products
- Creative Library

### User-upload / user-entered
- OOH Intelligence

---

## 20. Final Summary

At the current state, the platform behaves like a multi-module media monitoring system with:

- a shared enterprise shell
- executive cross-module overview
- TV monitoring with channels, YouTube live monitoring, and ads detected
- social monitoring with brands, influencers, and reporting
- web ad monitoring with scan evidence
- OOH inventory and placement management
- campaign, brand, product, creative, and report intelligence surfaces

The strongest operational modules right now are:

- Web Advertising
- Executive Overview
- Social account detail flows
- YouTube TV monitoring
- OOH upload/intake flow

The pages that currently behave more as monitoring preview/intelligence layers than pure live-source modules are:

- Campaigns
- Reports
- Brands and Competitors
- Products
- Creative Library

If needed, this report can be expanded next into:

1. API-by-API report
2. Database-table report
3. Role/permission report
4. Real-data vs demo-data audit
5. Deployment and environment-variable report
