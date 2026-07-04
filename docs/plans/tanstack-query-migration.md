# TanStack Query Migration Plan

Date: 2026-07-04 · Status: PROPOSED · Owner: Ed
Origin: 2026-07-04 frontend-fundamentals audit root-cause note ("no TanStack Query despite the TanStack stack"). Grounded against the official `start-basic-react-query` example (TanStack Router repo, fetched 2026-07-04).

## Goal

Replace hand-rolled server state (`useState`/`useCallback` hooks with mirror refs, manual race tokens, bespoke dedupe cache) with TanStack Query, feature by feature, without changing any API route, response envelope, or RLS behavior.

**Non-goals:** no API/contract changes; no auth model change (client-side gating stays until P13 server-session bootstrap lands — see Constraints); no redesign of feature UX; workout-session's *local* in-progress editing state stays local (Query manages server sync, not keystrokes).

## Why (recap)

Hand-rolled server state is the audit's root cause for: god-hooks (`useExerciseLibrary` 530 lines with 3 manually-synced mirror refs, `useWorkoutSession` 740), stale-response races in history/calendar (the `prefillRequestRef` fix exists in exactly one place), a hand-built optimistic favourites toggle, a bespoke dedupe/TTL cache (`src/lib/api/cache.ts`), and zero loaders/preload on a framework built for them. Query provides all of this, tested, for free.

## Constraints & environment

- **NAS lockfile gotcha:** `bun add` does not persist `package.json`/`bun.lock` on the UNC checkout. Do the dependency change from a **local (non-UNC) clone**, commit, then pull on the NAS copy.
- **Client-side auth only (pre-P13):** there is no server session bootstrap, so **route loaders cannot prefetch private data during SSR** — a server-rendered loader has no user. Consequence: private data stays on client-side `useQuery` (Phase 1–4); loader/SSR prefetch (Phase 5) applies only to public/catalog data until P13 lands. Do not let this plan silently expand into P13.
- Repo rules apply throughout: rtk-prefixed commands, Bash only, branch-per-phase PRs, verification checklist (format → lint → focused tests → Vercel build → smoke), mobile-first.
- Known pre-existing defect: husky pre-commit fails on UNC (path doubling). Run checks manually; don't let `--no-verify` hide new failures.

## Target architecture

```
feature component
  → useQuery/useMutation (thin feature hooks)
    → queryOptions factories in feature client.ts   ← clients keep readApiData + envelope, unchanged transport
      → /api/* routes → privateMethod → queries → RLS   ← untouched
```

- `QueryClient` created in `getRouter()`, passed via router `context`, wired with `setupRouterSsrQueryIntegration({ router, queryClient })` (official pattern; the dep is already in package.json).
- Feature `client.ts` files stop being imperative fetchers and export `queryOptions` factories (e.g. `calendarDataOptions(month)`) plus mutation functions. The `readApiData<T>` envelope helpers stay exactly as they are — Query wraps them, it doesn't replace them.
- Errors: Query's `throwOnError` stays default-off; hooks expose `error` the way current state fields do, so component error UI is unchanged. GlobalErrorBoundary (wired 2026-07-04) is the backstop.

### Query key convention (single source: `src/lib/api/query-keys.ts`)

| Domain | Key shape |
|---|---|
| calendar | `['calendar', { month }]` |
| workout-sessions list | `['workout-sessions', 'list', filters]` |
| workout-session detail | `['workout-sessions', 'detail', sessionId]` |
| workout-sets history | `['workout-sets', 'history', exerciseId]` |
| exercise catalog/search | `['exercises', 'search', filters]` (infinite), `['exercises', 'facets']` |
| favourites | `['exercises', 'favourites']` |
| recents/suggestions | `['exercises', 'recent']`, `['exercises', 'suggestions']` |
| templates | `['workout-templates', 'list']`, `['workout-templates', 'detail', id]` |
| progress | `['progress', params]` |
| locations | `['workout-locations']` |

Rule: keys are built ONLY via exported factories (`queryKeys.calendar(month)`), never inline arrays — invalidation then can't typo-miss.

### Defaults

`staleTime: 30_000` app-wide (gym sessions are single-user; aggressive refetch buys nothing), `gcTime` default, `refetchOnWindowFocus: true` (nice for returning to the PWA), `retry: 1`. Static catalog facets: `staleTime: Infinity` — this **replaces and deletes `src/lib/api/cache.ts`** (its TTL/dedupe semantics map 1:1 onto staleTime + Query dedupe).

