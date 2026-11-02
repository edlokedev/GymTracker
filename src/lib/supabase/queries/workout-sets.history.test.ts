import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { AppSupabaseClient } from '../query-client'
import { workoutSetQueries } from './workout-sets'

// Drives the real supabase-js/PostgREST builder with a capturing fetch so the
// test pins the actual request semantics, not a mocked call shape. The bug this
// guards: `order(col, { foreignTable })` serializes to `workout_sessions.order=`,
// which only sorts the EMBEDDED rows. Parent rows then sort by set_number alone,
// so `limit` keeps set #1 of many sessions and drops sets 2..n of recent ones.
function makeCapturingClient(rows: unknown[] = []) {
  const urls: URL[] = []
  const fetchImpl = async (input: RequestInfo | URL) => {
    urls.push(new URL(typeof input === 'string' ? input : input.toString()))
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const client = createClient('http://localhost:54321', 'anon-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchImpl as typeof fetch },
  }) as unknown as AppSupabaseClient
  return { client, urls }
}

describe('workoutSetQueries.listHistory', () => {
  it('orders parent set rows newest session first, then set_number, before limiting', async () => {
    const { client, urls } = makeCapturingClient()

    await workoutSetQueries.listHistory(client, 'user-1', 'ex-1', 15)

    expect(urls).toHaveLength(1)
    const params = urls[0].searchParams
    expect(params.get('order')).toBe('workout_sessions(date).desc,set_number.asc,created_at.asc')
    // Embedded-only ordering must not be used: it does not affect which parent
    // rows survive the limit.
    expect(params.get('workout_sessions.order')).toBeNull()
    expect(params.get('limit')).toBe('15')
    expect(params.get('exercise_id')).toBe('eq.ex-1')
    expect(params.get('workout_sessions.user_id')).toBe('eq.user-1')
  })

  it('maps every returned set with its session date and name', async () => {
    const session = { date: '2026-11-01', name: 'Pull', user_id: 'user-1' }
    const { client } = makeCapturingClient(
      [1, 2, 3].map((n) => ({
        id: `s${n}`,
        set_number: n,
        weight: 50,
        reps: 10,
        duration_seconds: null,
        distance_km: null,
        incline: null,
        speed_kmh: null,
        created_at: '2026-11-01T10:00:00Z',
        workout_sessions: session,
      })),
    )

    const result = await workoutSetQueries.listHistory(client, 'user-1', 'ex-1', 15)

    expect(result.map((s) => [s.set_number, s.session_date, s.session_name])).toEqual([
      [1, '2026-11-01', 'Pull'],
      [2, '2026-11-01', 'Pull'],
      [3, '2026-11-01', 'Pull'],
    ])
  })
})
