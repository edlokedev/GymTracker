# Gymmie Performance Audit — 2026-06-16

**Scope:** launch-stage (per-user data tiny; cold-load + shared Exercise Catalog + images +
fixed per-request cost dominate). **Method:** static source read; no app run. Each finding is
ranked by **cost × frequency** and carries evidence (file:line), the axis it hurts, a one-line
fix, and a **measure-later** confirmation method. Plan hardened via grill-with-docs + a 2-round
Codex adversarial review (see `PLAN.md` / `PLAN-REVIEW-LOG.md`).

> Terms (Exercise Catalog, Workout Session, Authenticated User, API Envelope, etc.) per `CONTEXT.md`.

---

## Status (updated 2026-06-16)

| # | Finding | Status |
|---|---------|--------|
| P1 | Picker eager-loads whole library on workout-add path | ☐ Outstanding (structural) |
| P2 | Catalog grid eager-loads animated GIFs, no lazy hints | ✅ Done — `loading="lazy"` + `decoding="async"` on `ExerciseMediaFrame` (kept GIF default per decision) |
| P3 | No `Cache-Control` on public catalog/facet routes | ✅ Done — `CATALOG_CACHE_CONTROL` via `publicMethod` on the 3 facet routes |
| P4 | Route code-splitting unverified | ◐ Partial — build shows per-route chunks; full client chunk map still pending (Oak) |
| P5 | First paint blocks on async auth hydration | ☐ Outstanding (structural) |
| P6 | Search slow-path scans whole catalog in JS | ☐ Outstanding (needs SQL `ilike`/FTS) |
| P7 | Suggested-exercises full-catalog scan | ☐ Outstanding |
| P8 | `listRecentRows` unbounded | ☐ Outstanding (scale-gated, low now) |
| P9 | `listCategories` N+1 counts | ☐ Outstanding (low, bounded) |
| P10 | `recharts` unused dependency | ✅ Done — removed from `package.json` + `bun.lock` |
| P11 | `vercel.json` npm vs Bun | ✅ Done — `bun install` / `SERVER_PRESET=vercel bun run build` |
| P12 | Per-request Supabase Auth round-trip | ☐ Outstanding (indirectly reduced once P1 lands) |
| P13 | No SSR loaders + no client cache | ☐ Outstanding (structural; pairs with P3/P5) |

**Also done (not a numbered finding):** removed the dead `better-sqlite3` `Migration` type from
`src/lib/types/database.ts` (last SQLite remnant) and fixed 6 pre-existing TypeScript errors
(workout-detail duplicate-callback return type + workout-session test-fixture drift) — `tsc` is now clean.

**Verification of shipped changes:** biome clean · `tsc --noEmit` 0 errors · focused tests green
(facets/envelope + workout-session/workout-history, 66 tests) · production `vercel` build succeeds.
**Still outstanding overall:** the structural wins (P1, P5, P13), the SQL/query changes (P6–P9),
P12, and the **Oak measured pass** (Lighthouse / EXPLAIN / full chunk map) to confirm the rankings.

---

## TL;DR — highest-leverage fixes first
1. **Don't load the whole exercise library when the picker is just sitting there** (P1) — biggest
   common-path win; it currently fires ~5 requests (3 of them full catalog scans) on every
   workout-add screen, before the picker is even opened.
2. **Stop eager-loading animated GIFs in the catalog grid** (P2) — 20 GIFs, no lazy-loading.
3. **Add `Cache-Control` to public catalog/facet routes** (P3) — static data, re-fetched every visit.
4. **Confirm route code-splitting with a real build** (P4) and **don't block first paint on async
   auth** (P5).

The Tier-1 items (P1–P3) are the ones that bite *now, on common paths, regardless of user data*.

---

## Tier 1 — common path, high cost (fix first)

### P1 — Exercise picker eagerly loads the entire library on the workout-add path
**Axis:** cold-load / DB · **Frequency:** high (every mounted workout-add / template-edit selector)
· **Scale:** hurts now.

