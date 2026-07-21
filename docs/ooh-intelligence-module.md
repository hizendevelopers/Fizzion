# OOH Intelligence Module

## Route surface

- `/ooh-intelligence`
- `/ooh-intelligence/assets/new`
- `/ooh-intelligence/assets/[assetId]`
- `/ooh-intelligence/assets/[assetId]/edit`

Legacy routes now redirect:

- `/ooh/map`
- `/ooh/locations`
- `/ooh/locations/new`
- `/ooh/locations/[locationId]`

## API routes

- `GET /api/ooh/assets`
- `POST /api/ooh/assets`
- `GET /api/ooh/assets/[id]`
- `PATCH /api/ooh/assets/[id]`
- `DELETE /api/ooh/assets/[id]`
- `GET /api/ooh/areas`
- `GET /api/ooh/brands`
- `POST /api/ooh/brands`
- `GET /api/ooh/analytics`
- `POST /api/ooh/uploads`
- `POST /api/ooh/import/excel`
- `POST /api/ooh/import/[importId]/assign-coordinates`

## Demo inventory guarantees

- 200 total demo assets
- 100 Karachi assets
- 100 Baghdad assets
- 140 billboards
- 60 digital screens
- 10 areas per city
- 10 assets per area

## Demo asset media

Generate local SVG media with:

```bash
npm run generate:ooh-demo-images --workspace web
```

Generated outputs:

- `apps/web/public/demo/ooh/creatives/*.svg`
- `apps/web/public/demo/ooh/sites/*.svg`

## Workbook import rules

The importer currently:

- fills down blank merged `Region` and `City` cells
- normalizes city variations such as `Mousel` to `Mosul`
- normalizes site codes and dash variants
- ignores repeated headers, totals, and empty rows
- detects billboard vs digital sections
- marks imported records without coordinates as `NEEDS_COORDINATES`

## Storage

- default upload driver: `local`
- uploaded OOH images are stored under `apps/web/public/uploads/ooh`
- configurable via `OOH_UPLOAD_DRIVER`

## Current fallback behavior

If the remote Supabase project has not yet applied:

- `202607200002_ooh_intelligence_module.sql`
- `202607200003_ooh_brand_extensions.sql`

the module falls back to a persisted local JSON store at:

- `apps/web/.data/ooh-fallback-store.json`

This keeps the module usable while database setup catches up.
