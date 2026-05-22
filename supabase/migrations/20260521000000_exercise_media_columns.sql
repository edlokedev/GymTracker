-- Add media columns to the exercise catalog to match the upstream
-- hasaneyldrm/exercises-dataset shape that the UI was built around.
--
-- Stores absolute jsDelivr URLs (e.g. https://cdn.jsdelivr.net/gh/...) so the
-- React `getExerciseMediaUrls` helper can pass them straight to <img src>.
--
-- The legacy `images jsonb` column from the Free Exercise DB seed stays in
-- place but is no longer populated by the seed script; safe to drop in a
-- follow-up once nothing reads it.

alter table public.exercises
  add column if not exists gif_path text,
  add column if not exists preview_image_path text;
