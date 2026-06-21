# Plan Review Log: Add Custom Exercises

Act 1 (grill-with-docs) complete — plan locked, CONTEXT.md + ADR-0004 updated. MAX_ROUNDS=5.

Act 2 (Codex adversarial review): `codex` CLI is **not installed** in this remote environment (`codex: command not found`), and Codex auth is unavailable, so the cross-model loop cannot run as specified. Substitute: an isolated-context adversarial review pass (separate read-only agent session) stands in for Codex. This is a stand-in, not the real cross-model check — noted for the sign-off decision.

## Round 1 — Substitute reviewer (read-only, isolated context)

Verdict: REVISE. Concrete findings (blocking marked ★):

1. ★ UPDATE/INSERT policies don't stop a creator mutating `created_by` (WITH CHECK can't see OLD) → could null it and launder a custom row into the protected seed set, or rewrite `id`.
2. ★ `created_by` added to the **public** `catalogExerciseSchema` leaks every creator's `auth.users` UUID to anon users on `/api/exercises/search`.
3. ★ "client passes public URL in body" lets a client set `gif_path`/`preview_image_path` to an arbitrary external URL despite storage RLS.
4. Archived custom exercise still shows in Favourites (a picker) — glossary said archived is hidden from pickers; favourites unspecified. Filtering it in the shared `listExercisesByIds` would also wrongly hide rows from recent/history.
5. ★ Migration filename was 13-digit, not the 14-digit `YYYYMMDDHHMMSS` the CLI/ordering expects.
6. `exercise_categories` delete cascades to exercises → workout_sets history; relies on categories being frozen.
7. Orphan images in public bucket + no audit/`updated_by` trail for shared writes.
8. Insert must not pass join-only `category_name`/derived `is_custom` as columns.

### Claude's response (final arbiter)

Accepted 1, 2, 3, 4, 5, 8 → revised PLAN.md + ADR-0004 + CONTEXT.md:
- Added BEFORE UPDATE trigger `exercises_freeze_identity` (freezes `id`/`created_by` on custom rows). (1)
- Public payload exposes `is_custom` boolean only; `created_by` never serialized; UI ownership via authed `GET /api/exercises/custom`. (2)
- Added server-side URL guard: media URL must be null or under the `exercise-images` bucket beneath the caller's uid. (3)
- Filter archived in the favourites projection only, not shared `listExercisesByIds`; glossary updated to list favourites as a hidden surface. (4)
- Migration renamed to `20260621000000_custom_exercises.sql`. (5)
- Whitelisted insert payload noted. (8)

Accepted 6, 7 as **documented risks** (out of scope for v1): category FK is service-role-frozen (tightening to `restrict` noted); orphan-image cleanup + moderation/audit deferred, but `created_by` stays server-queryable for attribution.

Outcome: all blocking (★) findings resolved in the plan. Codex CLI unavailable, so this single substitute round can't be re-submitted to the same model session for a real `VERDICT: APPROVED`. Convergence is Claude's judgment, pending user sign-off.