`ExerciseSelector` calls `useExerciseLibrary()` unconditionally at the top of the component
(`src/features/exercise-library/components/ExerciseSelector.tsx:46`). The hook's mount effects fire
immediately — **before the picker modal is opened** (`isOpen` defaults `false`):
- `fetchExerciseFacetCatalog()` → **3** public requests: categories, equipment-types, muscle-groups
  (`src/features/exercise-library/useExerciseLibrary.ts:153-195`).
- `fetchFavoriteExercises()` + `fetchRecentExercises(10)` (same effect).
- an initial `runSearch()` (`useExerciseLibrary.ts:197-216`).

Two of those facet endpoints page through the **whole ~800-row catalog and dedupe in JS**, uncached:
`listEquipmentTypes` (`src/lib/supabase/queries/exercise-catalog.ts:163-182`) and `listMuscleGroups`
(`exercise-catalog.ts:184-206`). The selector is rendered on the common workout-add and
template-edit paths (`src/features/workout-session/components/WorkoutSessionManager.tsx:614`,
`src/features/workout-templates/components/WorkoutTemplateEditor.tsx:222`).

Net: opening a workout screen triggers ~5 round-trips (each a private route → its own auth
round-trip, see P12) including 2 full catalog scans, none of it needed until the user taps "add
exercise."

**Fix:** lazy-mount the library hook only when the picker opens (gate the effects on `isOpen`), and
share one cached catalog-support payload across selectors instead of re-fetching per mount.
**Confirm:** network panel on a workout-add screen (count requests before opening the picker);
EXPLAIN on the facet queries.

### P2 — Catalog grid eager-loads animated GIFs with no loading hints
**Axis:** image / cold-load · **Frequency:** high (every catalog/picker view) · **Scale:** now.

`ExerciseMediaFrame` initializes its `<img>` source to the **GIF first**
(`gifUrl || previewImageUrl || placeholderUrl`, `ExerciseMediaFrame.tsx:21`) and renders a plain
`<img src=… onError=…>` with **no `loading="lazy"`, no `decoding="async"`, no width/height, no
`srcSet`/`sizes`** (`ExerciseMediaFrame.tsx:44`). `ExerciseGrid` maps a card per exercise with **no
virtualization** (`ExerciseGrid.tsx:152-156`); the first page is 20 cards, so the first render pulls
~20 animated GIFs from jsDelivr immediately, with no lazy gating and layout-shift risk (no intrinsic
dimensions). The static `preview_image_path` exists but is only used as an *error* fallback, not the
default (`exercise-media.ts:20-28`).

**Fix:** default cards to the still `preview_image_path` with `loading="lazy"` + `decoding="async"`
+ explicit dimensions (or an `aspect-ratio` box already present); load the GIF only in the detail
view or on hover/intent. **Confirm:** first-viewport transferred bytes + image count in the network
panel; Lighthouse "defer offscreen images".

### P3 — Public catalog/facet API responses set no `Cache-Control`
**Axis:** caching / cold-load · **Frequency:** high (pairs with P1) · **Scale:** now.

`successResponse`/`jsonResponse` set only `Content-Type` (`src/lib/api/envelope.ts:19,33`).
`makePublicMethod` returns `successResponse(data, responseHeaders)` where `responseHeaders` carries
only Supabase cookie headers (`src/lib/api/define-public-route.ts:50,54`). Facet/catalog routes use
the wrapper directly (`src/routes/api.equipment-types.ts:10`, `api.muscle-groups.ts:8`,
`api.exercise-categories.ts`). Catalog data is effectively static, but every visit re-fetches it
from origin with no browser/CDN caching — and there is no client-side cache either (see P13).

**Fix:** set route-level `Cache-Control: public, s-maxage=…, stale-while-revalidate=…` on the
catalog + facet routes (they are world-readable per RLS). **Confirm:** response headers + repeat-visit
network panel (should serve from cache/304).

---

## Tier 2 — real, but narrower path or needs measurement

### P4 — Route code-splitting unverified; generated route tree statically imports every route
**Axis:** bundle · **Frequency:** all cold-loads · **Scale:** now (if confirmed).

