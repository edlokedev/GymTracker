-- Add location_name to workout_sessions.
-- Stores a free-text venue name (e.g. "Planet Fitness") directly on the session
-- row. No FK/locations table needed at current scale (2 users, ~3 venues).
-- See docs/adrs/0003-workout-location-as-text-field.md.

alter table public.workout_sessions
  add column location_name text,
  add constraint workout_sessions_location_name_check
    check (
      location_name is null
      or (btrim(location_name) != '' and char_length(btrim(location_name)) <= 100)
    );
