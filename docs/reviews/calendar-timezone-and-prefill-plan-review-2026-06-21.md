# Plan Review Log: Fix calendar TZ bug + saved-workout prefill
Act 1 (grill-with-docs) complete — plan locked. CONTEXT.md/ADRs unchanged (no new domain term; no hard-to-reverse decision — uses the existing `date`-column model). MAX_ROUNDS=5. PLAN_FILE=docs/plans/bugfix-calendar-timezone-and-saved-workout-prefill.md. LOG_FILE=docs/reviews/calendar-timezone-and-prefill-plan-review-2026-06-21.md.

## Round 1 — Codex
thread_id: 019ee5ba-6d05-74e0-a0e7-e22881438021 — VERDICT: REVISE

1. `startFromTemplateBody` is `.strict()` (templateId only) — plan adds `date` but not the contract. Fix: add `date` (optional) to the start-template body schema + handler type.
2. `duplicate` path never reads a POST body, and duplicate clients send none. Fix: duplicate clients send `{ date }`; route parses + passes through.
3. Calendar DB range strips UTC ISO via `.split('T')[0]` — for non-UTC users the window includes tomorrow / previous day, so summary can count rows that aren't rendered. Fix: query date-only **local** `YYYY-MM-DD` bounds, not server-split ISO instants.
4. `resolveCalendarRange` models the range as `Date`; switching client params to date-only would re-trigger `new Date("YYYY-MM-DD")` UTC parsing. Fix: model the API range as `{ startDate, endDate }` strings; keep `Date` only in the UI.
5. `calendar/model.ts toWorkoutEvents` uses `new Date(day.date)` — reintroduces the UTC-midnight shift for date-only events. Fix: `parseCalendarDate(day.date)`.
6. `useWorkoutHistory.ts:197` hydrates a selected date via `new Date(session.date)` — missed display site. Fix: `parseCalendarDate`.
7. `routes/workout.tsx:45` editor scaffold uses `now.toISOString().slice(0,10)` — another UTC write path. Fix: local calendar util / drop the fake scaffold.
8. `todayString()` freezes "today" at mount; a page left open across midnight logs yesterday. Fix: recompute local date at `startSession` when the user hasn't edited the date.
9. `getWorkoutsThisMonth` uses strict `isAfter(startOfMonth)`/`isBefore(endOfMonth)`, excluding a workout on the 1st. Fix: compare by month (`isSame(dayjs(),'month')`) or inclusive bounds.
10. Batch prefill can merge stale history after a session/template switch. Fix: request-token guard + `Promise.allSettled` over deduped ids.

### Claude's response
Accepted all 10 (final arbiter). #1–#2 are correctness blockers (contract `.strict()` rejection; duplicate ignores body). #3–#4 expose that the calendar **query window** is itself UTC-split — fixing only write/display would leave an edge-day mismatch + miscounted summary, so the range now becomes date-only strings end-to-end. #5–#7 are write/display sites I missed (added to the explicit lists). #8 (midnight freeze) and #9 (month-boundary) are real latent bugs in the same surface — folded in. #10: prefill loader now dedupes ids, uses `allSettled`, and guards against stale merges via a session/template token. Plan revised below.

## Round 2 — Codex
Prior 10 confirmed addressed. VERDICT: REVISE — 4 new blockers:

1. Server-side summary still uses server "now": `calculateCurrentStreak`, `calculateAverageWorkoutsPerWeek`, `getWorkoutsThisMonth`, and `yearStart` derive from `dayjs()`/`new Date()` (Vercel UTC) even after the query window goes local. Fix: thread a client-local `today` (date-only) into the summary utilities and derive year/month/streak from it.
2. Date-schema breadth: only the new start/duplicate bodies were tightened; existing create/update body `date` and the workout-details date query remain broad `z.string()`. Fix: define ONE strict `YYYY-MM-DD` calendar-date schema and reuse it on every `workout_sessions.date` input/query path.
3. Midnight-freeze fix only recomputed `sessionDate`; `sessionStartTime` is also frozen at mount → a "today" session can get yesterday's start timestamp + wrong duration. Fix: recompute `start_time` at `startSession` too (when the user hasn't explicitly edited it).
4. Prefill stale guard via `session?.id` is itself stale inside async closures. Fix: explicit incrementing request-token ref (or capture the `sessionId`/`templateId` arg and compare to a synchronously-updated ref).

