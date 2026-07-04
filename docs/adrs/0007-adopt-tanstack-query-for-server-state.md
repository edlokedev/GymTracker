# 0007. Adopt TanStack Query for Server State

## Status

Accepted — Phase 0 (enablement) and Phase 1 (calendar pilot) implemented on
`feat/tanstack-query-phase0` / `feat/tanstack-query-phase1`. Rollout is phased
(see `docs/plans/tanstack-query-migration.md`); this ADR governs the whole
migration and is updated as phases land.

## Context

The 2026-07-04 frontend-fundamentals audit
(`docs/reviews/2026-07-04-frontend-fundamentals-audit.md`) found that several
otherwise-unrelated defect classes all trace to **one root cause: server state
is hand-rolled** despite the app running on the TanStack stack (Router +
Start). Concretely:

- **God-hooks**: `useExerciseLibrary` (530 lines) carries three manually-synced
  mirror refs; `useWorkoutSession` (~740 lines) hand-manages request identity.
- **Stale-response races**: history and calendar list loaders race their own
  in-flight requests; the house `prefillRequestRef` guard exists in exactly one
  place, so the other sites (calendar `navigateMonth`, history `loadSessions`)
  can render data for a superseded request.
- **Side effects inside `setState` updaters** (issue #0003, 6 sites): the
  calendar site (`useCalendarData.navigateMonth`) fires a `fetch` **inside** a
  `setState` updater, so React StrictMode double-fires the request.
- A **bespoke dedupe/TTL cache** (`src/lib/api/cache.ts`), a **hand-rolled
  optimistic favourites toggle**, and **zero loaders/preload** on a framework
  built for them.

TanStack Query provides request deduplication, cache/staleness, request
identity (last-request-wins), optimistic updates with rollback, and
loader/preload integration — tested, off the shelf — replacing ~4 bespoke
mechanisms.

## Decision

Adopt **TanStack Query** as the server-state layer, migrated **feature by
feature** behind per-phase branches/PRs, **without changing any API route,
response envelope, or RLS behaviour**.

Target architecture:

```
feature component
  → useQuery / useMutation (thin feature hooks)
    → queryOptions factories in feature client.ts   ← clients keep readApiData + envelope, unchanged transport
      → /api/* routes → privateMethod → queries → RLS   ← untouched
```

- **QueryClient lifecycle**: created in `getRouter()` (`src/router.tsx`), passed
  via router `context: { queryClient }` (typed as `RouterAppContext` in
  `__root.tsx` via `createRootRouteWithContext`), and wired with
  `setupRouterSsrQueryIntegration({ router, queryClient })`. That integration
  provides `QueryClientProvider` around the app, so no manual provider is
  needed.
- **Clients keep the envelope.** Feature `client.ts` files stop being imperative
  fetchers and export `queryOptions` factories (e.g. `calendarDataOptions(month)`)
  plus mutation functions. The `readApiData<T>` envelope helpers stay exactly as
  they are — Query wraps them, it does not replace them.
- **Errors** stay component-visible: Query's `throwOnError` is left default-off;
  hooks expose `error` the way current state fields do, so component error UI is
  unchanged. `GlobalErrorBoundary` is the backstop.

### Constraint — no SSR prefetch of private data (pre-P13)

Auth is **client-side only** today: `AuthProvider` resolves auth in the browser;
there are no route `beforeLoad` guards or server-side session bootstrap
(tracked as future work "P13"). A server-rendered route loader therefore has **no
user**, so **route loaders cannot prefetch private data during SSR**.
Consequence: private data (calendar, history, workout-session, exercise
favourites/recents) stays on client-side `useQuery` through Phases 1–4; loader /
SSR prefetch (Phase 5) applies only to **public/catalog** data until P13 lands.
This migration must not silently expand into P13.

### Query-key convention

Single source of truth: `src/lib/api/query-keys.ts`. Keys are built **only**
through exported factories (`queryKeys.calendar.data(month)`), never as inline
arrays at call sites — so invalidation cannot typo-miss. Keys are hierarchical
so a partial key invalidates a whole subtree (`queryKeys.calendar.all` clears
every calendar query). Domains: calendar, workout-sessions (list/detail),
workout-sets (history), exercises (search/facets/favourites/recent/suggestions),
workout-templates (list/detail), progress, locations.

### Defaults

`staleTime: 30_000` app-wide (single-user gym data — aggressive refetch buys
nothing), default `gcTime`, `retry: 1`. Static catalog facets will use
`staleTime: Infinity`.

### `cache.ts` retirement

`src/lib/api/cache.ts` (bespoke TTL + dedupe) is **retired and deleted** in
Phase 3, once its last consumer (facet caching) moves to a `staleTime: Infinity`
query — its TTL/dedupe semantics map 1:1 onto `staleTime` + Query's built-in
request dedupe. Phase 3 greps to confirm zero importers before deletion.

### Phase-1 decision gate

Phase 1 (calendar pilot — the smallest live-race site) exists to prove the
approach on real code before committing to the god-hook phases. At the gate,
review the diff size and hook LOC before/after. **If the pilot does not
convince, stop with only Phase 0 + Phase 1 merged** (both are strict
improvements even standalone) and record the reversal here. The remaining
phases (history/detail, exercise-library, workout-session, loaders) proceed only
past the gate.

## Consequences

- One well-known dependency replaces ~4 bespoke mechanisms (mirror refs, race
  tokens, TTL cache, optimistic toggle) — net negative complexity.
- Blast radius is localised per phase: components mostly consume
  `ReturnType<typeof useX>`, so a hook rewrite is contained to one hook + its
  components.
- Cache-invalidation misses are the main new risk; mitigated by the central key
  factories and a per-phase invalidation contract in each PR description, with
  smoke covering cross-feature flows.
- Contract tests, API tests, and RLS behaviour are untouched by design — any
  `api/` diff in a migration PR is scope creep.
- ADR-0005 (favourites filter is client-side) still holds; the favourites
  optimistic toggle is reimplemented on Query's `onMutate`/`onError`/`onSettled`
  in Phase 3, not changed in behaviour.

## Phase 4 addendum — workout-session + templates (2026-07-05)

Highest-care phase. Guiding split held: **Query owns server sync, local state owns
in-flight editing** — per-keystroke set entry never enters the cache.

- **Reads → queries.** Active-session bootstrap is `workoutSessionDetailOptions`
  (`['workout-sessions','detail',id]`); last-performance prefill flows through
  `queryClient.fetchQuery(workoutSetHistoryOptions(exerciseId))`
  (`['workout-sets','history',exerciseId]`). Local editing state is *seeded* from
  the bootstrap query (guarded by a once-per-requested-id ref plus a
  `userEditedExercisesRef` so a late seed never stomps an in-flight edit).
- **`prefillRequestRef` retired.** The prefill merge is keyed by exercise id, so a
  result arriving after a session switch is still the correct value for that
  exercise — Query's per-key identity + dedupe replaces the monotonic token. (The
  ported race test pins last-request-wins per exercise; note it is a correctness
  contract, not red-provable against the old token, since that merge was already
  id-keyed.)
