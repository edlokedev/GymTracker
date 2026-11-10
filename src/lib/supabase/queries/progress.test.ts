import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { BadRequestError } from '../../api/errors'
import type { AppSupabaseClient } from '../query-client'
import { getProgressData } from './progress'

type Row = {
  id: string
  workout_id: string
  exercise_id: string
  set_number: number
  weight: number | null
  reps: number | null
  date: string
}

function makeRow(partial: Partial<Row> & { id: string }): Row {
  return {
    workout_id: 'w1',
    exercise_id: 'ex-1',
    set_number: 1,
    weight: 50,
    reps: 10,
    date: '2026-11-01',
    ...partial,
  }
}

// Real supabase-js/PostgREST builder + capturing fetch (same approach as
// workout-sets.history.test.ts) that serves `allRows` honoring offset/limit.
function makePagedClient(allRows: Row[]) {
  const urls: URL[] = []
  const fetchImpl = async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === 'string' ? input : input.toString())
    urls.push(url)
    const offset = Number(url.searchParams.get('offset') ?? 0)
    const limit = Number(url.searchParams.get('limit') ?? allRows.length)
    const page = allRows.slice(offset, offset + limit).map((r) => ({
      id: r.id,
      workout_id: r.workout_id,
      exercise_id: r.exercise_id,
      set_number: r.set_number,
      weight: r.weight,
      reps: r.reps,
      duration_seconds: null,
      distance_km: null,
      speed_kmh: null,
      incline: null,
      created_at: '2026-11-01T10:00:00Z',
      exercises: { name: `Name ${r.exercise_id}` },
      workout_sessions: { date: r.date, user_id: 'user-1' },
    }))
    return new Response(JSON.stringify(page), {
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

const base = { userId: 'user-1', startDate: '2026-01-01', endDate: '2026-12-31' }

describe('getProgressData query shape', () => {
  it('orders parent rows by session date (not embedded-only) so paging is stable', async () => {
    const { client, urls } = makePagedClient([])

    await getProgressData(client, base)

    const params = urls[0].searchParams
    expect(params.get('order')).toBe(
      'workout_sessions(date).asc,exercise_id.asc,set_number.asc,id.asc',
    )
    expect(params.get('workout_sessions.order')).toBeNull()
  })

  it('pages until exhausted so no exercise is dropped past the page size', async () => {
    const rows = ['ex-a', 'ex-b', 'ex-c', 'ex-d', 'ex-e'].map((exercise_id, i) =>
      makeRow({ id: `s${i}`, exercise_id }),
    )
    const { client, urls } = makePagedClient(rows)

    const result = await getProgressData(client, { ...base, limit: 2 })

    expect(result.map((r) => r.exerciseId).sort()).toEqual(['ex-a', 'ex-b', 'ex-c', 'ex-d', 'ex-e'])
    expect(urls.length).toBe(3)
  })

  it('fails loudly instead of silently truncating when the hard cap is hit', async () => {
    const rows = Array.from({ length: 30 }, (_, i) => makeRow({ id: `s${i}`, set_number: i }))
    const { client } = makePagedClient(rows)

    await expect(
      getProgressData(client, { ...base, limit: 1, maxRows: 10 }),
    ).rejects.toBeInstanceOf(BadRequestError)
  })
})

describe('personal records', () => {
  it('awards reps PRs to bodyweight sets (weight 0 or null)', async () => {
    const { client } = makePagedClient([
      makeRow({ id: 'a', weight: null, reps: 8, date: '2026-11-01' }),
      makeRow({ id: 'b', weight: 0, reps: 12, date: '2026-11-02' }),
    ])

    const [result] = await getProgressData(client, base)

    expect(result.personalRecords.maxReps?.id).toBe('b')
    expect(result.dataPoints.map((p) => p.isPersonalRecord)).toEqual([true, true])
  })

  it('keeps weighted reps PR behaviour: more reps wins, ties broken by weight', async () => {
    const { client } = makePagedClient([
      makeRow({ id: 'a', weight: 50, reps: 10, date: '2026-11-01' }),
      makeRow({ id: 'b', weight: 60, reps: 10, date: '2026-11-02' }),
      makeRow({ id: 'c', weight: 40, reps: 10, date: '2026-11-03' }),
    ])

    const [result] = await getProgressData(client, base)

    expect(result.personalRecords.maxReps?.id).toBe('b')
  })

  it('keeps equal-date sets in input order (comparator returns 0 for ties)', async () => {
    const { client } = makePagedClient([
      makeRow({ id: 'a', set_number: 1, date: '2026-11-01' }),
      makeRow({ id: 'b', set_number: 2, date: '2026-11-01' }),
      makeRow({ id: 'c', set_number: 3, date: '2026-11-01' }),
    ])

    const [result] = await getProgressData(client, base)

    expect(result.dataPoints.map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })
})
