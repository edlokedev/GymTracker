-- Custom Exercises (ADR-0004).
--
-- Users add their own exercises into the SHARED exercise catalog. A custom
-- exercise is just an `exercises` row whose `created_by` is set; seed rows keep
-- `created_by = null`. Removal is archive (set `archived_at`), never delete, so
-- the `workout_sets.exercise_id` FK (on delete cascade) can't destroy history.
--
-- Visibility stays world-readable (the existing select policy is unchanged).
-- Only the creator may insert/update their own custom rows. There is NO client
-- delete policy. A BEFORE UPDATE trigger freezes `id`/`created_by` so a creator
-- cannot launder a custom row into the service-role-only seed set.

-- ------------------------------------------------------------------
-- Columns
-- ------------------------------------------------------------------
alter table public.exercises
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists archived_at timestamptz;

create index if not exists exercises_created_by_idx on public.exercises(created_by);
-- Pickers/search read only live rows; partial index keeps that lookup cheap.
create index if not exists exercises_active_idx on public.exercises(id) where archived_at is null;

-- ------------------------------------------------------------------
-- Identity-freeze trigger
-- RLS WITH CHECK cannot see the OLD row, so without this a creator could set
-- created_by = null (laundering a row into the protected seed catalog) or
-- rewrite the primary key. Freeze both on any update to a custom row.
-- ------------------------------------------------------------------
create or replace function public.exercises_freeze_identity()
returns trigger
language plpgsql
as $$
begin
  if old.created_by is not null then
    if new.id is distinct from old.id then
      raise exception 'cannot change exercise id';
    end if;
    if new.created_by is distinct from old.created_by then
      raise exception 'cannot change exercise owner';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists exercises_freeze_identity on public.exercises;
create trigger exercises_freeze_identity
  before update on public.exercises
  for each row execute function public.exercises_freeze_identity();

-- ------------------------------------------------------------------
-- RLS: insert/update scoped to the creator. Select stays world-readable
-- (defined in 20260520000100_rls_policies.sql). No delete policy.
-- ------------------------------------------------------------------
drop policy if exists "users insert their own custom exercises" on public.exercises;
create policy "users insert their own custom exercises"
  on public.exercises
  for insert
  to authenticated
  with check (auth.uid() = created_by);

drop policy if exists "creators update their own custom exercises" on public.exercises;
create policy "creators update their own custom exercises"
  on public.exercises
  for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- ------------------------------------------------------------------
-- Storage: public bucket for custom exercise media. Reads are public (parity
-- with the jsDelivr seed media). Writes are scoped to the caller's own uid
-- folder: keys are `<uid>/<exerciseId>/<file>`.
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('exercise-images', 'exercise-images', true)
on conflict (id) do nothing;

drop policy if exists "exercise images are public" on storage.objects;
create policy "exercise images are public"
  on storage.objects
  for select
  using (bucket_id = 'exercise-images');

drop policy if exists "users upload exercise images to own folder" on storage.objects;
create policy "users upload exercise images to own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'exercise-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users update exercise images in own folder" on storage.objects;
create policy "users update exercise images in own folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'exercise-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'exercise-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete exercise images in own folder" on storage.objects;
create policy "users delete exercise images in own folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'exercise-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
