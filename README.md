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