- **Writes → mutations** with targeted invalidation. Set-touching writes (save/
  update/delete set, change-exercise, remove-exercise, session delete) invalidate
  `['workout-sessions']` + `['calendar']` + `['exercises','recent']`; pure session
  metadata writes (create/update/complete) invalidate `['workout-sessions']` +
  `['calendar']` only (they don't change `workout_sets`, so recents are untouched).
- **Templates.** List/detail → `workoutTemplatesListOptions` / `workoutTemplateDetailOptions`
  (`['workout-templates','list'|'detail',id]`); next-workout →
  `nextWorkoutOptions` (`['workout-templates','next']`). CRUD (archive, create,
  update) → mutations invalidating `['workout-templates']`. The lib-layer
  transactionless delete-then-insert (#0004) is **not** fixed here — invalidation
  just re-reads whatever the API returns; #0004 stays open.
- **Issue #0011 closed.** All 5 side-effect-inside-state-updater sites fixed
  (useWorkoutSession add/removeExercise; WorkoutSessionManager completeExercise +
  removeExercise; WorkoutTemplateEditor addExercise): compute next value → set
  state → run effects.
- **Save-status timers.** The three previously-uncleared `saveStatus` setTimeouts
  are gone. `saveStatus` is now derived from the save mutation's `isPending`
  ('saving'), with a single cleaned-up timer for the lingering 'saved'/'error'
  override (cleared on unmount).
- **Autosave decision: DELETE the dead debounced-metadata-save machinery.** The
  `scheduleMetadataSave` / `flushMetadataSave` pair (plus `metadataSaveTimerRef` /
  `metadataSaveFnRef` and their effects) was exported but had **zero consumers** —
  no debounce→save UX existed anywhere in the tree. Wiring a brand-new autosave
  feature is an unrequested feature (repo rule); explicit `saveSession` on blur
  already persists metadata. Removed the whole apparatus rather than wire it.
- `useWorkoutSession` LOC: 742 → 862. It grew, not shrank: each write is now a
  `useMutation` block (mutationFn + onSuccess invalidation) plus a thin action
  wrapper, versus the old single imperative call. The win is not line count but
  uniformity — invalidation is centralised and declarative, the stale-response
  and prefill races are gone, and the dead autosave apparatus is removed. Result
  contract preserved except the two now-removed dead exports
  (`scheduleMetadataSave`, `flushMetadataSave`).

## Notes

- Grounded against the official `start-basic-react-query` example (TanStack
  Router repo, fetched 2026-07-04).
- **NAS/UNC gotcha**: `bun add` does not persist `package.json`/`bun.lock` on the
  UNC checkout. The dependency change (`chore(deps): add @tanstack/react-query`)
  was made from a local non-UNC clone, committed, pushed, then `bun install`
  extracted `node_modules` on the NAS from the committed lockfile.
- Phase 0 files: `src/router.tsx`, `src/routes/__root.tsx`, `src/app/devtools/index.tsx`,
  `src/lib/api/query-keys.ts` (+ test), `test/queryWrapper.tsx`.
