-- Cache auth.uid() per statement while preserving existing RLS conditions.
-- Explicit transaction keeps policy replacement atomic.
begin;

drop policy if exists "profiles are readable by their owner" on public.profiles;
create policy "profiles are readable by their owner"
  on public.profiles
  for select
  using ((select auth.uid()) = id);

drop policy if exists "profiles are updatable by their owner" on public.profiles;
create policy "profiles are updatable by their owner"
  on public.profiles
  for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "workout sessions are readable by their owner" on public.workout_sessions;
create policy "workout sessions are readable by their owner"
  on public.workout_sessions
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "workout sessions are insertable by their owner" on public.workout_sessions;
create policy "workout sessions are insertable by their owner"
  on public.workout_sessions
  for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "workout sessions are updatable by their owner" on public.workout_sessions;
create policy "workout sessions are updatable by their owner"
  on public.workout_sessions
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "workout sessions are deletable by their owner" on public.workout_sessions;
create policy "workout sessions are deletable by their owner"
  on public.workout_sessions
  for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "workout sets are readable by the session owner" on public.workout_sets;
create policy "workout sets are readable by the session owner"
  on public.workout_sets
  for select
  using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = workout_sets.workout_id
        and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "workout sets are insertable by the session owner" on public.workout_sets;
create policy "workout sets are insertable by the session owner"
  on public.workout_sets
  for insert
  with check (
    exists (
      select 1 from public.workout_sessions s
      where s.id = workout_sets.workout_id
        and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "workout sets are updatable by the session owner" on public.workout_sets;
create policy "workout sets are updatable by the session owner"
  on public.workout_sets
  for update
  using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = workout_sets.workout_id
        and s.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions s
      where s.id = workout_sets.workout_id
        and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "workout sets are deletable by the session owner" on public.workout_sets;
create policy "workout sets are deletable by the session owner"
  on public.workout_sets
  for delete
  using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = workout_sets.workout_id
        and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "exercise favorites readable by owner" on public.exercise_favorites;
create policy "exercise favorites readable by owner"
  on public.exercise_favorites for select
  using ((select auth.uid()) = user_id);

drop policy if exists "exercise favorites insertable by owner" on public.exercise_favorites;
create policy "exercise favorites insertable by owner"
  on public.exercise_favorites for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "exercise favorites deletable by owner" on public.exercise_favorites;
create policy "exercise favorites deletable by owner"
  on public.exercise_favorites for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "workout templates are readable by their owner" on public.workout_templates;
create policy "workout templates are readable by their owner"
  on public.workout_templates
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "workout templates are insertable by their owner" on public.workout_templates;
create policy "workout templates are insertable by their owner"
  on public.workout_templates
  for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "workout templates are updatable by their owner" on public.workout_templates;
create policy "workout templates are updatable by their owner"
  on public.workout_templates
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "workout templates are deletable by their owner" on public.workout_templates;
create policy "workout templates are deletable by their owner"
  on public.workout_templates
  for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "workout template exercises are readable by template owner" on public.workout_template_exercises;
create policy "workout template exercises are readable by template owner"
  on public.workout_template_exercises
  for select
  using (
    exists (
      select 1 from public.workout_templates t
      where t.id = workout_template_exercises.template_id
        and t.user_id = (select auth.uid())
    )
  );

drop policy if exists "workout template exercises are insertable by template owner" on public.workout_template_exercises;
create policy "workout template exercises are insertable by template owner"
  on public.workout_template_exercises
  for insert
  with check (
    exists (
      select 1 from public.workout_templates t
      where t.id = workout_template_exercises.template_id
        and t.user_id = (select auth.uid())
    )
  );

drop policy if exists "workout template exercises are updatable by template owner" on public.workout_template_exercises;
create policy "workout template exercises are updatable by template owner"
  on public.workout_template_exercises
  for update
  using (
    exists (
      select 1 from public.workout_templates t
      where t.id = workout_template_exercises.template_id
        and t.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workout_templates t
      where t.id = workout_template_exercises.template_id
        and t.user_id = (select auth.uid())
    )
  );

drop policy if exists "workout template exercises are deletable by template owner" on public.workout_template_exercises;
create policy "workout template exercises are deletable by template owner"
  on public.workout_template_exercises
  for delete
  using (
    exists (
      select 1 from public.workout_templates t
      where t.id = workout_template_exercises.template_id
        and t.user_id = (select auth.uid())
    )
  );

drop policy if exists "users insert their own custom exercises" on public.exercises;
create policy "users insert their own custom exercises"
  on public.exercises
  for insert
  to authenticated
  with check ((select auth.uid()) = created_by);

drop policy if exists "creators update their own custom exercises" on public.exercises;
create policy "creators update their own custom exercises"
  on public.exercises
  for update
  to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

drop policy if exists "users upload exercise images to own folder" on storage.objects;
create policy "users upload exercise images to own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'exercise-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "users update exercise images in own folder" on storage.objects;
create policy "users update exercise images in own folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'exercise-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'exercise-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "users delete exercise images in own folder" on storage.objects;
create policy "users delete exercise images in own folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'exercise-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create index if not exists workout_template_exercises_exercise_id_idx
  on public.workout_template_exercises(exercise_id);
create index if not exists workout_templates_source_session_id_idx
  on public.workout_templates(source_session_id);

commit;
