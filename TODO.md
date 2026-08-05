# Meta Library Page — Implementation TODO

## Goals
- Add a "Meta Library" page in the sidebar that runs the Apify Meta/Facebook Ad Library scraper (Actor `JHGi3kAzHO1t3Fxrb`) on-demand and displays real returned data.

## Steps
- [x] 1. Add `metaLibrary` nav item to `packages/config/src/navigation.ts`
- [x] 2. Add `MetaLibraryIcon` to `apps/web/src/components/app/ui-icons.tsx`
- [x] 3. Map the icon in `apps/web/src/components/app/sidebar.tsx`
- [x] 4. Add `metaLibrary` labels to `apps/web/src/lib/copy.ts` (en + ar)
- [x] 5. Create API route `apps/web/src/app/api/meta-library/route.ts`
- [x] 6. Create client component `apps/web/src/components/meta/meta-library-client.tsx`
- [x] 7. Create page `apps/web/src/app/(app)/meta-library/page.tsx`
- [x] 8. Ensure `APIFY_API_TOKEN` is set in `.env.local`
- [x] 9. Typecheck passes (`npx tsc --noEmit`)
- [x] 10. Unit tests pass (`tsx --test ./src/lib/meta-library.test.ts` — 11/11)
- [x] 11. Wire `./src/lib/meta-library.test.ts` into `apps/web/package.json` test script
