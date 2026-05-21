-- GymTracker initial Postgres schema.
--
-- Mirrors the legacy SQLite schema (src/lib/database/schema.sql) but in
-- Postgres-idiomatic form:
--   * `auth.users` (Supabase Auth) owns user identity.
--   * `profiles` carries app-level preferences with a 1:1 link to auth.users.
--   * exercise catalog uses text PKs to match the Free Exercise DB ids.
--   * private tables (workout_sessions, workout_sets) use uuid PKs.
--   * arrays/instructions/images become jsonb.
--   * timestamps are timestamptz with `updated_at` triggers.
-- RLS policies live in the next migration (..._rls_policies.sql).

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------------
-- profiles: 1:1 with auth.users, stores app-facing preferences.
-- ------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  weight_unit text not null default 'lbs' check (weight_unit in ('lbs', 'kg')),
  theme text not null default 'dark' check (theme in ('light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new auth user signs up. We pull display
-- metadata from the OAuth payload if present; falls back to nulls.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------
-- exercise_categories: public catalog metadata.
-- ------------------------------------------------------------------
create table public.exercise_categories (
  id text primary key,
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- exercises: public catalog. Stores Free Exercise DB ids verbatim.
-- ------------------------------------------------------------------
create table public.exercises (
  id text primary key,
  name text not null,
  category_id text not null references public.exercise_categories(id) on delete cascade,
  force text,
  level text,
  mechanic text,
  equipment text,
  primary_muscles jsonb not null default '[]'::jsonb,
  secondary_muscles jsonb not null default '[]'::jsonb,
  instructions jsonb not null default '[]'::jsonb,
  images jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exercises_category_id_idx on public.exercises(category_id);
create index exercises_name_idx on public.exercises(name);
create index exercises_level_idx on public.exercises(level);
create index exercises_equipment_idx on public.exercises(equipment);
create index exercises_force_idx on public.exercises(force);
create index exercises_mechanic_idx on public.exercises(mechanic);

create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- workout_sessions: private, one row per workout per user.
-- ------------------------------------------------------------------
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  date date not null,
  start_time timestamptz not null,
  end_time timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_sessions_user_id_idx on public.workout_sessions(user_id);
create index workout_sessions_user_date_idx on public.workout_sessions(user_id, date);

create trigger workout_sessions_set_updated_at
  before update on public.workout_sessions
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- workout_sets: private. Ownership is transitive through workout_sessions.
-- ------------------------------------------------------------------
create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id text not null references public.exercises(id) on delete cascade,
  set_number integer not null,
  weight numeric check (weight is null or weight >= 0),
  reps integer check (reps is null or (reps > 0 and reps <= 100)),
  rest_time integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_id, exercise_id, set_number)
);

create index workout_sets_workout_id_idx on public.workout_sets(workout_id);
create index workout_sets_exercise_id_idx on public.workout_sets(exercise_id);

create trigger workout_sets_set_updated_at
  before update on public.workout_sets
  for each row execute function public.set_updated_at();