`src/routeTree.gen.ts:13-37` statically imports every page **and** API route module, and
`vite.config.ts:46` calls `tanstackStart({ customViteReactPlugin: true, … })` with no explicit
`autoCodeSplitting`. If automatic per-route splitting isn't on, page component code lands in the
entry chunk, inflating initial JS. **This finding must be decided by a real chunk map, not the
config alone.**

**Fix:** enable/verify `autoCodeSplitting` for TanStack Start; confirm each route is its own chunk.
**Confirm (required before ranking firmly):** production `SERVER_PRESET=vercel bun run build` +
inspect `.vercel/output` / client chunk sizes (e.g. `rollup-plugin-visualizer` or the build output).

### P5 — First paint blocks on async auth hydration
**Axis:** cold-load / perceived · **Frequency:** every load · **Scale:** now.

`__root.tsx:48` wraps the whole app in `AuthProvider`. The provider sets `isLoading=true`, then in
an effect **awaits a dynamic browser-client import and `getSession()`**
(`src/lib/auth/supabase-context.tsx:57-59`). The home route renders a full-screen spinner until that
resolves (`src/routes/index.tsx:20-29`), and the header/content are also gated (`__root.tsx:63-92`).
So first contentful render waits on: JS load → hydrate → dynamic import → `getSession()`.

**Fix:** bootstrap the session server-side (SSR/cookie) so the authed shell renders immediately, or
render a public shell while auth hydrates instead of a blank spinner. **Confirm:** Lighthouse
FCP/LCP and a throttled-network trace.

### P6 — Catalog search slow-path fetches the whole filtered catalog and filters in JS
**Axis:** DB / render · **Frequency:** per text/muscle search · **Scale:** borderline now, worse as
catalog grows.

When a query has free text or a `primary_muscle` filter, `search` pages **all** filtered rows then
substring-filters and slices in JS (`src/lib/supabase/queries/exercise-catalog.ts:248,283-311`). The
fast path (no text) paginates correctly in Postgres; only the text path degrades. Search is debounced
300ms (`ExerciseSelector.tsx:91`), which limits frequency but not per-call cost.

**Fix:** push text search into Postgres — `ilike` or a `tsvector` full-text index — with DB-side
pagination. **Confirm:** EXPLAIN ANALYZE on the search query with a text term.

### P7 — Suggested-exercises fetches the entire catalog (`limit:1000`) + full JS scan
**Axis:** DB / render · **Frequency:** low (only when the picker opens *with a selected exercise*) ·
**Scale:** high per-call cost.

`listSuggested` runs `listFavorites` + `listRecent` + a full catalog fetch
(`limit:1000`, `src/lib/supabase/queries/exercise-discovery.ts:260-263`) in parallel, then ranks
across the whole catalog in JS (`rankSuggestedExercises`). It fires only from the selector's
suggestion effect when a `selectedExercise` is present (`ExerciseSelector.tsx:71-86`,
`useExerciseLibrary.ts:370`). High cost, but not a cold-load path — hence Tier 2, not Tier 1.

**Fix:** filter candidates in SQL (same primary muscle / category / equipment) before ranking; cap
the scanned set. **Confirm:** EXPLAIN + response payload size on `/api/exercises/suggested`.

---

## Tier 3 — scale-gated or low / hygiene

### P8 — `listRecentRows` pulls ALL of a user's workout_sets (no `.limit()`)
`src/lib/supabase/queries/exercise-discovery.ts:83-91` selects every `workout_sets` row joined to
sessions to compute "recent 10" in JS. Tiny at launch; grows unbounded with history.
**Fix:** distinct-recent in SQL with bounded rows / `order + limit`. **Confirm:** EXPLAIN ANALYZE at
seeded scale. (Scale-sensitive; low priority now — matches the launch-stage assumption.)

### P9 — `listCategories` issues N+1 `head:exact` count queries
`src/lib/supabase/queries/exercise-catalog.ts:144-158` runs one count per category (~7, bounded and
self-documented as acceptable). **Fix:** a single grouped count or a view. Low priority.

