# Frontend Fundamentals Audit — 2026-07-04

Full-frontend audit (~150 non-test source files: `src/features`, `src/routes`, `src/app`, `src/components/ui`, `src/lib`) against the `frontend-fundamentals` skill's four criteria (readability, predictability, cohesion, coupling) plus the react/typescript review guides. Three parallel reviewers (features, routes+app+ui, lib); read-only — no code changed.

**Verdict: good shape overall, two Critical findings, both in the shell layer.** The layering is consistently applied (feature-first folders with pure models, thin typed clients, uniform API envelope, RLS-backed queries with identity always server-derived, no service-role key anywhere near the client). The recurring defect classes are: side effects inside React state updaters, sibling inconsistency (auth guards, HTTP verbs, validation rigor, not-found conventions), and shapes/types maintained in multiple unlinked places.

## Critical

1. **`/workout` is a dead end for unauthenticated users** — `src/routes/workout.tsx:66-80` shows "Sign in with Google to access…" with no sign-in control; the comment defers to Header, but `ConditionalHeader` (`__root.tsx:76-78`) returns `null` when unauthenticated. Fix: render the shared `LoginPage` like `index.tsx:37-39`, or extract a `RequireAuth` guard for all private routes.
2. **`GlobalErrorBoundary` is dead code** — `src/app/components/GlobalErrorBoundary.tsx` is referenced only by its own test; no `errorComponent` is registered anywhere, so runtime errors have no boundary. Fix: register it on the root route (and remove its internal `<Header/>` to avoid doubling, and the no-op `router.invalidate()` race).

## Important (by theme)

**React correctness — side effects inside state updaters (StrictMode double-fires all of these):**
- `useWorkoutSession.ts:518-525, 541-549` (setters nested in `setExercises` updaters), `WorkoutSessionManager.tsx:282-292, 202-215` (state + DOM focus inside updater), `useCalendarData.ts:96-113` (**network fetch** inside `setState` → double-fetch), `WorkoutTemplateEditor.tsx:64-70`. Fix pattern everywhere: compute next value first, then set state, then run effects.

**Data integrity (lib):**
- Transactionless delete-all-then-insert in `workout-templates.ts:284-305` (`update`) can permanently empty a template on mid-write failure; `workout-sessions.ts:255-280` (`duplicate`) loops inserts with a swallowed compensating delete. Fix: SQL function/RPC like `repoint_workout_exercise` already does.
- `workout-templates.ts:169` returns `{ source: null as never }` — type-system lie; future callers crash where the compiler promised safety. Fix: discriminated union.
- `exercise-discovery.ts:91-99` `listRecentRows` has no `.limit()` — PostgREST's 1000-row cap silently truncates heavy users' history (sibling `exercise-catalog.ts` paginates specifically to defeat this).
- `api.workout-sets.ts:41` — `!data.set_order` rejects a legitimate `set_order: 0`.

**Sibling inconsistency (predictability):**
- Auth guards: three treatments across private routes (skeleton+LoginPage / hand-rolled dead end / no guard at all on progress, history, workouts.*). One shared guard.
- HTTP verbs: PATCH vs PUT for the same-kind partial update across the three api.workout-* routes.
- Pagination parsing: `api.exercises.recent.ts` clamps 1–50; `api.workout-sessions.ts`, `api.exercises.search.ts`, `api.progress.ts` accept NaN/unbounded. Extract one `parsePaginationParams`.
- Body validation: `api.exercises.custom.ts` zod-parses at runtime; other mutating routes blind-cast `await request.json()`. Adopt the zod pattern.
- Not-found conventions: CRUD queries return null/false, discovery throws `notFound()`.
- Calendar client uses `readApiResult(...) as` + success re-checks in the hook while every sibling uses typed `readApiData<T>`.

