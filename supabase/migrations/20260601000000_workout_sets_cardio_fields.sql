-- Add cardio/timed tracking fields to workout_sets.
-- These columns are nullable so existing strength sets are unaffected.
-- incline is a machine-level number (not a percentage), stored as-is.

alter table public.workout_sets
  add column if not exists duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  add column if not exists distance_km numeric check (distance_km is null or distance_km >= 0),
  add column if not exists incline numeric check (incline is null or incline >= 0),
  add column if not exists speed_kmh numeric check (speed_kmh is null or speed_kmh >= 0);
