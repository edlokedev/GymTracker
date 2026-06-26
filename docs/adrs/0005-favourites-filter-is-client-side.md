# 0005. Favourites Filter on the Exercise Library Is Client-Side

## Status

Accepted

## Context

The exercise library (`/exercises`) lets users filter the catalog by category, muscle group, equipment, and a free-text query. All four are server-side filters: `useExerciseLibrary` builds an `ExerciseLibraryFilters` object, `client.ts` serialises it to query params, and `/api/exercises/search` applies them against the catalog with pagination (`limit`/`offset`, server-computed `hasMore`).

Users could already favourite exercises (`exercise_favorites` table, toggled per-exercise), and the hook already fetches the full favourites list on mount into `state.favoriteExercises` to power the quick-pick sections. But there was no way to filter the browse grid down to *only* favourited exercises — the capability the user reported missing.

Two ways to add it:

1. **Server-side filter param.** Add `favourites=true` to `/api/exercises/search`, join `exercise_favorites` for the authed user, paginate server-side like the other facets. Consistent with the existing filter pipeline, scales to any number of favourites, but adds an authed code path to an otherwise anon-served public catalog route, plus a new query branch and contract change.
2. **Client-side view over already-fetched favourites.** The full favourites list is already in memory. When the filter is on, bypass the search API entirely and render `state.favoriteExercises` directly.

## Decision

Implement the favourites filter **client-side**. `favourites` is a boolean on `ExerciseLibraryFilters` / `ExerciseLibrarySearch`. When `filters.favourites === true`:

- `runSearch` short-circuits before calling `searchExerciseLibrary` — it sets `exercises` to the in-memory favourites, `total` to their count, `hasMore` to false, and makes no network request.
- Any path that refetches the favourites set while the filter is active (`toggleFavorite`, `refreshQuickPicks`) calls a `reflectFavouritesIfActive` helper so the rendered grid, `total`, and `exercisesRef` track the new list — not just `state.favoriteExercises`.
- The flag round-trips through the route search (`?favourites=true`) so the filtered view is shareable/deep-linkable; on a deep-link landing the mount load reflects the freshly-fetched favourites into the displayed list, since the initial search runs before favourites arrive.
- It participates in the existing active-filter machinery: counted by `getActiveFilterCount`, shown as a removable `{type:'favourites'}` chip, cleared by `removeFilter`/`resetFilters`.

The server route `/api/exercises/search` is **unchanged** — no `favourites` param, no auth added to the public catalog route.

## Consequences

- No new authed branch on the anon-served catalog route; the public search contract is untouched.
- Reuses state the hook already loads, so toggling favourites-on is instant with zero extra network cost.
- **Does not paginate.** The filtered view shows exactly the favourites already in memory. The favourites fetch is itself unpaginated (`fetchFavoriteExercises` returns the whole list), so this is correct today. If favourites ever become paginated or unbounded, this filter must move server-side (option 1) — this ADR is the marker for that revisit.
- Favourites-on bypasses category/muscle/equipment/query — it is a distinct view, not composable with the server facets. Acceptable: "show me my favourites" is the whole intent. Composition would require the server-side path.
- The "rendered list IS the favourites list" coupling means every favourites-mutating path must refresh the displayed results, not just `favoriteExercises`. The `reflectFavouritesIfActive` helper centralises this; a regression test covers removing a favourite while the filter is active.

## Notes

- Shipped 2026-06-26 on branch `claude/custom-exercise-addition-9vt6bh` (not yet committed at time of writing — bundled with pre-existing in-flight work on that branch).
- Files: `src/features/exercise-library/model.ts`, `useExerciseLibrary.ts`, `components/ExerciseBrowser.tsx`, `components/ExerciseBrowserFilters.tsx`, `src/routes/exercises.tsx` (+ focused tests in `model.test.ts`, `useExerciseLibrary.test.tsx`).
