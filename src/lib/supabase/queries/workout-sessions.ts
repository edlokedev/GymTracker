// Supabase-backed query module for private workout sessions.
//
// Mirrors src/lib/database/queries/workouts.ts (`workoutQueries`) but talks to
// Postgres through a request-scoped Supabase client. Every function expects the
// caller to have already authenticated with `getAuthenticatedUser(request)` —
// these queries do NOT take a userId argument. Row Level Security on
// `workout_sessions` ensures the user only sees/touches their own rows.
//
// Response shapes mirror the legacy SQLite queries:
//   * single rows: snake_case session shape, dates as ISO strings.
//   * list:        PaginatedResult<WorkoutSession>.
// `id` is generated server-side by `gen_random_uuid()`; never pass it on insert.

import { assertPostgresOk } from '../../api/errors'
import type {
  PaginatedResult,
  WorkoutSession,
  WorkoutSessionInput,
  WorkoutSet,
  WorkoutWithDetails,
} from '../../types/database'
import { type AppSupabaseClient, queryClient } from '../query-client'

type SB = AppSupabaseClient

// Shape Postgres returns for a workout_sessions row.
type SessionRow = {
  id: string
  user_id: string
  name: string | null
  date: string
  start_time: string
  end_time: string | null
  notes: string | null
  created_at: string
  updated_at: string
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
  created_at: string
  updated_at: string
}

function mapSession(row: SessionRow): WorkoutSession {
  // The legacy SQLite shape exposed `name` / `notes` / `end_time` as optional
  // (`string | undefined`). Postgres gives us `null`; normalize to `undefined`
  // so callers and tests that compare against the SQLite shape stay happy.
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name ?? undefined,
    date: row.date,
    start_time: row.start_time,
    end_time: row.end_time ?? undefined,
    notes: row.notes ?? undefined,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  }
}

const SESSION_COLUMNS =
  'id, user_id, name, date, start_time, end_time, notes, created_at, updated_at'
const SET_COLUMNS =
  'id, workout_id, exercise_id, set_number, weight, reps, rest_time, notes, duration_seconds, distance_km, incline, speed_kmh, created_at, updated_at'

