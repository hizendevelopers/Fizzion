# Social Intelligence Module - Implementation Progress

## Phase 1: Foundation ✅
- [x] Create Apify client singleton (`src/lib/apify/client.ts`)
- [x] Create Actor ID constants (`src/lib/apify/actors.ts`)
- [x] Create Apify service (`src/lib/apify/apify-service.ts`)
- [x] Create platform input builders (tiktok, instagram, youtube, facebook)
- [x] Create normalization utilities (common + per-platform)
- [x] Create metric calculation helpers (`src/lib/apify/metrics.ts`)
- [x] Create unified provider interface (`src/lib/apify/unified-provider.ts`)

## Phase 2: Database Migration
- [ ] Create migration: social_profiles, social_content_metrics, indexes
- [ ] Add RLS policies for new tables
- [ ] Create seed data for new tables

## Phase 3: Backend Integration
- [ ] Update `social-utils.ts` - enhanced normalization with SSRF protection
- [ ] Update `social-schemas.ts` - new schemas for Apify workflow
- [ ] Create social-sync-utils.ts - sync workflow
- [ ] Update API routes for full Apify sync workflow
- [ ] Add sync-status API route
- [ ] Add profile/metrics API routes

## Phase 4: Frontend Components
- [ ] Create import-progress component
- [ ] Create content-grid component
- [ ] Create content-table component
- [ ] Create social-profile-header component
- [ ] Create hashtag-report-view component
- [ ] Update connect-account-wizard with Apify workflow
- [ ] Update dashboard page with real data
- [ ] Update account analytics page
- [ ] Update content detail page

## Phase 5: Reports & Export
- [ ] Create PDF report generation
- [ ] Enhanced CSV export
- [ ] Hashtag reports
- [ ] Portfolio reports

## Phase 6: Testing
- [ ] Unit tests for normalization
- [ ] Unit tests for input builders
- [ ] Unit tests for metric calculations
- [ ] Integration tests with mocked Apify

## Phase 7: Final Verification
- [ ] Run lint
- [ ] Run typecheck
- [ ] Run tests
- [ ] Run build

