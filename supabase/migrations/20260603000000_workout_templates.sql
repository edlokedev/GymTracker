-- Workout templates: saved workout structure owned by an authenticated user.

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notes text,
  source_session_id uuid references public.workout_sessions(id) on delete set null,
  is_archived boolean not null default false,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id text not null references public.exercises(id) on delete cascade,
  position integer not null,
  target_sets integer,
  notes text,
  created_at timestamptz not null default now(),
  unique (template_id, exercise_id)
);

create index workout_templates_user_id_idx on public.workout_templates(user_id);
create index workout_templates_user_active_idx on public.workout_templates(user_id, is_archived);
create index workout_template_exercises_template_id_idx
  on public.workout_template_exercises(template_id);

create trigger workout_templates_set_updated_at
  before update on public.workout_templates
  for each row execute function public.set_updated_at();

alter table public.workout_templates enable row level security;
alter table public.workout_template_exercises enable row level security;

create policy "workout templates are readable by their owner"
  on public.workout_templates
  for select
  using (auth.uid() = user_id);

create policy "workout templates are insertable by their owner"
  on public.workout_templates
  for insert
  with check (auth.uid() = user_id);

create policy "workout templates are updatable by their owner"
  on public.workout_templates
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workout templates are deletable by their owner"
  on public.workout_templates
  for delete
  using (auth.uid() = user_id);

create policy "workout template exercises are readable by template owner"
  on public.workout_template_exercises
  for select
  using (
    exists (
      select 1 from public.workout_templates t
      where t.id = workout_template_exercises.template_id
        and t.user_id = auth.uid()
    )
  );

create policy "workout template exercises are insertable by template owner"
  on public.workout_template_exercises
  for insert
  with check (
    exists (
      select 1 from public.workout_templates t
      where t.id = workout_template_exercises.template_id
        and t.user_id = auth.uid()
    )
  );

create policy "workout template exercises are updatable by template owner"
  on public.workout_template_exercises
  for update
  using (
    exists (
      select 1 from public.workout_templates t
      where t.id = workout_template_exercises.template_id
        and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_templates t
      where t.id = workout_template_exercises.template_id
        and t.user_id = auth.uid()
    )
  );

create policy "workout template exercises are deletable by template owner"
  on public.workout_template_exercises
  for delete
  using (
    exists (
      select 1 from public.workout_templates t
      where t.id = workout_template_exercises.template_id
        and t.user_id = auth.uid()
    )
  );
