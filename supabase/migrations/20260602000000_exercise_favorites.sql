create table public.exercise_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null references public.exercises(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

alter table public.exercise_favorites enable row level security;

create policy "exercise favorites readable by owner"
  on public.exercise_favorites for select
  using (auth.uid() = user_id);

create policy "exercise favorites insertable by owner"
  on public.exercise_favorites for insert
  with check (auth.uid() = user_id);

create policy "exercise favorites deletable by owner"
  on public.exercise_favorites for delete
  using (auth.uid() = user_id);
