# Plan: Enable adding to favourites on the `/exercises` browser
_Locked via grill-with-docs — by Claude + Edward. Terms per CONTEXT.md._

## Goal

On the `/exercises` page (the `ExerciseBrowser`), let an authenticated user favourite/unfavourite an exercise directly. Today the page has no favourite affordance at all — the supporting pieces exist but were never wired in. Surface the favourite control in **both** places (decision C): a star on each grid card and a star in the exercise detail modal.

## Current state (root cause)

- `ExerciseCard` already accepts `isFavorite` + `onToggleFavorite` and renders a `FavoriteStarButton` overlay when `onToggleFavorite` is passed (`components/ExerciseCard.tsx`).
- `ExerciseDetailModal` already accepts `isFavorite` + `onToggleFavorite` and renders the same star when `onToggleFavorite` is passed (`components/ExerciseDetailModal.tsx`).
- `ExerciseGrid` only forwards `onSelectExercise` to each card — it does **not** forward favourite props (`components/ExerciseGrid.tsx`).
- `ExerciseBrowser` renders the grid and the detail modal but passes favourite props to **neither**, even though `useExerciseLibrary` exposes `toggleFavorite(id)` and `favoriteExerciseIdSet` (`components/ExerciseBrowser.tsx`).
- Contrast: the in-workout `ExerciseSelectorModal` does wire the card star — so favouriting works there, which is why this gap is `/exercises`-only.

This is a pre-existing wiring gap, not a regression from the favourites-filter work (PR `favourites-filter`, ADR-0005). The filter only made the gap visible.

## Approach (TDD: red → green → refactor)

