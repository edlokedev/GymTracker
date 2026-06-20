# Plan: Fix calendar "today empty" (TZ) + saved-workout prefill

_Locked via grill-with-docs — by Claude + Eddie. Terms per CONTEXT.md. Revised after Codex Rounds 1–4._

## Goal

Two user-reported bugs in Gymmie:

1. **Calendar off-by-a-day.** A Workout Session logged "today" does not appear on today's
   cell in the dashboard calendar (today shows empty); it lands on a neighbouring day. The
   same session renders on the correct day in History. Root cause: the app has **two
   compensating timezone bugs** around the `workout_sessions.date` column (a Postgres
   `date`, i.e. a calendar day with no time/zone):
   - **Write side** derives "today" from **UTC**: `new Date().toISOString().split('T')[0]`
     (or `.slice(0,10)`) in `useWorkoutSession.todayString()`, the `routes/workout.tsx`
     session scaffold, and `workoutSessionQueries.create()` (server fallback).
     `startFromTemplate` and `duplicate` set the date **server-side** (Vercel = UTC) with no
     client date at all. For a user **behind UTC** logging in the local evening, the UTC day
     is already *tomorrow*, so the session is stored on tomorrow's date.
   - **Display side** re-parses the date-only string with `new Date("YYYY-MM-DD")` — which JS
     parses as **UTC midnight** — then formats it in **local** time, shifting the *displayed*
     day by the user's offset and coincidentally cancelling the write error for behind-UTC
     users, so History "looks correct."
   - The **calendar grid** parses with `dayjs(date)` (local midnight) — the correct
     interpretation — so it alone exposes the drift.

   Net: the calendar grid is right; the stored date and the history display are both
   wrong-but-cancelling. The fix must make the **write, the query window, and every display
   site** agree on the user's **local calendar day**. Fixing one side alone regresses another.

2. **Saved workouts don't prefill previous values.** Starting a workout from a saved workout
   (a Workout Template) shows "First set for this exercise" with no last-performance prefill,
   whereas manually adding the same exercise does prefill. Prefill is driven by
   `lastPerformanceByExerciseId`, populated by `loadLastPerformanceDefaults()` — called in
   `addExercise` (manual add) but **not** in `startSessionFromTemplate` or `loadSessionData`.

## Approach

### Bug 1 — one consistent local-calendar-date model (write + query + display)

**A. Date utilities** (extend `src/lib/utils/calendar.ts`, the dayjs home):
- `getLocalCalendarDate(d: Date = new Date()): string` → local `YYYY-MM-DD`
  (`dayjs(d).format('YYYY-MM-DD')`).
- `parseCalendarDate(dateOnly: string): Date` → `dayjs(dateOnly).toDate()` (local midnight),
  for display code that needs a `Date`. Greppable, single source of truth.

