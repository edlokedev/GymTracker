# ADR 0003: Store Workout Location as a Text Field on workout_sessions

**Date:** 2026-06-18
**Status:** Accepted

## Context

We want to record where a Workout Session took place (e.g. "Planet Fitness", "Home Garage"). Two approaches were considered:

**Option A — `locations` table + FK**: A dedicated `public.locations` table (id, user_id, name, notes) with `workout_sessions.location_id uuid FK nullable`. Users manage a list of gyms; sessions reference one.

**Option B — `location_name text` on `workout_sessions`**: A single nullable text column directly on the session row. No FK, no management table. Autocomplete is derived from the user's own distinct past values.

## Decision

**Option B** — `location_name text nullable` directly on `workout_sessions`.

## Rationale

- App currently has 2 users who share ~3 gyms. A management UI for a locations table adds build cost with no user benefit at this scale.
- The text field is fully reversible: if a `locations` table is needed later (e.g. for per-location stats, icons, or sharing), the existing `location_name` strings are the migration source — no data is lost.
- Autocomplete from distinct past values gives a good enough UX without a separate CRUD surface.
- No FK means no cascade or orphan concerns when sessions are deleted.

## Consequences

- A future `locations` table would require a data migration from `location_name` strings to FK references. Acceptable trade-off at current scale.
- No per-location statistics or aggregates are possible without a post-hoc GROUP BY on `location_name` (which is sufficient for simple counts).
- A DB check constraint is added in the initial migration: `check (location_name is null or (btrim(location_name) != '' and char_length(btrim(location_name)) <= 100))`. This defends against whitespace-only strings and oversized values at the DB layer in addition to application-level Zod validation.