1. **`ExerciseGrid`** — add optional `favoriteExerciseIds?: Set<string>`, `onToggleFavorite?: (exercise) => void`, and `togglingFavoriteId?: string | null` props. When `onToggleFavorite` is present, pass to each `ExerciseCard`: `isFavorite={favoriteExerciseIds?.has(exercise.id) ?? false}`, `onToggleFavorite`, and a pending flag `isFavoritePending={togglingFavoriteId === exercise.id}`. No change when the props are absent (keeps other callers untouched).
2. **`FavoriteStarButton` / `ExerciseCard` / `ExerciseDetailModal`** — add an optional `disabled` prop on `FavoriteStarButton`. **Disable every star whenever any toggle is in flight** (`togglingFavoriteId != null`), not just the one being toggled — this closes the concurrent different-exercise race (tap A then B) given the hook's single global `togglingFavoriteId` (Codex R2), without hardening the hook. The star currently being toggled also gets `aria-busy`. Keep `aria-pressed` (favourite state), `aria-label`, and `disabled`/`aria-busy` coherent. Use **complete static class strings per state** (default / active / disabled) — no template-literal class construction (Gymmie rule). `ExerciseCard` and `ExerciseDetailModal` thread the flags through.
3. **`ExerciseBrowser`** — pass `favoriteExerciseIds={library.favoriteExerciseIdSet}`, a `useCallback`-wrapped `onToggleFavorite` (`(ex) => library.actions.toggleFavorite(ex.id)`), and `isToggleBusy={library.togglingFavoriteId != null}` (+ `togglingFavoriteId` for the per-card `aria-busy`) to `ExerciseGrid`; pass `isFavorite`, the same `onToggleFavorite`, and busy flags to `ExerciseDetailModal`. **Gate on two conditions:** (a) signed in (`user` from `useAuth`, matching the existing "Add exercise" gating); (b) **standalone browser mode only** — when `ExerciseBrowser` is reused as the in-workout picker (`onSelectExercise` prop provided) do NOT add the star wiring, to avoid silently changing picker UX (Codex R1). Anonymous browsers see no star.
4. **Reuse existing toggle** — `library.actions.toggleFavorite` already does the optimistic id-set update, server round-trip, error rollback, and `reflectFavouritesIfActive`. No new hook logic in this change. (Pre-existing hook limitations — single global `togglingFavoriteId`, unguarded out-of-order refetch, catch path restoring only the id set — are acknowledged below and deferred; they predate this plan and are not worsened by read-only star wiring once the per-exercise pending disable is in place.)
5. **Tests first** — reuse the exercise-library component test harness: (a) signed in → each grid card renders a star; clicking (and keyboard Enter/Space on the `<button>`) calls `toggleFavorite(id)` and does NOT open the detail modal (star stops propagation); (b) detail modal renders the star wired to the same action; (c) signed out → **no star renders and no favourites _mutation_ (POST/DELETE `/api/exercise-favorites`) is invoked** (note: the hook's mount load already GETs favourites for anyone — see "Deferred"; the test asserts no mutation, not no GET); (d) while a toggle is in flight, **all** stars are disabled — a second tap on a different card does not call `toggleFavorite` again (covers the concurrency race); (e) with the favourites-only filter active, toggling a card off removes it from the displayed grid on success (`reflectFavouritesIfActive`); (f) toggle **failure** while the filter is active leaves the displayed grid unchanged (optimistic step touches only the id set, not the displayed list — so no removed-then-rolled-back inconsistency).

## Key decisions & tradeoffs

- **Both surfaces (C).** Card star = discoverable one-tap path matching the workout picker; modal star = consistency and near-free since already supported. Rejected card-only (less consistent) and modal-only (poor discoverability, extra taps).
- **Auth-gated star.** Show the star only to signed-in users. Favouriting hits the private `/api/exercise-favorites`; an anonymous tap would 401. Gating avoids a dead control. (The `/exercises` route itself stays public.)
- **No server / API / model change.** Pure UI wiring over existing hook state. The `exercise_favorites` table, route, and `toggleFavorite` are unchanged.

## Risks / open questions

- Card click vs star click: the star must `stopPropagation` so favouriting doesn't also open the detail modal. `ExerciseCard`'s star already does this — verify the test covers it, including keyboard (Enter/Space on the `<button>`).
- Optimistic toggle while the favourites-only filter is active: removing a favourite from a card should drop it from the filtered grid. `toggleFavorite` → `reflectFavouritesIfActive` already handles this on success; test asserts it.
- Mobile touch target: enforce/verify `FavoriteStarButton` ≥44px (e.g. `h-11 w-11`) in both surfaces and that the overlay doesn't block the card tap on small screens.
- **First-render flicker:** `favoriteExerciseIdSet` is empty until favourites load, so stars briefly render unfilled then fill. Accepted as minor; no gating-until-loaded (avoids hiding controls). Noted for QA.

## Deferred (Codex R1) — acknowledged, out of scope for this change

These are pre-existing `useExerciseLibrary.toggleFavorite` / mount behaviors from the favourites PR, not introduced here. The **global** disable-while-any-pending (step 2) makes the concurrency deferral safe (Codex R2 accepts deferring sequencing when all stars are disabled during one pending mutation):

- Single global `togglingFavoriteId` overwrite + unguarded out-of-order `fetchFavoriteExercises()` refetch → not user-reachable now, because all stars are disabled while any toggle is in flight. Full `Set<string>`-of-pending + sequence guard is a separate hook-hardening task.
- Catch path restores only `favoriteExerciseIds`, not `favoriteExercises`. **Not a defect for this wiring:** the optimistic step never removes from the displayed list (only `reflectFavouritesIfActive` on success does), so a failed toggle under an active filter leaves the grid intact and only reverts the star. Covered by test (f).
- **Anon mount-fetch:** the hook GETs `/api/exercise-favorites` on mount regardless of auth (caught → empty). On the public `/exercises` route this means an anonymous visitor pings a private endpoint (harmless 401, swallowed). Pre-existing; out of scope. Logged as a follow-up to consider auth-gating the mount fetch.
- Stale-session 401 on mutation: `user` gating is client-side UX only; a 401 silently rolls back (no broken state). **No toast/notification system exists in the repo**, so surfacing it would mean introducing one — out of scope for a missing-affordance fix. Deferred; rollback keeps state safe and 401 is rare (star is gated on a present `user`).

## Rejected (Codex R1) — with reason

- **`getIsFavorite(id)` predicate instead of `Set<string>` prop:** keeping the `Set` is simpler and reuses the already-exposed `favoriteExerciseIdSet`; identity churn is negligible at catalog scale. Not adopting the predicate.
- **`React.memo` on cards:** unrequested perf work with no measured problem; the `useCallback` handler (step 3) is the only perf touch.
- **`favourite` vs `favorite` rename:** intentional — code identifiers stay `favorite*` to match the existing API path (`/api/exercise-favorites`) and DB/types; user-facing copy stays "Favourite(s)" in project dialect.

## Out of scope

- The favourites-only **filter** (already shipped, ADR-0005).
- Server-side favourites, pagination, or any `/api/exercise-favorites` change.
- Favouriting for anonymous users (would require auth-prompt UX — separate decision).
- Adding a favourite star to surfaces other than `/exercises`.