**B. Write side — store the user's local day on every creation path:**
1. `useWorkoutSession.todayString()` → `getLocalCalendarDate()`.
2. **Midnight-freeze fix (Codex #8, R2 #3):** `todayString()` and `sessionStartTime` both
   freeze at mount. In `startSession`, if the user has **not** edited them, recompute
   **both** `sessionDate = getLocalCalendarDate()` and `start_time = new Date().toISOString()`
   at submit time (track "user edited date" / "user edited start time" flags). Prevents a page
   left open past midnight from logging yesterday's date or a stale start timestamp / wrong
   duration.
3. `routes/workout.tsx` scaffold (line ~45): replace `now.toISOString().slice(0,10)` with
   `getLocalCalendarDate()` (or drop the optimistic date scaffold so it isn't autosaved).
4. `startFromTemplate` & `duplicate`: client sends its **local** date in the POST body
   (`date: getLocalCalendarDate()`); handlers pass it through to the queries → `create`.
   - **Calendar-date schema (Codex #1, #2, R2 #2, R3 #4):** define ONE strict calendar-date
     zod schema that validates a **real** day, not just the shape — regex `^\d{4}-\d{2}-\d{2}$`
     **plus** a `.refine` using strict dayjs parsing (`customParseFormat`, `dayjs(s,'YYYY-MM-DD',true).isValid()`
     + round-trip `format` equality) so `2026-02-31` is rejected rather than silently
     normalized by dayjs or erroring in Postgres. Reuse it on **every** `workout_sessions.date`
     input/query path: create body (`workout-sessions.contract.ts:74`), update/patch body
     (`:86`), workout-details date query (`workout-details.contract.ts:41`), `date.optional()`
     on `startFromTemplateBody` (currently `.strict()`, templateId-only), and a new body schema
     for the `duplicate` action (route currently reads no body).
   - **Runtime validation (R3 #3):** contracts are **test-only** — `makePrivateMethod`
     (`define-private-route.ts:54`) invokes handlers without parsing. So also validate the
     `date` explicitly **inside** the handlers (`api.workout-sessions`, `api.workout-details`,
     `api.calendar-data`) using the shared schema/validator, returning `badRequest` before any
     query. The zod schema continues to back the contract tests.
   - Update **both** duplicate clients (workout-history + workout-detail) to POST `{ date }`.
5. `workoutSessionQueries.create` keeps `data.date ?? <UTC today>` as a **last-resort**
   fallback only; all real callers now pass a local date.

**C. Query window — make the calendar range date-only and local (Codex #3, #4):**
- Change the calendar API range from `Date`/ISO instants to date-only strings end-to-end.
  Client sends `start`/`end` as local `YYYY-MM-DD` (from `getLocalCalendarDate`), not
  `toISOString()`. `resolveCalendarRange` / `getCalendarAggregate` use those strings directly
  for `.gte/.lte('date', …)` and for the gap-fill loop (iterate dates as strings/dayjs-local),
  instead of `range.startISOString.split('T')[0]`. Keep `Date` only where the UI needs it.
  This removes the edge-day include/exclude error and the summary/grid count mismatch.
- **Summary must use a client-local "today" decoupled from the window (R2 #1, R3 #1):**
  `calculateCurrentStreak`, `calculateAverageWorkoutsPerWeek`, `getWorkoutsThisMonth`, and the
  `yearStart` derivation in `getCalendarAggregate` currently use `dayjs()`/`new Date()` =
  Vercel UTC. The client sends a **separate** `today=YYYY-MM-DD` param (NOT `range.end` —
  the user can navigate to a past/future window, where the end bound is not actual today).
  Thread that `today` into these utilities and derive year/month/streak from it. The
  `start`/`end` params remain only the query window.

**D. Display side — parse `session.date` as a local calendar day everywhere** (swap
`new Date(<date-only>)` → `parseCalendarDate(...)`; keep `new Date()` for real timestamps —
`start_time`/`end_time`/`created_at`/`updated_at` — and leave duration/relative math alone):
- `calendar/model.ts` `toWorkoutEvents` (Codex #5).
- `workout-history/model.ts`: `formatWorkoutDate`, `getLastWorkoutDate`.
- `workout-history/useWorkoutHistory.ts:197` selected-date hydration (Codex #6).
- `workout-detail/model.ts`: `getWorkoutDetailLabel` / `formatWorkoutSummaryDate` (date-only).
- `workout-session/components/WorkoutSessionCard.tsx` `formatDate`.
- `calendar/components/WorkoutSummaryStats.tsx` `formatLastWorkout` (+ its date source).
- `exercise-library/components/ExerciseHistory.tsx` date-only `session_date` rendering.

**E. Month-boundary fix (Codex #9, R3 #2):** `getWorkoutsThisMonth` uses strict
`isAfter(startOfMonth)`/`isBefore(endOfMonth)`, dropping a workout dated the 1st (local
midnight). Change its signature to `getWorkoutsThisMonth(workoutDates, todayDate)` and compare
each date with `dayjs(date).isSame(dayjs(todayDate), 'month')` — using the client-local
`today` from step C, **not** server `dayjs()`.

**F. Streak dedup (R4 #1):** `calculateCurrentStreak`/`calculateLongestStreak` assume one
entry per day; two sessions on the same day break consecutive counting
(`today,today,yesterday` stops at 1). Dedupe `workoutDates` to **unique local calendar days**
before the streak math, and base "current" on the client-local `today` from step C.

**G. Partial-range hygiene (R4 #2):** `resolveCalendarRange` silently falls back to the
default window when only one of `start`/`end` is present. In `api.calendar-data`, `badRequest`
when exactly one bound is supplied, and validate `today` independently with the calendar-date
schema.

**H. Existing data:** forward-only (user confirmed). The session logged "today" is currently
stored on the wrong day; it is editable via the session Date field in `WorkoutSessionManager`,
so the user fixes it manually. No backfill (cannot recover the original zone; a date can
legitimately be a past day).

### Bug 2 — load last-performance defaults for template-started and resumed exercises

1. Add `loadLastPerformanceDefaultsForExercises(exerciseIds: string[])` to
   `useWorkoutSession`: **dedupe** ids, fetch `loadWorkoutSetHistory(id, 1)` per id via
   `Promise.allSettled` (best-effort; per-id failure ignored), merge hits into
   `lastPerformanceByExerciseId` (reuse `mapHistoryItemToWorkoutSet`).
2. **Stale-merge guard (Codex #10, R2 #4):** use an explicit incrementing request-token
   `useRef` — bump it at the start of each load, capture the value in the closure, and discard
   the merge if the ref has advanced when the fetch resolves. Do **not** rely on `session?.id`
   state (stale inside async closures).
3. Call it from `startSessionFromTemplate` (after `setExercises(plannedExercises)`) and from
   `loadSessionData` (after `setExercises(loadedExercises)`). The
   `setDefaults = previousSet ?? lastPerformanceSet` precedence means exercises with
   in-session sets are unaffected; only zero-set exercises gain prefill.

## Key decisions & tradeoffs

- **Write + query window + display all move to local calendar day together.** The bugs
  currently cancel for behind-UTC users; touching one side alone produces a visible
  regression in another. This is the central risk and why the change spans several files.
- **Client is the source of truth for the calendar day**; server stays UTC-fallback only.
  Alternative (store `timestamptz` + a zone/offset and bucket server-side) is a schema change
  and far larger; rejected. Matches the existing `date`-column design in CONTEXT.md. No ADR —
  reversible, no hard-to-undo architecture decision.
- **Bug 2 prefill via `lastPerformanceByExerciseId`, not pre-created sets** — mirrors
  manual-add exactly (empty `SetEntry` pre-filled; nothing auto-saved).
- **N parallel history requests** when starting a template with N exercises. Acceptable for
  realistic N; a batch endpoint is a later optimization (out of scope).

## Risks / open questions

- Confirm Supabase returns `workout_sessions.date` as a plain `YYYY-MM-DD` string (expected
  for a Postgres `date`); the local-parse fix depends on it. Verify against a real row /
  generated types during implementation.
- Calendar range change touches the `calendar-data` contract and its contract test — update
  `tests/contract/calendar-data.test.ts` and the `calendar-data.contract.ts` query schema to
  date-only bounds; keep response shape stable.
- Tests: TZ-aware cases (mock a non-UTC offset, e.g. `TZ=America/Los_Angeles` and a
  UTC+ zone) proving a session logged "today" lands on today in calendar grid **and** history
  **and** is inside the rolling window and summary counts; month-boundary case for the 1st;
  prefill tests for template-start and resumed sessions; stale-merge guard test.

## Out of scope

- TanStack Query adoption / mutation-driven cache invalidation (`lib/api/cache.ts` is
  catalog-only and not involved).
- Backfilling or migrating existing mis-dated rows.
- Any schema change to `workout_sessions.date`.
- A batch "last performance for many exercises" API endpoint.