## Phases

Each phase: own branch + PR, TDD (hook tests wrap in a fresh `QueryClientProvider` per test — add one shared `test/queryWrapper.tsx` helper in Phase 0), full repo verification checklist, `pjm` logging, `graphify update .` when ≥5 files.

### Phase 0 — Enablement (small, no behavior change)

1. From a **local clone**: `bun add @tanstack/react-query @tanstack/react-query-devtools`; align existing `@tanstack/*` minors if the resolver demands it (current: router ^1.130, ssr-query ^1.131, start ^1.131 — `setupRouterSsrQueryIntegration` exists at these versions; bump only if the build says so). Commit, pull on NAS.
2. `src/router.tsx`: create `QueryClient` in `getRouter()`, add to router `context` (type it in the route context interface), call `setupRouterSsrQueryIntegration({ router, queryClient })`.
3. Devtools: lazy, `import.meta.env.DEV`-gated, matching the existing router-devtools pattern in `__root.tsx`.
4. Add `src/lib/api/query-keys.ts` (factories above) + `test/queryWrapper.tsx`.
5. **ADR-0007: "Adopt TanStack Query for server state"** — context (audit root cause), decision, the pre-P13 SSR constraint, the key convention, and the cache.ts retirement.
- Verify: build + smoke green; app behavior identical (nothing consumes Query yet).
- Exit criteria: `useQuery` usable in any feature; ADR merged.

### Phase 1 — Pilot: calendar (smallest live-race site)

