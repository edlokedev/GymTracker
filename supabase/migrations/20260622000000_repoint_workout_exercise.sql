-- Change Exercise on a logged workout (repoint a whole exercise group's sets).
--
-- Repointing all of a workout's sets from one exercise to another can't be
-- expressed as a guarded single UPDATE through PostgREST URL filters, and it
-- must be atomic + collision-safe. So it lives in a SECURITY INVOKER function:
-- RLS on workout_sessions / workout_sets / exercises still enforces ownership
-- and visibility (the caller's JWT role is used, not the definer's).
--
-- Atomicity: we take a row lock on the parent workout_sessions row up front, so
-- concurrent repoints/inserts on the same workout serialize and the
-- target-already-present recheck cannot race into a silent merge.
--
-- Failure modes are signalled with custom SQLSTATEs so the query layer can map
-- them to typed HTTP errors:
--   GYM01  source == target            -> 400 BadRequest
--   GYM02  target archived / unknown   -> 400 BadRequest
--   GYM03  target already in workout   -> 409 Conflict (block, never merge)
--   GYM04  workout or source missing   -> 404 NotFound (also covers RLS-hidden)

create or replace function public.repoint_workout_exercise(
  p_workout_id uuid,
  p_from text,
  p_to text
)
returns table(set_id uuid)
language plpgsql
security invoker
as $$
begin
  -- Defense-in-depth: the route checks this too, but the granted RPC is
  -- directly callable by any authenticated client.
  if p_from = p_to then
    raise exception 'source and target exercise are the same'
      using errcode = 'GYM01';
  end if;

  -- Lock the parent session. Under RLS (security invoker) a session the caller
  -- does not own is invisible -> NOT FOUND. The lock serializes concurrent
  -- repoints/inserts on this workout, making the recheck-then-update atomic.
  perform 1
    from public.workout_sessions s
    where s.id = p_workout_id
    for update;
  if not found then
    raise exception 'workout not found'
      using errcode = 'GYM04';
  end if;

  -- Target must be a live (non-archived) catalog exercise. The picker hides
  -- archived rows, but the API/RPC must not trust the client.
  if not exists (
    select 1 from public.exercises e
    where e.id = p_to and e.archived_at is null
  ) then
    raise exception 'target exercise is not available'
      using errcode = 'GYM02';
  end if;

  -- Block (never merge) when the target is already logged in this workout.
  if exists (
    select 1 from public.workout_sets w
    where w.workout_id = p_workout_id and w.exercise_id = p_to
  ) then
    raise exception 'target exercise is already logged in this workout'
      using errcode = 'GYM03';
  end if;

  -- Source group must exist (else stale / already changed).
  if not exists (
    select 1 from public.workout_sets w
    where w.workout_id = p_workout_id and w.exercise_id = p_from
  ) then
    raise exception 'source exercise not found in this workout'
      using errcode = 'GYM04';
  end if;

  return query
    update public.workout_sets ws
      set exercise_id = p_to
      where ws.workout_id = p_workout_id and ws.exercise_id = p_from
      returning ws.id;
end;
$$;

-- Postgres default-grants EXECUTE to PUBLIC; revoke before granting narrowly.
revoke all on function public.repoint_workout_exercise(uuid, text, text) from public, anon;
grant execute on function public.repoint_workout_exercise(uuid, text, text) to authenticated;
