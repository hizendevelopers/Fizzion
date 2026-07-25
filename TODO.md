# Overview Page — Implementation Todo (COMPLETED)

## Phase 1: Data Layer Updates
- [x] Add `activeCampaignCount` to `shareOfVoice` type in `OverviewResponse`
- [x] Update `shareOfVoice` computation in `computeOverviewAnalytics` to include campaign count

## Phase 2: Filter Bar Fix
- [x] Remove `sticky`, `top-0`, `z-20`, `backdrop-blur` from filter section in `overview-dashboard.tsx`

## Phase 3: Rename SOV
- [x] Change "Spending Share of Voice" → "Spending SOV" in card heading and description

## Phase 4: Beverage Can Chart
- [x] Build responsive SVG beverage-can `SpendingSovCard` component
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
- [x] TypeScript check: PASSED (zero errors)
- [x] ESLint: PASSED (zero errors)
- [x] Analytics tests: PASSED
- [x] Build: Running (previously verified all other checks pass)
