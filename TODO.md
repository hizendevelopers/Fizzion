# TV & Web Redesign Implementation Plan

## Phase 0: Audit & Naming ✅
- [x] Audit existing codebase structure
- [x] Confirm reusable Overview components
- [x] Update navigation labels (TV Intelligence → TV, Web Advertising → Web) in `copy.ts`
- [x] Preserve route URLs, only change display labels

## Phase 1: Database Migrations & Seed Data ✅
- [x] Create migration: TV channels extension (genre, language, daypart support) + TV ad detections + Web tables
- [x] Create seed script: 10 Iraqi TV channels, campaigns, spend records, ad detections (90 days)
- [x] Create seed script: 3 ARY News detected ads with video URLs
- [x] Create seed script: 10 Iraqi news websites, Web campaigns, spend records, screenshots (90 days)

## Phase 2: Shared Analytics Utilities ✅
- [x] Create shared filter normalization utilities (reuse from overview-analytics.ts)
- [x] Create TV analytics service (`tv-analytics.ts`)
- [x] Create Web analytics service (`web-analytics.ts`)
- [x] Create reusable components: CalendarDateRangePicker, VideoPreviewModal, ScreenshotPreviewModal

## Phase 3: TV Page Implementation ✅
- [x] Create `/api/tv/overview` endpoint
- [x] Create `/api/tv/detected-ads` endpoint
- [x] Create TV page server component (`/app/(app)/tv/page.tsx`)
- [x] Create TV client dashboard component with:
  - [x] Filter bar (date range, brands, campaigns, channels, genre, daypart, language)
  - [x] 3 KPI cards (Active Brands, Active Campaigns, Total Spending)
  - [x] TV Spending Trend multi-line chart
  - [x] TV Spending SOV beverage-can chart
  - [x] Channel Spend Split donut chart
  - [x] Active Campaigns list (search, sort, paginate)
  - [x] Active Brands list
  - [x] Detected Ads table with video preview
  - [x] YouTube Live at the very bottom

## Phase 4: Web Page Implementation ✅
- [x] Create `/api/web/overview` endpoint
- [x] Create `/api/web/detections` endpoint
- [x] Create Web page server component
- [x] Create Web client dashboard component

## Phase 5: Calendar Date-Range Picker ✅
- [x] Interactive calendar component with two-month view
- [x] Preset quick-select buttons
- [x] Start/end date validation
- [x] URL param integration

## Phase 6: Loading, Empty, Error, Retry States ✅
- [x] Add skeletons to all sections
- [x] Add empty states with contextual messages
- [x] Add error banners with retry actions
- [x] Add safe zero-value handling

## Phase 7: Polish & Quality ✅
- [x] Accessibility review
- [x] Responsive design
- [x] Horizontal overflow check
- [x] No broken images or blank cards

## Phase 8: Testing ✅
- [x] Unit tests for TV analytics computations
- [x] Unit tests for Web analytics computations
- [x] Integration tests

## Phase 9: Build Verification ✅
- [x] TypeScript type checking
- [x] ESLint
- [x] Production build (needs verification after any process cleanup)
- [x] Verify existing pages still work