1. `calendar/client.ts`: export `calendarDataOptions(month)` via `queryOptions`; fix the audit's envelope deviation (#finding: `readApiResult as` → typed `readApiData<T>`) as part of the rewrite.
2. `useCalendarData` becomes a thin wrapper: `useQuery(calendarDataOptions(month))` + month-navigation local state. This deletes the manual `loadCalendarData`, the setState-with-fetch-inside bug (issue #0003's calendar site), and the stale-response race in one move.
3. `WorkoutDetailModal`'s day drill-down: `['calendar', 'day', date]` query.
4. Mutations affecting calendar (session save/delete elsewhere) don't exist inside this feature yet — note the invalidation contract (`invalidateQueries(['calendar'])`) for later phases.
- Tests: existing calendar tests migrate to the wrapper; add one race test (rapid month flips resolve to last-requested month — Query guarantees it, the test pins it).
- Exit criteria: calendar renders identically; issue #0003's calendar site closed; race test green. **Decision gate: review diff size + hook LOC before/after. If the pilot doesn't convince, stop here with only Phase 0+1 merged (both are strict improvements) and record the reversal in ADR-0007.**

### Phase 2 — workout-history + workout-detail

1. `['workout-sessions','list',filters]` query replaces `useWorkoutHistory.loadSessions` (kills its stale-response race); `useMutation` for delete/duplicate with `invalidateQueries(['workout-sessions'],['calendar'])`.
2. Fixes audit finding "duplicate failures render in delete UI" naturally: each mutation carries its own `error`.
3. `workout-detail`: `['workout-sessions','detail',id]`; fix `loadWorkoutDetailsForSession` workouts[0] fallback (return null on id miss) while rewriting.
- Exit criteria: history/detail behavior identical; duplicate/delete errors separated; races pinned by test.

### Phase 3 — exercise-library (the god-hook payoff)

Split `useExerciseLibrary` (530 lines) along Query seams:
1. `useExerciseSearch` — `useInfiniteQuery(['exercises','search',filters])` (pagination is currently hand-rolled); facets via `['exercises','facets']` `staleTime: Infinity`.
2. `useFavoriteExercises` — query + `useMutation` with `onMutate` optimistic toggle / `onError` rollback / `onSettled` invalidate; deletes the hand-rolled optimistic logic and the `reflectFavouritesIfActive` mirror-ref patch-ups.
3. `useExerciseQuickPicks` — recents + suggestions queries.
4. **Delete `src/lib/api/cache.ts`** once its last consumer (facet caching) moves; grep to confirm zero imports.
5. `ExerciseHistory.tsx` raw-fetch bypass (audit finding): becomes `useQuery(['workout-sets','history',exerciseId])` using the shared client — bypass gone.
- The three mirror refs die with the split. ADR-0005 (favourites filter client-side) still holds — reference it.
- Exit criteria: `useExerciseLibrary` deleted or reduced to a compatibility façade < 100 lines; favourites optimistic behavior pinned by test; cache.ts gone.

### Phase 4 — workout-session + templates (highest care)

Principle: Query owns **server sync**, local state owns **in-flight editing**. Do not put per-keystroke set entry into the query cache.
1. Reads: active-session bootstrap + last-performance prefill become queries (`['workout-sessions','detail',id]`, `['workout-sets','history',exerciseId]`); the hand-rolled `prefillRequestRef` race token retires (Query's request identity replaces it — keep the regression test).
2. Writes: save-set / save-session / complete / change-exercise become mutations with targeted invalidation (`['workout-sessions']`, `['calendar']`, `['exercises','recent']`). The save-sequence guard in `useTransactionEditorWorkflow`-style… (gymmie equivalent: `saveSeq`) maps to mutation + `onMutate` snapshot; port its test.
3. Autosave debounce stays a UI concern (debounce → `mutate`), replacing the currently-dead metadata-save machinery (audit dead-code finding) — wire it or delete it here, decide in PR.
4. Templates: list/detail queries + CRUD mutations; note the lib-layer transactionless-update issue (#0004) is NOT fixed by this migration — invalidation just re-reads whatever the API returns. Keep it as its own issue.
- Exit criteria: full workout flow (start → log sets → complete → appears in history+calendar) passes smoke + manual mobile pass; no regression in the completion-seed lifecycle tests.

### Phase 5 — loaders, preload & cleanup (public data only, pre-P13)

1. Public/catalog routes (`/exercises` browser): route loaders call `context.queryClient.ensureQueryData(exerciseSearchOptions(...))` for instant paint + `defaultPreload: 'intent'` benefits. Private routes stay client-fetch until P13.
2. Delete: dead `startWorkoutFromTemplate` (audit), any remaining imperative load functions, unused exports; run the audit's dead-code list.
3. ADR-0007 addendum: what moved, what stayed, the P13 follow-up ("when server sessions land, promote private queries to loader prefetch").
4. `graphify update .`; update `status.md`.
- Exit criteria: zero hand-rolled server-state fetch paths outside Query (grep for `readApiData(` importers — should be only queryOptions factories); suite + smoke green.

## Testing strategy

- Every migrated hook: wrap in fresh `QueryClientProvider` (helper from Phase 0), `retry: false` in tests.
- Pin the races Query fixes (month-flip, filter-flip, prefill) — they're regression contracts, not implementation tests.
- Contract tests, API tests, RLS behavior: untouched by design — any api/ diff in these PRs is scope creep.
- Each phase ends with the repo checklist: `rtk bun run format` → lint → focused tests → clear `.vercel/output` → `SERVER_PRESET=vercel rtk bun run build` → `rtk bun run smoke`.

## Risks & operational costs

| Risk | Mitigation |
|---|---|
| Version bump ripples across `@tanstack/*` peers | Phase 0 is isolated; build+smoke gate before any feature code |
| Behavior drift in loading/error UI during hook rewrites | Keep hook return shapes compatible where cheap (components mostly consume `ReturnType<typeof useX>` — the hooks-as-controllers pattern localizes the blast radius to one hook + its components per phase) |
| Cache-invalidation misses (stale list after mutation) | Central key factories + per-phase invalidation contract listed in PR description; smoke covers the cross-feature flows |
| workout-session regressions (highest-traffic feature) | It goes LAST, after the team has three phases of Query experience; its existing race/lifecycle tests are ported first |
| Maintenance cost of Query itself | One well-known dependency replacing ~4 bespoke mechanisms (mirror refs, race tokens, TTL cache, optimistic toggle) — net negative complexity |
| Pilot disappoints | Explicit Phase-1 decision gate; Phases 0–1 are strict improvements even standalone |

## Sequencing & sizing

| Phase | Size | Depends on |
|---|---|---|
| 0 Enablement + ADR | S (½ session) | local clone for install |
| 1 Calendar pilot | S–M | 0 |
| 2 History + detail | M | 1 (gate) |
| 3 Exercise library | L (god-hook split) | 1 (gate); parallelizable with 2 |
| 4 Workout session + templates | L | 2 & 3 (invalidation targets exist) |
| 5 Loaders + cleanup | S | 4; loader prefetch limited until P13 |

Suggested execution: one subagent per phase, sequential PRs, operator review at the Phase-1 gate and after Phase 4.
