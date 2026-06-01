// Supabase-backed query module for private workout sets.
//
// Mirrors `workoutSetQueries` from src/lib/database/queries/workouts.ts.
// Ownership is enforced transitively by RLS — a workout set belongs to the
// authenticated user iff its parent workout_session.user_id = auth.uid().
// Callers must use a request-scoped Supabase client. CRUD paths never take a
// client-supplied userId; history gets the authenticated user id from the
// private route context for an explicit joined-table filter.
//
// The SQLite WorkoutSetInput exposes a `set_order` field that maps to the
// Postgres `set_number` column — that mapping is preserved here so the route
// contracts stay stable.

import { assertPostgresOk } from '../../api/errors'
import type { WorkoutSet, WorkoutSetInput } from '../../types/database'
import { type AppSupabaseClient, queryClient } from '../query-client'

type SB = AppSupabaseClient

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
  created_at: string
  updated_at: string
}

type HistorySessionRow = {
  date: string
  name: string | null
  user_id: string | null
}

type HistoryRow = {
  id: string
  weight: number | null
  reps: number | null
  duration_seconds: number | null
  distance_km: number | null
  incline: number | null
  speed_kmh: number | null
  created_at: string
  workout_sessions: HistorySessionRow | HistorySessionRow[] | null
}

export type WorkoutSetHistoryItem = {
  id: string
  reps: number
  weight: number
  duration_seconds?: number
  distance_km?: number
  incline?: number
  speed_kmh?: number
  session_date: string
  session_name: string | null
}

function mapSet(row: SetRow): WorkoutSet {
  return {
    id: row.id,
    workout_id: row.workout_id,
    exercise_id: row.exercise_id,
    set_number: row.set_number,
    weight: row.weight ?? undefined,
    reps: row.reps ?? undefined,
    rest_time: row.rest_time ?? undefined,
    notes: row.notes ?? undefined,
    duration_seconds: row.duration_seconds ?? undefined,
    distance_km: row.distance_km ?? undefined,
    incline: row.incline ?? undefined,
    speed_kmh: row.speed_kmh ?? undefined,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  }
}

function getHistorySession(row: HistoryRow): HistorySessionRow | null {
  if (Array.isArray(row.workout_sessions)) return row.workout_sessions[0] ?? null
  return row.workout_sessions
}

function mapHistorySet(row: HistoryRow): WorkoutSetHistoryItem {
  const session = getHistorySession(row)
  return {
    id: row.id,
    reps: row.reps ?? 0,
    weight: row.weight ?? 0,
    duration_seconds: row.duration_seconds ?? undefined,
    distance_km: row.distance_km ?? undefined,
    incline: row.incline ?? undefined,
    speed_kmh: row.speed_kmh ?? undefined,
    session_date: session?.date ?? '',
    session_name: session?.name ?? null,
  }
}

const SET_COLUMNS =
  'id, workout_id, exercise_id, set_number, weight, reps, rest_time, notes, duration_seconds, distance_km, incline, speed_kmh, created_at, updated_at'
const HISTORY_COLUMNS =
  'id, weight, reps, duration_seconds, distance_km, incline, speed_kmh, created_at, workout_sessions!inner(date, name, user_id)'

export const WORKOUT_SET_HISTORY_DEFAULT_LIMIT = 50
export const WORKOUT_SET_HISTORY_MAX_LIMIT = 100

export function normalizeWorkoutSetHistoryLimit(value: string | number | null | undefined): number {
  if (value == null || value === '') return WORKOUT_SET_HISTORY_DEFAULT_LIMIT

  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return WORKOUT_SET_HISTORY_DEFAULT_LIMIT

  return Math.min(Math.floor(parsed), WORKOUT_SET_HISTORY_MAX_LIMIT)
}

