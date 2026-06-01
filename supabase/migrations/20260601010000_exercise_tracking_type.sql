-- Add explicit tracking metadata so input mode does not depend on category labels.

alter table public.exercises
  add column if not exists tracking_type text not null default 'strength';

do $$
begin
  alter table public.exercises
    add constraint exercises_tracking_type_check
    check (tracking_type in ('strength', 'cardio', 'timed'));
exception
  when duplicate_object then null;
end $$;

update public.exercises
set tracking_type = case
  when lower(category_id) = 'cardio' then 'cardio'
  when lower(category_id) in ('stretching', 'mobility') then 'timed'
  when lower(coalesce(force, '')) = 'static' then 'timed'
  else 'strength'
end;

create index if not exists exercises_tracking_type_idx on public.exercises(tracking_type);
