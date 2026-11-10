import type { User } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { PrivateHandlerContext } from '../lib/api/define-private-route'
import { createWorkoutSet, updateWorkoutSet } from './api.workout-sets'

const fakeUser = { id: 'user-1' } as unknown as User

const storedRow = {
  id: 'set-1',
  workout_id: 'w1',
  exercise_id: 'ex1',
  set_number: 0,
  weight: null,
  reps: null,
  rest_time: null,
  notes: null,
  duration_seconds: null,
  distance_km: null,
  incline: null,
  speed_kmh: null,
  created_at: '2026-05-01T10:00:00Z',
  updated_at: '2026-05-01T10:00:00Z',
}

// Records the row/patch handed to insert()/update() and answers with storedRow.
function recordingSupabase() {
  const written: { insert?: Record<string, unknown>; update?: Record<string, unknown> } = {}
  const builder = {
    insert: (row: Record<string, unknown>) => {
      written.insert = row
      return builder
    },
    update: (patch: Record<string, unknown>) => {
      written.update = patch
      return builder
    },
    eq: () => builder,
    select: () => builder,
    single: () => Promise.resolve({ data: storedRow, error: null }),
    maybeSingle: () => Promise.resolve({ data: storedRow, error: null }),
  }
  const supabase = { from: () => builder } as unknown as PrivateHandlerContext['supabase']
  return { supabase, written }
}

function ctx(
  method: 'POST' | 'PUT',
  search: string,
  body: unknown,
  supabase: PrivateHandlerContext['supabase'],
): PrivateHandlerContext {
  const url = `http://test/api/workout-sets${search}`
  return {
    user: fakeUser,
    supabase,
    request: new Request(url, { method, body: JSON.stringify(body) }),
    url: new URL(url),
    params: {},
  }
}

describe('POST /api/workout-sets', () => {
  it('accepts set_order 0 instead of treating it as missing', async () => {
    const { supabase, written } = recordingSupabase()

    await createWorkoutSet(
      ctx('POST', '', { workout_id: 'w1', exercise_id: 'ex1', set_order: 0 }, supabase),
    )

    expect(written.insert).toMatchObject({ set_number: 0 })
  })

  it('still rejects a missing set_order', async () => {
    const { supabase } = recordingSupabase()

    await expect(
      createWorkoutSet(ctx('POST', '', { workout_id: 'w1', exercise_id: 'ex1' }, supabase)),
    ).rejects.toThrow('Missing required fields')
  })
})

describe('PUT /api/workout-sets', () => {
  it('persists null so a cleared field is actually cleared', async () => {
    const { supabase, written } = recordingSupabase()

    await updateWorkoutSet(
      ctx('PUT', '?id=set-1', { weight: null, notes: null, rest_time: null }, supabase),
    )

    expect(written.update).toEqual({ weight: null, notes: null, rest_time: null })
  })
})
