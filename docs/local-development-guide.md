# FizZion Local Development Guide

## Prerequisites

- Node.js 24+
- Python 3.13+
- A Supabase project or local equivalent

## Web app

1. Run `npm install` from the repository root.
2. Run `npm run dev --workspace web`.

## Media AI service

1. Install dependencies with `pip install fastapi uvicorn pydantic pydantic-settings pytest httpx`.
2. Start the service with `uvicorn app.main:app --reload --host 0.0.0.0 --port 8100` from `services/media-ai`.

## Workers

The worker folders currently provide scaffold entrypoints and testable acceptance handlers. Replace their placeholder logic with queue consumers and concrete processing adapters before production rollout.

