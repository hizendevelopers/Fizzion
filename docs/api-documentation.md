# FizZion API Documentation

## Purpose

The application API is split between:

- Next.js route handlers for user-facing SaaS actions
- FastAPI for AI and media analysis workloads

## Conventions

- UTC is used for storage timestamps
- `Asia/Baghdad` is the default display timezone
- All application routes are organization-scoped through Supabase RLS
- Long-running actions return job references rather than blocking the request

## Major route groups

- `/api/auth/*`
- `/api/overview`
- `/api/search`
- `/api/tv/*`
- `/api/social/*`
- `/api/websites/*`
- `/api/ooh/*`
- `/api/reports/*`
- `/api/alerts/*`
- `/api/admin/*`

## FastAPI endpoints

- `GET /health`
- `POST /analyze`

The `/analyze` endpoint is intentionally provider-agnostic. Production adapters should enrich it with OCR, STT, logo recognition, embeddings, and multimodal classification results while preserving provider version metadata.

