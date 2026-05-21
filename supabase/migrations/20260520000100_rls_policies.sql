-- Row Level Security policies for GymTracker.
--
-- Catalog tables: world-readable for anon + authenticated; only the service
-- role may write (seed + admin).
-- Profiles: each user can read and update their own row only.
-- Workout sessions/sets: each user can CRUD only rows they own. For
-- workout_sets we re-check ownership transitively via the parent session.

alter table public.profiles enable row level security;
alter table public.exercise_categories enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;

-- ----- exercise_categories -----
create policy "catalog categories are readable by everyone"
  on public.exercise_categories
  for select
  using (true);

-- (no insert/update/delete policies => service role only)

-- ----- exercises -----
create policy "catalog exercises are readable by everyone"
  on public.exercises
  for select
  using (true);

-- ----- profiles -----
create policy "profiles are readable by their owner"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "profiles are updatable by their owner"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Inserts happen via the on_auth_user_created trigger which runs as
-- security definer; no policy is needed for client inserts and we deliberately
-- omit one to prevent users from creating arbitrary profile rows.

-- ----- workout_sessions -----
create policy "workout sessions are readable by their owner"
  on public.workout_sessions
  for select
  using (auth.uid() = user_id);

create policy "workout sessions are insertable by their owner"
  on public.workout_sessions
  for insert
  with check (auth.uid() = user_id);

create policy "workout sessions are updatable by their owner"
  on public.workout_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workout sessions are deletable by their owner"
  on public.workout_sessions
  for delete
  using (auth.uid() = user_id);

-- ----- workout_sets -----
-- Ownership flows through the parent workout_sessions row.
create policy "workout sets are readable by the session owner"
  on public.workout_sets
  for select
  using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = workout_sets.workout_id
        and s.user_id = auth.uid()
    )
  );

create policy "workout sets are insertable by the session owner"
  on public.workout_sets
  for insert
  with check (
    exists (
      select 1 from public.workout_sessions s
      where s.id = workout_sets.workout_id
        and s.user_id = auth.uid()
    )
  );

create policy "workout sets are updatable by the session owner"
  on public.workout_sets
  for update
  using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = workout_sets.workout_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions s
      where s.id = workout_sets.workout_id
        and s.user_id = auth.uid()
    )
  );

create policy "workout sets are deletable by the session owner"
  on public.workout_sets
  for delete
  using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = workout_sets.workout_id
        and s.user_id = auth.uid()
    )
  );
