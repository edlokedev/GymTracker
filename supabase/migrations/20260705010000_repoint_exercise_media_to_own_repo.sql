-- 2026-07-05 (follow-up to 20260705000000): move exercise media URLs off the
-- third-party pre-purge fork onto our OWN public media repo
-- (edlokedev/gymmie-exercise-media), pinned to a commit hash. We control the
-- repo, so no upstream purge/rebase can kill the URLs again. Custom-exercise
-- media (Supabase Storage) untouched by the WHERE filter. Issue #0013.

update public.exercises
set gif_path = replace(
      gif_path,
      'gh/Aleyhan/exercises-dataset@29cd1b88f2925ac3a604bd8a7c0566c30e968053',
      'gh/edlokedev/gymmie-exercise-media@19268b2fea5295477c2083b2b77fb8e5882401c1'
    )
where gif_path like '%gh/Aleyhan/exercises-dataset@%';

update public.exercises
set preview_image_path = replace(
      preview_image_path,
      'gh/Aleyhan/exercises-dataset@29cd1b88f2925ac3a604bd8a7c0566c30e968053',
      'gh/edlokedev/gymmie-exercise-media@19268b2fea5295477c2083b2b77fb8e5882401c1'
    )
where preview_image_path like '%gh/Aleyhan/exercises-dataset@%';
