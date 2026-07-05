-- 2026-07-05: upstream hasaneyldrm/exercises-dataset purged all exercise media
-- from the repo and its git history (ownership dispute), permanently 404ing
-- every seeded jsDelivr URL. Repoint gif_path/preview_image_path to a
-- pre-purge fork (Aleyhan/exercises-dataset, forked 2026-03-19, verified
-- 1,324 videos + 1,324 images), pinned to a commit hash so a fork rebase
-- cannot break the URLs again. Custom-exercise media (Supabase Storage) is
-- untouched by the WHERE filter. Issue #0013; archival copy on NAS at
-- N:\TOBESORTED\exercises-dataset-media-archive.

update public.exercises
set gif_path = replace(
      gif_path,
      'gh/hasaneyldrm/exercises-dataset@main',
      'gh/Aleyhan/exercises-dataset@29cd1b88f2925ac3a604bd8a7c0566c30e968053'
    )
where gif_path like '%gh/hasaneyldrm/exercises-dataset@main%';

update public.exercises
set preview_image_path = replace(
      preview_image_path,
      'gh/hasaneyldrm/exercises-dataset@main',
      'gh/Aleyhan/exercises-dataset@29cd1b88f2925ac3a604bd8a7c0566c30e968053'
    )
where preview_image_path like '%gh/hasaneyldrm/exercises-dataset@main%';