export const workoutSetQueries = {
  async getById(supabase: SB, id: string): Promise<WorkoutSet | null> {
    const { data, error } = await queryClient(supabase)
      .from('workout_sets')
      .select(SET_COLUMNS)
      .eq('id', id)
      .maybeSingle()

    assertPostgresOk(error)
    if (!data) return null
    return mapSet(data as SetRow)
  },

  // All sets for a given workout, ordered by set_number then insertion time.
  // RLS filters to sets belonging to sessions owned by the caller.
  async listByWorkoutId(supabase: SB, workoutId: string): Promise<WorkoutSet[]> {
    const { data, error } = await queryClient(supabase)
      .from('workout_sets')
      .select(SET_COLUMNS)
      .eq('workout_id', workoutId)
      .order('set_number', { ascending: true })
      .order('created_at', { ascending: true })

    assertPostgresOk(error)
    return ((data ?? []) as SetRow[]).map(mapSet)
  },

  async listHistory(
    supabase: SB,
    userId: string,
    exerciseId: string,
    limit: number = WORKOUT_SET_HISTORY_DEFAULT_LIMIT,
  ): Promise<WorkoutSetHistoryItem[]> {
    const boundedLimit = normalizeWorkoutSetHistoryLimit(limit)
    const { data, error } = await queryClient(supabase)
      .from('workout_sets')
      .select(HISTORY_COLUMNS)
      .eq('exercise_id', exerciseId)
      .eq('workout_sessions.user_id', userId)
      .order('date', { ascending: false, foreignTable: 'workout_sessions' })
      .order('created_at', { ascending: false })
      .order('set_number', { ascending: true })
      .limit(boundedLimit)

    assertPostgresOk(error)
    return ((data ?? []) as HistoryRow[]).map(mapHistorySet)
  },

  // Create a new set. The parent session must be owned by the authenticated
  // user — otherwise the insert is rejected by RLS and we surface that to the
  // caller. `set_order` is the legacy input field name; it maps to
  // `set_number` in Postgres.
  async create(supabase: SB, data: WorkoutSetInput): Promise<WorkoutSet> {
    const insertRow = {
      workout_id: data.workout_id,
      exercise_id: data.exercise_id,
      set_number: data.set_order,
      reps: data.reps ?? null,
      weight: data.weight ?? null,
      rest_time: data.rest_time ?? null,
      notes: data.notes ?? null,
      duration_seconds: data.duration_seconds ?? null,
      distance_km: data.distance_km ?? null,
      incline: data.incline ?? null,
      speed_kmh: data.speed_kmh ?? null,
    }

    const { data: row, error } = await queryClient(supabase)
      .from('workout_sets')
      .insert(insertRow)
      .select(SET_COLUMNS)
      .single()

    assertPostgresOk(error)
    return mapSet(row as SetRow)
  },

  async update(
    supabase: SB,
    id: string,
    data: Partial<WorkoutSetInput>,
  ): Promise<WorkoutSet | null> {
    const patch: Record<string, unknown> = {}
    if (data.set_order !== undefined) patch.set_number = data.set_order
    if (data.reps !== undefined) patch.reps = data.reps
    if (data.weight !== undefined) patch.weight = data.weight
    if (data.rest_time !== undefined) patch.rest_time = data.rest_time
    if (data.notes !== undefined) patch.notes = data.notes
    if (data.duration_seconds !== undefined) patch.duration_seconds = data.duration_seconds
    if (data.distance_km !== undefined) patch.distance_km = data.distance_km
    if (data.incline !== undefined) patch.incline = data.incline
    if (data.speed_kmh !== undefined) patch.speed_kmh = data.speed_kmh

    if (Object.keys(patch).length === 0) {
      return workoutSetQueries.getById(supabase, id)
    }

    const { data: row, error } = await queryClient(supabase)
      .from('workout_sets')
      .update(patch)
      .eq('id', id)
      .select(SET_COLUMNS)
      .maybeSingle()

    assertPostgresOk(error)
    if (!row) return null
    return mapSet(row as SetRow)
  },

  async delete(supabase: SB, id: string): Promise<boolean> {
    const { data, error } = await queryClient(supabase)
      .from('workout_sets')
      .delete()
      .eq('id', id)
      .select('id')

    assertPostgresOk(error)
    return Array.isArray(data) && data.length > 0
  },

  // Remove every set for a given exercise from a given workout. Used by the
  // workout UI's "Remove Exercise" button. RLS keeps the delete scoped to the
  // user's own workouts.
  async deleteByExercise(supabase: SB, workoutId: string, exerciseId: string): Promise<number> {
    const { data, error } = await queryClient(supabase)
      .from('workout_sets')
      .delete()
      .eq('workout_id', workoutId)
      .eq('exercise_id', exerciseId)
      .select('id')

    assertPostgresOk(error)
    return Array.isArray(data) ? data.length : 0
  },
}
