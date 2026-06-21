# Plan: Add Custom Exercises

_Locked via grill-with-docs — by Claude + Eddie. Terms per CONTEXT.md._

## Goal

Let an Authenticated User add a Custom Exercise to the shared Exercise Catalog so the missing exercises they want become usable everywhere a Seed Exercise is. Once created, a Custom Exercise is searchable, filterable, favouritable, and selectable for a Workout Set with no special-casing. The creator can edit it and archive it; archiving hides it from pickers without touching Workout Set history.

## Approach

Vertical TDD slices (red → green per behavior), data layer first.

1. **Migration + RLS** (`supabase/migrations/20260621000000_custom_exercises.sql` — 14-digit timestamp to match existing migrations)
   - `alter table public.exercises add column created_by uuid null references auth.users(id) on delete set null`, add `archived_at timestamptz null`, index `created_by` and a partial index `where archived_at is null`.
   - Insert policy `exercises_insert_own_custom` (`with check auth.uid() = created_by` — null `created_by` fails the equality, so seed rows stay un-insertable). Update policy `exercises_update_own_custom` (`using`/`with check auth.uid() = created_by`). No delete policy. Select policy unchanged.
   - **BEFORE UPDATE trigger `exercises_freeze_identity`** on rows where `old.created_by is not null`: reject any change to `id` or `created_by` (RLS WITH CHECK can't see OLD, so without this a creator could null `created_by` to launder a custom row into the protected seed set, or rewrite `id`). Raise on attempted mutation.
   - Storage: create public bucket `exercise-images`; `storage.objects` policies — public select, authenticated insert/update/delete scoped to `(storage.foldername(name))[1] = auth.uid()::text` (key layout `<uid>/<exerciseId>/<file>`).

2. **Query module** (`src/lib/supabase/queries/exercise-catalog.ts` + new `exercise-custom.ts`)
   - `createCustomExercise(supabase, userId, input)` → generates id `custom-<uuid>`, inserts a **whitelisted column payload** (never the join-only `category_name` or derived `is_custom`), sets `created_by`, returns the mapped `CatalogExercise`.
   - `updateCustomExercise(supabase, userId, id, patch)`, `archiveCustomExercise(supabase, userId, id)` (set `archived_at = now()`).
   - Add `archived_at is null` to `search` (covers `suggested`, which calls `search`) and the facet/muscle/equipment reads. **Favourites: filter archived in the favourites projection only — NOT in the shared `listExercisesByIds`**, so recent/history (which reuse it) stay unfiltered. History-by-id reads stay unfiltered.
   - Extend `CatalogExercise` + `catalogExerciseSchema` with `is_custom` (derived `created_by != null`) **only**. Do **not** serialize `created_by`: the search route is anon-served and the raw value is an `auth.users` UUID. `created_by` and `archived_at` stay DB/service-role-side; UI ownership comes from an authed "my custom exercise ids" set (below).

3. **Contract + routes**
   - `src/lib/api/contracts/exercises.custom.contract.ts` — POST (create), PATCH (edit), POST archive (or DELETE → archive). Zod body: `name` (required, trimmed, 1..120), `category_id` (required, must exist), `tracking_type` enum, optional `equipment`, `primary_muscles[]`, `secondary_muscles[]`, `instructions[]`, `gif_path`, `preview_image_path`.
   - `src/routes/api.exercises.custom.ts` — `privateMethod` handlers; identity from session, never body. Delegate to query module; RLS is the real boundary.

4. **Image upload**
   - Client uploads the chosen image/GIF to the `exercise-images` bucket via supabase-js under `<uid>/<exerciseId>/...`, takes the public URL, and passes it as `gif_path`/`preview_image_path` to create/edit. Optional — most exercises ship without media. Validate type (image/* incl. gif) and size client-side.
   - **Server-side URL guard**: the create/edit handler rejects any `gif_path`/`preview_image_path` that isn't null or a URL under the project's public `exercise-images` base path containing the caller's uid segment. Without this, a client could set the column to an arbitrary external URL despite the storage RLS.

   - **GET `/api/exercises/custom` (authed)** → returns the caller's own custom-exercise ids (and rows), so the UI can show edit/archive affordances without leaking `created_by` through the public catalog.

5. **Feature client** (`src/features/exercise-library/client.ts`)
   - `createCustomExercise`, `updateCustomExercise`, `archiveCustomExercise`, `uploadExerciseImage`; invalidate search/facets/favourites/recent query caches on success.

6. **UI** (`src/features/exercise-library/components`)
   - `CustomExerciseForm` modal: name, category select (existing categories), tracking-type toggle, optional equipment, muscles, instructions, image upload. Mobile-first, touch targets ≥ 44px, loading + error + empty states.
   - Entry points: an "Add exercise" action in `ExerciseBrowser` (library) and in `ExerciseSelectorModal` (in-workout), plus a "Can't find it? Add it" CTA in the no-results empty state. After save, the new exercise appears in the list and is selectable immediately.
   - Edit/Archive affordance in `ExerciseDetailModal`, shown only when `is_custom && id ∈ my-custom-ids` (from the authed `/api/exercises/custom` set — never from a serialized `created_by`).

7. **Tests** (focused, behavior-level)
   - Model: id generation, `is_custom` derivation, form validation (pure → first tracer bullet).
   - Query module: create sets `created_by`; archive sets `archived_at`; search excludes archived; history-by-id includes archived (mocked client, like existing query tests).
   - Route: create rejects empty name (badRequest); create returns mapped exercise; edit/archive scoped to creator (injected resolver, like favorites tests).
   - Contract: request/response shape.
   - UI: form submit happy path; non-creator sees no edit/archive; empty-state CTA opens form.

8. **Docs/graph**: `graphify update .` (new feature + route + DB change), update `status.md` / `decisions.md`.

## Key decisions & tradeoffs

- **One shared catalog table + `created_by`** rather than a separate custom table — see ADR-0004. Keeps the `workout_sets` FK and every catalog read unchanged.
- **Archive, not delete** — protects Workout Set history from the `on delete cascade`. No client delete policy at all.
- **Global visibility, no moderation** — user chose shared catalog; acceptable at this scale (ADR-0004).
- **Supabase Storage for custom media** — first bucket in the project; scoped, intentional exception to jsDelivr-only (ADR-0004).
- **Category required, chosen from existing `exercise_categories`** — `category_id` is `not null` FK; no new "Custom" category to avoid a schema-special-case.

## Risks / open questions

- Generated `database.types.ts` is a permissive placeholder, so no type regen is required, but the new columns aren't statically typed. Acceptable; flagged.
- No dedup: two users (or one user twice) can add same-named exercises. Matches seed data which already has near-dupes; not enforcing uniqueness in v1.
- Storage bucket migration via SQL must run before image upload works in any env; if a target env lacks it, upload fails gracefully (form still saves text-only).
- Local Supabase CLI may be needed to apply/verify the migration; if unavailable in this environment, migration is committed but verified by query-module tests, not a live DB.
- **Category FK is `on delete cascade`**: deleting an `exercise_categories` row would cascade-delete its exercises and, via `workout_sets.exercise_id`, the referencing history. Category deletes are service-role-only and effectively frozen; tightening that FK to `restrict` is noted but out of scope here.
- **Orphan media + no audit trail**: archiving/editing leaves old objects in the public bucket, and there's no `updated_by`/moderation log. `created_by` stays server-queryable (just unserialized publicly) so an admin can still attribute abuse. Cleanup + moderation deferred (ADR-0004 "revisit if abuse appears").

## Out of scope

- Editing or archiving Seed Exercises.
- Moderation / reporting / approval workflow for shared custom exercises.
- Per-user private exercises (explicitly rejected — shared catalog chosen).
- Bulk import / CSV of custom exercises.
