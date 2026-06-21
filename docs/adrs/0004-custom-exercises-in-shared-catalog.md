# 0004. Custom Exercises Live in the Shared Catalog Table with a Creator Column

## Status

Accepted

## Context

The `exercises` table is a shared, world-readable catalog seeded from the Free Exercise DB. It has a `text` primary key, RLS `select using (true)`, and no client insert/update/delete policies (service-role only). `workout_sets.exercise_id` is a foreign key to `exercises(id)` with `on delete cascade`.

Users want to add exercises the seed set is missing. The product decision (grill, 2026-06-21) is that a user-added exercise is **shared into the same global catalog** — visible to everyone, usable like any seed exercise — not private to its creator.

Two structural options were considered:

1. **Separate `custom_exercises` table.** Keeps seed data pristine, but `workout_sets.exercise_id` then needs a polymorphic or second nullable FK, and every catalog read (search, facets, favourites, recent, suggested, history) must union two tables. High blast radius across already-stable query modules.
2. **One catalog table with a nullable `created_by` column.** A custom exercise is just a row whose `created_by` is set. The existing FK, reads, and UI keep working unchanged.

Deleting an exercise would cascade-delete the workout sets that reference it, destroying logged history. The product decision is **edit + archive**, not hard delete.

Custom exercises need images (full parity), but the catalog currently has no Supabase Storage — seed media is jsDelivr URLs only.

## Decision

Keep a single `exercises` catalog table. Add:

- `created_by uuid null references auth.users(id) on delete set null` — null for Seed Exercises, the creator for Custom Exercises. `on delete set null` keeps a shared custom exercise alive if its creator's account is removed.
- `archived_at timestamptz null` — non-null means the Custom Exercise is archived (hidden from pickers/search, still resolvable by id).

RLS on `exercises`:

- `select`: stays `using (true)` (world-readable, anon included). Archived rows are filtered in the query layer, not RLS, so history-by-id still resolves.
- `insert`: `with check (auth.uid() = created_by)` — any authenticated user may add a custom exercise they own. Seed rows (created_by null) remain un-insertable by clients.
- `update`: `using (auth.uid() = created_by) with check (auth.uid() = created_by)` — only the creator edits or archives. Seed rows stay service-role only.
- No client `delete` policy — removal is archive, never hard delete, so `on delete cascade` never fires from the app.

Custom exercise images go to a **public-read Supabase Storage bucket** (`exercise-images`); object write/update/delete RLS is scoped to authenticated users under their own uid path prefix. The existing `gif_path` / `preview_image_path` columns store the resulting public URL, so the existing media helper renders seed and custom media identically.

## Consequences

- Seed and custom exercises share one read path; no query module unions or polymorphic FKs.
- `workout_sets` FK and `on delete cascade` are untouched; history is protected because removal is archive-only.
- A custom exercise is globally visible the moment it is created — there is no moderation step. Acceptable for a personal/small-scale tracker; revisit if abuse appears.
- Catalog reads must add `archived_at is null` to search, facet, and picker queries (history-by-id must not).
- Introduces the first Supabase Storage bucket. This is a new, intentional exception to the "jsDelivr-only media" stance in ADR-0001-era docs, limited to user-uploaded custom media.
- `created_by` / `archived_at` are reversible columns, but the choice to keep one shared table (vs. splitting) is costly to undo later — hence this ADR.
- Because the catalog `select` policy is world-readable and the search route is anon-served, `created_by` (an `auth.users` UUID) must **never** be serialized into catalog payloads; only a derived `is_custom` boolean is public. UI ownership for edit/archive comes from an authed "my custom ids" endpoint.
- RLS WITH CHECK cannot read the OLD row, so a BEFORE UPDATE trigger freezes `id` and `created_by` on custom rows — otherwise a creator could null `created_by` to launder a row into the protected seed set. This trigger is part of the boundary, not just the policies.
