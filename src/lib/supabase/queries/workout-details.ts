// Supabase-backed query module for the workout-details aggregate.
//
// Mirrors the join the SQLite `api.workout-details` route did inline:
//   1. Fetch all workout sessions for the authenticated user on a given date.
//   2. Fetch all sets belonging to those sessions in one round-trip.
//   3. Roll each session up with computed `totalVolume` (sum of weight * reps)
//      and `exerciseCount` (distinct exercise_id count).
//
// The response is camelCase to match the legacy `WorkoutSessionWithSets`
// shape in src/lib/types/calendar.ts that the UI already consumes.
// RLS gates which sessions/sets are visible — the caller doesn't pass a
// userId.

import { assertPostgresOk } from '../../api/errors'
import type { WorkoutSessionWithSets } from '../../types/calendar'
import { type AppSupabaseClient, queryClient } from '../query-client'

type SessionRow = {
  id: string
  user_id: string
  date: string
  start_time: string | null
  end_time: string | null
  notes: string | null
  location_name: string | null
}

type SetRow = {
  id: string
  workout_id: string
  exercise_id: string
  set_number: number
  weight: number | null
  reps: number | null
  rest_time: number | null
  notes: string | null
  duration_seconds: number | null
  distance_km: number | null
  incline: number | null
  speed_kmh: number | null
}

function computeDurationMinutes(
  startTime: string | null,
  endTime: string | null,
): number | undefined {
  if (!startTime || !endTime) return undefined
  return Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60))
}

export const workoutDetailsQueries = {
  // All of the caller's workout sessions on `date`, each rolled up with its
  // sets and totals. Returns an empty array when no sessions exist.
  async getByDate(supabase: AppSupabaseClient, date: string): Promise<WorkoutSessionWithSets[]> {
    const db = queryClient(supabase)
    const { data: sessionsData, error: sessionsError } = await db
      .from<SessionRow>('workout_sessions')
      .select('id, user_id, date, start_time, end_time, notes, location_name')
      .eq('date', date)
      .order('start_time', { ascending: true })

    assertPostgresOk(sessionsError)
    const sessions = (sessionsData ?? []) as SessionRow[]
    if (sessions.length === 0) return []

    const sessionIds = sessions.map((s) => s.id)
    const { data: setsData, error: setsError } = await db
      .from<SetRow>('workout_sets')
      .select(
        'id, workout_id, exercise_id, set_number, weight, reps, rest_time, notes, duration_seconds, distance_km, incline, speed_kmh',
      )
      .in('workout_id', sessionIds)
      .order('set_number', { ascending: true })
      .order('created_at', { ascending: true })

    assertPostgresOk(setsError)
    const sets = (setsData ?? []) as SetRow[]

    // Resolve exercise names for every exercise referenced by these sets.
    // Without this the workout-detail modal renders every row as
    // "Unknown Exercise" because the formatter falls back when the
    // joined name is missing.
    const uniqueExerciseIds = Array.from(new Set(sets.map((s) => s.exercise_id)))
    const exerciseNameById = new Map<string, string>()
    if (uniqueExerciseIds.length > 0) {
      const { data: exData, error: exError } = await db
        .from<{ id: string; name: string }>('exercises')
        .select('id, name')
        .in('id', uniqueExerciseIds)
      assertPostgresOk(exError)
      for (const row of (exData ?? []) as { id: string; name: string }[]) {
        exerciseNameById.set(row.id, row.name)
      }
    }

    const setsByWorkoutId = new Map<string, SetRow[]>()
    for (const set of sets) {
      const bucket = setsByWorkoutId.get(set.workout_id)
      if (bucket) bucket.push(set)
      else setsByWorkoutId.set(set.workout_id, [set])
    }

    return sessions.map((session) => {
      const sessionSets = setsByWorkoutId.get(session.id) ?? []
      const totalVolume = sessionSets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0)
      const exerciseCount = new Set(sessionSets.map((s) => s.exercise_id)).size

      return {
        id: session.id,
        userId: session.user_id,
        date: session.date,
        duration: computeDurationMinutes(session.start_time, session.end_time),
        notes: session.notes ?? undefined,
        locationName: session.location_name ?? undefined,
        sets: sessionSets.map((s) => ({
          id: s.id,
          sessionId: s.workout_id,
          exerciseId: s.exercise_id,
          setNumber: s.set_number,
          reps: s.reps ?? 0,
          weight: s.weight ?? 0,
          restTime: s.rest_time ?? undefined,
          notes: s.notes ?? undefined,
          exerciseName: exerciseNameById.get(s.exercise_id),
          durationSeconds: s.duration_seconds ?? undefined,
          distanceKm: s.distance_km ?? undefined,
          incline: s.incline ?? undefined,
          speedKmh: s.speed_kmh ?? undefined,
        })),
        totalVolume,
        exerciseCount,
      }
    })
  },
}
