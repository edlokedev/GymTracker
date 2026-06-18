# 0002. Route Error Taxonomy from Postgres Signals

## Status

Accepted

## Context

Every private API route in GymTracker translates database outcomes into HTTP status codes. Until now each route did this inline and inconsistently. One route inspected Postgres error codes by hand; others threw raw errors that became 500s. The same condition could surface as 500, 404, or an undefined-field crash depending on which route was hit.

Three Postgres signals matter for route-layer translation, and their meanings are not obvious:

- `PGRST116` from PostgREST means a `.single()` query returned no rows. It is a not-found signal.
- `42501` is Postgres `insufficient_privilege`. Row Level Security raises it on INSERT, UPDATE, and DELETE that the policy blocks. RLS on SELECT does not raise this code — it silently hides rows.
- `23503` is `foreign_key_violation`. In our schema this fires when a child row references a parent that either does not exist or exists but is hidden by RLS. The caller cannot distinguish the two cases, and should not be able to: revealing that a parent exists but is owned by someone else is an ownership-leak.

We need one place that owns translation, and a fixed mapping from signal to HTTP status.

## Decision

Define a small typed error hierarchy in `src/lib/api/errors.ts`:

- `NotFoundError` maps to HTTP 404
- `ForbiddenError` maps to HTTP 403
- (Any other thrown value maps to HTTP 500 with a server log)

Query modules in `src/lib/supabase/queries/*` raise these typed errors instead of rethrowing raw Postgres errors. A shared helper inspects the Postgres error code and raises the right typed error:

- `PGRST116` → `NotFoundError`
- `23503` → `NotFoundError` (collapsed; see below)
- `42501` → `NotFoundError` (collapsed; see below)

The route layer (`definePrivateRoute`, `definePublicRoute`) catches these typed errors and serializes them through the API Envelope with the matching status code.

`23503` is intentionally collapsed into `NotFoundError`. A caller writing a workout set against a session id that either does not exist or is owned by another user must see the same response. Distinguishing the two leaks parent ownership.

`42501` is likewise collapsed into `NotFoundError` *by default*. In the current schema every RLS policy is a pure ownership predicate (`auth.uid() = user_id`), so a 42501 on a mutation means "row exists, owned by someone else." Surfacing that as 403 leaks existence. A query module that wants to express a state-based denial (e.g. "you own this workout but it is already completed and immutable") can `throw new ForbiddenError(...)` directly to opt into a 403 response — the `ForbiddenError` class is kept available specifically for that case.

## Consequences

- Every existing `if (error) throw error` in `src/lib/supabase/queries/*` is replaced with a call to the shared helper.
- The route layer never inspects Postgres error codes. Translation happens once.
- Adding a new Postgres signal to the taxonomy is a one-file change in `errors.ts` plus a route-layer mapping entry.
- The cost of changing the mapping later is non-trivial because every query call site relies on it. This ADR is the durable record of the chosen mapping.
- Ownership-leak via `23503` is closed by the collapse to `NotFoundError`. A future change that wants to surface "parent forbidden" separately must explicitly revisit this decision.
