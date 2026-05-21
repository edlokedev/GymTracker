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

import type { SupabaseClient } from '@supabase/supabase-js'
import type { PaginatedResult, WorkoutSession, WorkoutSessionInput } from '../../types/database'
import type { Database } from '../database.types'

type SB = SupabaseClient<Database> | SupabaseClient<any, 'public', any>

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

export const workoutSessionQueries = {
  // Paginated list of the authenticated user's workout sessions.
  // RLS already filters to auth.uid() = user_id; we still rely on the server
  // returning the user's id implicitly via JWT.
  async list(
    supabase: SB,
    limit: number = 20,
    offset: number = 0,
  ): Promise<PaginatedResult<WorkoutSession>> {
    const { data, error, count } = await (supabase as any)
      .from('workout_sessions')
      .select(SESSION_COLUMNS, { count: 'exact' })
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

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
    const { data, error } = await (supabase as any)
      .from('workout_sessions')
      .select(SESSION_COLUMNS)
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
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

    const { data: row, error } = await (supabase as any)
      .from('workout_sessions')
      .insert(insertRow)
      .select(SESSION_COLUMNS)
      .single()

    if (error) throw error
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

    const { data: row, error } = await (supabase as any)
      .from('workout_sessions')
      .update(patch)
      .eq('id', id)
      .select(SESSION_COLUMNS)
      .maybeSingle()

    if (error) throw error
    if (!row) return null
    return mapSession(row as SessionRow)
  },

  // Mark a session as complete by stamping end_time = now(). Mirrors the
  // SQLite behavior which only completes a session if end_time was null.
  async complete(supabase: SB, id: string): Promise<WorkoutSession | null> {
    const { data: row, error } = await (supabase as any)
      .from('workout_sessions')
      .update({ end_time: new Date().toISOString() })
      .eq('id', id)
      .is('end_time', null)
      .select(SESSION_COLUMNS)
      .maybeSingle()

    if (error) throw error
    if (!row) return null
    return mapSession(row as SessionRow)
  },

  async delete(supabase: SB, id: string): Promise<boolean> {
    // Use `.select('id')` to learn whether anything was deleted under RLS.
    const { data, error } = await (supabase as any)
      .from('workout_sessions')
      .delete()
      .eq('id', id)
      .select('id')

    if (error) throw error
    return Array.isArray(data) && data.length > 0
  },
}
