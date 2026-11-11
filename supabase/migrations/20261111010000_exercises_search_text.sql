alter table public.exercises
  add column if not exists search_text text generated always as
    (lower(name || ' ' || primary_muscles::text || ' ' || secondary_muscles::text)) stored,
  add column if not exists primary_muscles_text text generated always as
    (lower(primary_muscles::text)) stored;