### P10 — `recharts` is an unused dependency
Present in `package.json:34` but **no import anywhere in `src/`** (verified). Tree-shaking means it
isn't shipped, so it's not a runtime bundle cost — but it's install-time weight and dead surface.
**Fix:** remove it, or wire the intended charts in the progress feature. **Confirm:** dependency
graph; chunk map shows it absent.

### P11 — `vercel.json` uses npm despite a Bun repo
`vercel.json:4-5` sets `installCommand: "npm install"` and `buildCommand: "… npm run build"`, but
the repo is Bun-based (`bun.lock`, Bun scripts). Risks slower installs and **lockfile drift**
(npm resolves against `package-lock.json`, not `bun.lock`). **Fix:** pin Vercel to the intended
package manager (Bun) or intentionally document the npm path. **Confirm:** Vercel build logs +
install time.

### P12 — Every private API request makes a Supabase Auth round-trip
**Axis:** per-request latency · **Frequency:** every private request · **Scale:** now (compounds P1).

`getAuthenticatedUser` calls `supabase.auth.getUser()` per request
(`src/lib/supabase/server.ts:102-107`), which validates the JWT against the Supabase Auth server
(network), not locally. This is the correct *secure* choice server-side, but it adds an auth
round-trip to every private route. Because the app fires many parallel client requests (P1, P13),
each becomes its own route invocation → its own `getUser()` call.
**Fix:** keep `getUser()` for security, but reduce the number of private requests (P1/P13) so fewer
auth round-trips occur; consider a short-lived per-request memo if multiple queries share one
invocation. **Confirm:** count auth calls / time the private routes under load.

### P13 — No SSR data loading and no client-side request cache
**Axis:** cold-load / perceived · **Frequency:** every navigation · **Scale:** now.

Routes don't use loaders for data — e.g. `src/routes/exercises.tsx` only validates search params and
renders a component that fetches client-side via hooks. The API client is plain `fetch` + JSON parse
with **no dedup/caching** (`src/lib/api/client.ts`), and there is no TanStack Query (the file
`src/lib/supabase/query-client.ts` is a Supabase *type shim*, not a cache). So every screen: hydrate
→ wait for auth (P5) → fire client fetches (waterfall), and revisiting a screen re-fetches
everything.
**Fix:** move catalog/facet (and dashboard) reads into route loaders for SSR/prefetch, and/or add a
lightweight client cache (or adopt TanStack Query) to dedup and memoize. Pairs with P3 (HTTP
caching). **Confirm:** waterfall view in the network panel on navigation; repeat-visit request count.

---

## Cross-cutting theme
P1, P3, P5, P12, P13 compound into one story: **the app loads JS, blocks on a client-side auth
round-trip, then fires many uncached client requests** — several of which redundantly scan the whole
catalog. The cheapest high-impact wins are (a) not fetching until needed (P1), (b) caching static
catalog data at the HTTP layer (P3), and (c) not eager-loading GIFs (P2). Those three need no
architectural change.

## Recommended sequencing (when implementation is approved)
1. **Quick wins, no arch change:** P2 (image attrs), P3 (Cache-Control), P10 (drop recharts),
   P11 (Vercel→Bun).
2. **Common-path structural:** P1 (gate picker load), then P13/P5 (loaders + don't block paint).
3. **Measured-first:** P4 (build a chunk map before deciding), then P6/P7 (SQL-side search/suggest).
4. **Scale-gated, defer:** P8, P9, P12 tuning.

## Measure-later checklist (run on Oak with the app up + seed data)
- Lighthouse / Web Vitals (FCP, LCP, TBT) on a throttled mobile profile → validates P2, P4, P5, P13.
- Network panel on workout-add and `/exercises` (request count, first-viewport bytes, waterfall) →
  validates P1, P2, P3, P13.
- `EXPLAIN ANALYZE` on facet, search (text), suggested, and recent queries at seeded scale →
  validates P1, P6, P7, P8.
- Production build chunk map → validates P4, P10.

---
_Findings P1–P11 trace to the locked plan; P12–P13 were discovered while reading the surfaces the
plan committed to inspect during execution. All evidence re-verified against source on 2026-06-16._