### Claude's response
Accepted all 4. #1 is the deepest: making the window local without making the summary local would leave streak/avg/this-month/year still UTC — so the aggregate now passes a client-local `today` into the summary utils. #2: introduce a shared strict calendar-date zod schema and apply it across create/update/start/duplicate/details. #3: recompute both `sessionDate` and `start_time` at `startSession` unless user-edited. #4: switch the guard to an incrementing request-token ref. Plan revised below.

## Round 3 — Codex
Round 2 items reflected. VERDICT: REVISE — 4 new issues:

1. `today = range.end` is wrong when the user navigates to a past/future window — streak/avg/month/year would be relative to the viewed range, not actual today. Fix: client sends a separate `today=YYYY-MM-DD` param used only for summary math; `start`/`end` remain the query window.
2. Internal conflict: section C says pass client-local today into `getWorkoutsThisMonth`, but section E still wrote `isSame(dayjs(),'month')` (server now). Fix: `getWorkoutsThisMonth(workoutDates, todayDate)` comparing against `dayjs(todayDate)`.
3. Contract zod schemas are NOT runtime route validation — `makePrivateMethod` calls handlers directly; contracts are test-only. Fix: explicitly parse/validate date fields inside `api.workout-sessions`, `api.workout-details`, `api.calendar-data` handlers and `badRequest` before querying.
4. Regex-only `calendarDate` is shape-only — `2026-02-31` passes and then normalizes in dayjs or errors in Postgres. Fix: strict real-calendar validation (dayjs `customParseFormat` strict + round-trip, or a zod `.refine`).

### Claude's response
Accepted all 4. #1: add an explicit `today` request param decoupled from the navigable window. #2: resolve the contradiction — `getWorkoutsThisMonth` takes `todayDate`. #3 is an architecture correction I verified in `define-private-route.ts:54` (handlers run unparsed) — add explicit runtime date validation in the three route handlers, with the zod schema still backing contract tests. #4: calendarDate validates a real calendar day (strict dayjs parse + round-trip / refine), shared by the runtime validator and the contract schema. Plan revised below.

## Round 4 — Codex
Round 3 resolved. VERDICT: REVISE — 2 edge cases in touched paths:

1. Streak funcs operate on raw session dates, so two sessions on the same day break consecutive counting (`today,today,yesterday` stops at 1). Fix: dedupe `workoutDates` to unique calendar days before `calculateCurrentStreak`/`calculateLongestStreak`.
2. `resolveCalendarRange` silently falls back to the default window if only one of `start`/`end` is present; with new validation, a partial window shouldn't quietly query the default. Fix: `badRequest` in `api.calendar-data` when exactly one bound is supplied; validate `today` independently.

### Claude's response
Accepted both. #1 is a real pre-existing streak bug exposed in touched code — dedupe to unique days before streak math (and it makes streaks correct regardless of multiple-sessions-per-day). #2: tighten `api.calendar-data` to reject partial ranges and validate `today` on its own. Plan revised below.

## Round 5 — Codex
VERDICT: APPROVED. "All prior findings are resolved. Plan now covers write paths, duplicate/template contracts and handlers, date-only calendar range plus independent `today`, runtime validation, strict real-date schema, display parsing, summary math, streak dedupe, partial-range bad requests, and prefill stale-merge guard. No new blocker found. Remaining risks are implementation discipline and tests, which the plan names."

## Resolution — CONVERGED (Round 5 of 5)
Plan approved by Codex after 4 revise rounds (20 findings total, all accepted). Awaiting human sign-off before any code (no code written during either act).