**Cohesion/coupling:**
- Type/shape triplication with no compiler link: `CalendarSummary` in three places; `workoutSet` zod schema copy-pasted between contracts; two incompatible exported types both named `WorkoutSessionWithSets` (`types/database.ts:168` vs `types/calendar.ts:58`). Tie types to contracts via `z.infer`; delete the unused variant.
- `database.types.ts` is a permissive placeholder (`Row: Record<string, unknown>`) — root cause of the downstream cast blizzard (`as SessionRow`, `as never`, query-client launderers). Run `supabase gen types typescript --linked` as the file header instructs.
- lib→features import inversion: `queries/workout-templates.ts:1` imports from `@/features/workout-templates/model`.
- `useExerciseLibrary` (530 lines) is a god-hook with three manually-synced mirror refs; split into search/favourites/quick-picks hooks.
- `ExerciseHistory.tsx:45-74` bypasses the client layer with raw fetch + hand-rolled envelope unwrapping.
- Contracts barrel (`contracts/index.ts`) claims "every route contract" but misses `customExercisesContract`.
- Dead code: `CategoryFilter.tsx` + `MuscleGroupFilter.tsx` (zero imports), `startWorkoutFromTemplate` (test-only, and reintroduces the fixed UTC-midnight date bug if ever called), unused debounced-metadata-save machinery in `useWorkoutSession`.

**UX-behavior bugs:**
- "Reset Filters" empty-state button calls `window.location.reload()` (`ExerciseGrid.tsx:113`).
- Duplicate-session failures render in delete-flavored UI (`useWorkoutHistory.ts:104-117` reuses `deleteError`).
- `loadWorkoutDetailsForSession` falls back to `workouts[0]` — asking for session X can silently return session Y (`workout-history/client.ts:34-36`).

## Suggestions (condensed)

Stale-response races in history/calendar list loaders (reuse the `prefillRequestRef` house pattern); un-cleared timers (`ExerciseSelector` debounce, three `saveStatus` timeouts); triplicated formatters that must stay in sync (duration ×3, title-casing ×3, "time since last workout" ×2 with *different* semantics — floor/"1 day ago" vs ceil/"Yesterday"); intensity colors defined in three places; `fetchLocationNames` consumed by three features but living in workout-session; Header has zero `dark:` variants while everything else ships them; `useCalendarData(user?.id || '')` empty-string sentinel; ConfirmDialog lacks focus trap/scroll lock; `targetSets` NaN on cleared input; redundant `as string` casts after `never`-returning guards; `api.progress.ts` server-timezone default date range (accept client `today` like calendar does); stale doc headers in auth/cookies modules; `null→0` coercions making zero ambiguous; magic intensity thresholds; clickable divs without keyboard semantics.

## Explicitly not flagged (guide tension calls)

ActionIcons duplication (guide-sanctioned duplication over premature abstraction); per-feature client thinness variations; hooks-as-controllers passed whole into components (`ReturnType<typeof useX>` props) — a deliberate pattern trading hook-shape coupling for zero props drilling.

## Praise — patterns to preserve

- API route layer: `privateMethod`/`publicMethod` wrappers with injectable auth resolver — identity never read from query/body in any of 15 routes; handlers exported bare for contract tests.
- `errors.ts` Postgres→HTTP mapping with security rationale written at the mapping site (RLS 42501→404 to avoid existence leaks, traced to ADR-0002).
- `auth.callback.tsx` open-redirect protection with explanatory comments; `custom-exercise-input.ts` server-side re-validation that image URLs point inside the caller's own storage folder.
- Discriminated-union validation results in `setEntry.ts` and `custom-exercise.ts`; uniform thin typed clients; local-calendar-day discipline (`getLocalCalendarDate` everywhere) with midnight-crossing guards.

## Per-criterion health (whole frontend)

| Criterion | Health | One-liner |
|---|---|---|
| Readability | Good | Strong "why" comments and small files; drags: dead code, 1,050-line WorkoutSessionManager, duplicated tab JSX. |
| Predictability | **Weakest** | Same-kind siblings diverge on auth, verbs, validation, envelopes, not-found; state-updater side effects; type-system lies. |
| Cohesion | Fair | Feature-first layout is textbook; shapes triple-maintained without compiler links; unwired error boundary. |
| Coupling | Fair-Good | RLS boundary + narrow query modules are solid; god-hooks with mirror refs and one lib→features inversion are the debt. |

Root-cause note: several defect classes (god-hooks, hand-rolled race guards, stale-response races) trace to hand-rolled server state — no TanStack Query despite the TanStack stack. Adopting it is a larger architectural decision, not a line fix; weigh separately.

Reviewers: 3 parallel agents, session 65a97bf6, 2026-07-04. Rubric: `N:/ODIN/skills/frontend-fundamentals/SKILL.md` + code-review-and-quality react/typescript guides.