export const workoutSessionQueries = {
  // Paginated list of the authenticated user's workout sessions.
  // RLS already filters to auth.uid() = user_id; we still rely on the server
  // returning the user's id implicitly via JWT.
  async list(
    supabase: SB,
    limit: number = 20,
    offset: number = 0,
  ): Promise<PaginatedResult<WorkoutSession>> {
    const { data, error, count } = await queryClient(supabase)
      .from('workout_sessions')
      .select(SESSION_COLUMNS, { count: 'exact' })
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1)

    assertPostgresOk(error)

    const rows = ((data ?? []) as SessionRow[]).map(mapSession)
    const total = count ?? 0

    return {
      data: rows,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      hasMore: offset + limit < total,
    }
  },

  async getById(supabase: SB, id: string): Promise<WorkoutSession | null> {
    const { data, error } = await queryClient(supabase)
      .from('workout_sessions')
      .select(SESSION_COLUMNS)
      .eq('id', id)
      .maybeSingle()

    assertPostgresOk(error)
    if (!data) return null
    return mapSession(data as SessionRow)
  },

  // Create a new session owned by `userId`. The caller must pass the
  // authenticated user's id; RLS rejects the insert if it doesn't match
  // auth.uid(), so we never accept a userId from client input.
  async create(
    supabase: SB,
    userId: string,
    data: Omit<WorkoutSessionInput, 'user_id'>,
  ): Promise<WorkoutSession> {
    const nowIso = new Date().toISOString()
    const today = nowIso.split('T')[0]

    const insertRow = {
      user_id: userId,
      name: data.name ?? null,
      date: data.date ?? today,
      notes: data.notes ?? null,
      start_time: data.start_time ?? nowIso,
      end_time: data.end_time ?? null,
    }

    const { data: row, error } = await queryClient(supabase)
      .from('workout_sessions')
      .insert(insertRow)
      .select(SESSION_COLUMNS)
      .single()

    assertPostgresOk(error)
    return mapSession(row as SessionRow)
  },

  // Partial update. Returns the post-update row, or null if no row exists
  // (or RLS prevented access).
  async update(
    supabase: SB,
    id: string,
    data: Partial<Omit<WorkoutSessionInput, 'user_id'>>,
  ): Promise<WorkoutSession | null> {
    const patch: Record<string, unknown> = {}
    if (data.name !== undefined) patch.name = data.name
    if (data.date !== undefined) patch.date = data.date
    if (data.notes !== undefined) patch.notes = data.notes
    if (data.start_time !== undefined) patch.start_time = data.start_time
    if (data.end_time !== undefined) patch.end_time = data.end_time

    if (Object.keys(patch).length === 0) {
      // Nothing to patch — mirror SQLite behavior and return the current row.
      return workoutSessionQueries.getById(supabase, id)
    }

    const { data: row, error } = await queryClient(supabase)
      .from('workout_sessions')
      .update(patch)
      .eq('id', id)
      .select(SESSION_COLUMNS)
      .maybeSingle()

    assertPostgresOk(error)
    if (!row) return null
    return mapSession(row as SessionRow)
  },

  // Mark a session as complete by stamping end_time = now(). Mirrors the
  // SQLite behavior which only completes a session if end_time was null.
  async complete(supabase: SB, id: string): Promise<WorkoutSession | null> {
    const { data: row, error } = await queryClient(supabase)
      .from('workout_sessions')
      .update({ end_time: new Date().toISOString() })
      .eq('id', id)
      .is('end_time', null)
      .select(SESSION_COLUMNS)
      .maybeSingle()

    assertPostgresOk(error)
    if (!row) return null
    return mapSession(row as SessionRow)
  },

  // Duplicate a visible source session into a new row owned by the
  // authenticated user, then copy all source sets to the new session.
  async duplicate(
    supabase: SB,
    userId: string,
    sourceSessionId: string,
  ): Promise<WorkoutSession | null> {
    const { data: source, error: sourceError } = await queryClient(supabase)
      .from('workout_sessions')
      .select(SESSION_COLUMNS)
      .eq('id', sourceSessionId)
      .eq('user_id', userId)
      .maybeSingle()

    assertPostgresOk(sourceError)
    if (!source) return null

    const { data: sourceSets, error: sourceSetsError } = await queryClient(supabase)
      .from('workout_sets')
      .select(SET_COLUMNS)
      .eq('workout_id', sourceSessionId)
      .order('set_number', { ascending: true })
      .order('created_at', { ascending: true })

    assertPostgresOk(sourceSetsError)

    const sourceRow = source as SessionRow
    const duplicatedSession = await workoutSessionQueries.create(supabase, userId, {
      name: sourceRow.name ?? undefined,
      notes: sourceRow.notes ?? undefined,
    })

    try {
      for (const set of (sourceSets ?? []) as SetRow[]) {
        const { error } = await queryClient(supabase)
          .from('workout_sets')
          .insert({
            workout_id: duplicatedSession.id,
            exercise_id: set.exercise_id,
            set_number: set.set_number,
            weight: set.weight,
            reps: set.reps,
            rest_time: set.rest_time,
            notes: set.notes,
            duration_seconds: set.duration_seconds,
            distance_km: set.distance_km,
            incline: set.incline,
            speed_kmh: set.speed_kmh,
          })
          .select(SET_COLUMNS)
          .single()

        assertPostgresOk(error)
      }
    } catch (error) {
      await workoutSessionQueries.delete(supabase, duplicatedSession.id).catch(() => undefined)
      throw error
    }

    return duplicatedSession
  },

  // Fetch a single session plus every set on it, grouped by exercise and
  // hydrated with exercise metadata (joined from `exercises` and the catalog
  // category name). Returns null when the session doesn't exist or RLS hides
  // it. The shape matches WorkoutWithDetails so the React workout view can
  // render directly from it.
  async getWithDetails(supabase: SB, id: string): Promise<WorkoutWithDetails | null> {
    const sessionRow = await workoutSessionQueries.getById(supabase, id)
    if (!sessionRow) return null

    const { data: setsData, error: setsError } = await queryClient(supabase)
      .from('workout_sets')
      .select(SET_COLUMNS)
      .eq('workout_id', id)
      .order('set_number', { ascending: true })
      .order('created_at', { ascending: true })
    assertPostgresOk(setsError)

    const sets = (setsData ?? []) as SetRow[]

    const uniqueExerciseIds = Array.from(new Set(sets.map((s) => s.exercise_id)))

    type ExerciseRow = {
      id: string
      name: string
      category_id: string
      tracking_type: 'strength' | 'cardio' | 'timed'
      force: 'push' | 'pull' | 'static' | null
      level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null
      mechanic: 'compound' | 'isolation' | null
      equipment: string | null
      primary_muscles: unknown
      secondary_muscles: unknown
      instructions: unknown
      gif_path: string | null
      preview_image_path: string | null
      created_at: string
      updated_at: string
      exercise_categories: { name: string } | { name: string }[] | null
    }

    let exerciseRows: ExerciseRow[] = []
    if (uniqueExerciseIds.length > 0) {
      const { data, error } = await queryClient(supabase)
        .from('exercises')
        .select(
          'id, name, category_id, tracking_type, force, level, mechanic, equipment, primary_muscles, secondary_muscles, instructions, gif_path, preview_image_path, created_at, updated_at, exercise_categories!inner(name)',
        )
        .in('id', uniqueExerciseIds)
      assertPostgresOk(error)
      exerciseRows = (data ?? []) as ExerciseRow[]
    }

    const exerciseById = new Map<string, ExerciseRow>()
    for (const row of exerciseRows) exerciseById.set(row.id, row)

    const setsByExercise = new Map<string, typeof sets>()
    for (const set of sets) {
      const bucket = setsByExercise.get(set.exercise_id) ?? []
      bucket.push(set)
      setsByExercise.set(set.exercise_id, bucket)
    }

    const asStringArray = (value: unknown): string[] =>
      Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []

    const exercises = Array.from(setsByExercise.entries()).map(([exerciseId, exSets]) => {
      const row = exerciseById.get(exerciseId)
      const catName = Array.isArray(row?.exercise_categories)
        ? (row?.exercise_categories[0]?.name ?? '')
        : (row?.exercise_categories?.name ?? '')

      return {
        exercise: {
          id: exerciseId,
          name: row?.name ?? exerciseId,
          primary_muscles: asStringArray(row?.primary_muscles),
          secondary_muscles: asStringArray(row?.secondary_muscles),
          instructions: asStringArray(row?.instructions),
          equipment: row?.equipment ?? '',
          category_id: row?.category_id ?? '',
          category_name: catName,
          tracking_type: row?.tracking_type ?? 'strength',
          force: row?.force ?? null,
          level: row?.level ?? null,
          mechanic: row?.mechanic ?? null,
          gif_path: row?.gif_path ?? null,
          preview_image_path: row?.preview_image_path ?? null,
          created_at: row?.created_at ? new Date(row.created_at) : new Date(),
          updated_at: row?.updated_at ? new Date(row.updated_at) : new Date(),
        },
        sets: exSets.map<WorkoutSet>((s) => ({
          id: s.id,
          workout_id: s.workout_id,
          exercise_id: s.exercise_id,
          set_number: s.set_number,
          weight: s.weight ?? undefined,
          reps: s.reps ?? undefined,
          rest_time: s.rest_time ?? undefined,
          notes: s.notes ?? undefined,
          duration_seconds: s.duration_seconds ?? undefined,
          distance_km: s.distance_km ?? undefined,
          incline: s.incline ?? undefined,
          speed_kmh: s.speed_kmh ?? undefined,
          created_at: new Date(s.created_at),
          updated_at: new Date(s.updated_at),
        })),
      }
    })

    return {
      ...sessionRow,
      exercises,
    }
  },

  async delete(supabase: SB, id: string): Promise<boolean> {
    // Use `.select('id')` to learn whether anything was deleted under RLS.
    const { data, error } = await queryClient(supabase)
      .from('workout_sessions')
      .delete()
      .eq('id', id)
      .select('id')

    assertPostgresOk(error)
    return Array.isArray(data) && data.length > 0
  },
}
