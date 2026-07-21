# FizZion

FizZion is a bilingual media intelligence and advertising monitoring platform for the Iraqi market, built by Hizen for Coca-Cola Iraq.

This repository contains:

- `apps/web`: Next.js App Router enterprise frontend and application APIs
- `packages/ui`: shared design system and application primitives
- `packages/config`: shared config, navigation, and feature metadata
- `packages/types`: shared domain and API types
- `services/media-ai`: FastAPI service for OCR, speech, video analysis, and provider abstraction
- `workers`: queue-driven processing services for TV, social, web, reporting, and operations
- `supabase`: PostgreSQL schema, RLS, and seed configuration
- `docs`: architecture, contracts, wireframes, ERD, operations, and deployment documentation

## OOH Intelligence

The repository now includes a functional `OOH Intelligence` module at `/ooh-intelligence` with:

- deterministic Karachi + Baghdad demo inventory
- interactive MapLibre map and synchronized results list
- asset detail pages
- add, edit, and delete inventory flows
- local image uploads
- XLSX preview/import API flow for OOH site lists
- fallback local persisted store when the remote Supabase OOH tables have not been migrated yet

### Local OOH setup

1. Install dependencies:
   `npm install`
2. Copy env values:
   `copy .env.example .env.local`
3. Generate demo OOH images:
   `npm run generate:ooh-demo-images --workspace web`
4. Start the web app:
   `npm run dev --workspace web`
5. Open:
   `http://localhost:3000/ooh-intelligence`

### OOH verification commands

- `npm run lint --workspace web`
- `npm run typecheck --workspace web`
- `npm run test --workspace web`
- `npm run build --workspace web`

### OOH notes

- When Supabase already has the OOH migrations applied, the module uses the database-backed path.
- When the OOH tables are not yet present, the app automatically switches to a local persisted fallback store in `apps/web/.data`, so the inventory UI and CRUD flows remain usable during setup.
- The workbook `TCCC_OOH Site list_2026.xlsx` is not stored in this repository, so import UI/API are implemented generically and should be exercised with the real file in your environment.

## Current state

This is the production-foundation implementation. It includes:

- System architecture and dependency model
- Core monorepo scaffold
- Bilingual enterprise web shell with module routes
- Supabase schema and RLS foundations
- Worker and AI service contracts
- CI/CD, environment templates, and operational documentation

## External dependencies

Production activation still requires customer-controlled or licensed access for:

- Supabase project and secrets
- S3 or Cloudflare R2 buckets
- AWS queues, ECS, Secrets Manager, CloudWatch, and EventBridge
- Sentry
- OAuth applications for supported social platforms
- Iraq-side TV recording partner and source delivery pipeline
- Iraq-geolocated crawling infrastructure
- Commercial traffic-intelligence or approved ranking source

See [docs/external-dependencies.md](/d:/Fizzion/docs/external-dependencies.md) for the full activation list.
