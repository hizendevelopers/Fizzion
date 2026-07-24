# Overview Page — Implementation Todo

## Phase 1: Data Layer Updates
- [x] Add `activeCampaignCount` to `shareOfVoice` type in `OverviewResponse`
- [x] Update `shareOfVoice` computation in `computeOverviewAnalytics` to include campaign count

## Phase 2: Filter Bar Fix
- [x] Remove `sticky`, `top-0`, `z-20`, `backdrop-blur` from filter section in `overview-dashboard.tsx`

## Phase 3: Rename SOV
- [x] Change "Spending Share of Voice" → "Spending SOV" in card heading and description

## Phase 4: Beverage Can Chart
- [x] Build responsive SVG beverage-can `SpendingSovChart` component
- [x] Can shape with clipPath, metallic top, pull-tab detail, bottom rim
- [x] Stacked segments proportional to SOV percentage, sorted highest at bottom
- [x] Percentage labels inside segments when space permits
- [x] Hover/focus/tap tooltip with brand name, color, spend, SOV%, currency, active campaigns
- [x] ARIA labels on every segment
- [x] Brand legend sorted by SOV descending
- [x] Desktop/tablet/mobile responsive layout
- [x] Loading state (skeleton can)
- [x] No-data state (empty can + message)
- [x] Error state (message + retry button)
- [x] Zero-spend safety (no NaN/Infinity)

## Phase 5: Test & Verify
- [x] Run analytics tests
- [x] Run type check
- [x] Run lint
- [x] Run build

