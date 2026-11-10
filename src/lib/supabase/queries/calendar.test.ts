import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { AppSupabaseClient } from '../query-client'
import { getCalendarAggregate } from './calendar'

type Session = { id: string; date: string; start_time: string | null; end_time: string | null }
type SetRow = {
  workout_id: string
  exercise_id: string
  weight: number | null
  reps: number | null
}

// Real supabase-js builder + fake fetch. Emulates PostgREST's 1000-row max-rows
// cap: a request without an explicit limit is truncated to 1000 rows.
function makeClient(sessions: Session[], sets: SetRow[]) {
  const urls: URL[] = []
  const fetchImpl = async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === 'string' ? input : input.toString())
    urls.push(url)
    let body: unknown[]
    if (url.pathname.endsWith('/workout_sets')) {
      const offset = Number(url.searchParams.get('offset') ?? 0)
      const limit = Math.min(Number(url.searchParams.get('limit') ?? 1000), 1000)
      body = sets.slice(offset, offset + limit)
    } else if (url.searchParams.get('select') === 'date') {
      body = sessions.map((s) => ({ date: s.date }))
    } else {
      body = sessions
    }
    return new Response(JSON.stringify(body), {
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

const range = { startDate: '2026-11-01', endDate: '2026-11-03', today: '2026-11-03' }

function day(result: Awaited<ReturnType<typeof getCalendarAggregate>>, date: string) {
  const d = result.data.find((x) => x.date === date)
  if (!d) throw new Error(`no day ${date}`)
  return d
}

describe('getCalendarAggregate', () => {
  it('pages sets past the 1000-row cap so totals are not undercounted', async () => {
    const sessions = [{ id: 'w1', date: '2026-11-02', start_time: null, end_time: null }]
    const sets = Array.from({ length: 2500 }, () => ({
      workout_id: 'w1',
      exercise_id: 'ex-1',
      weight: 10,
      reps: 1,
    }))
    const { client } = makeClient(sessions, sets)

    const result = await getCalendarAggregate(client, 'user-1', range)

    expect(day(result, '2026-11-02').totalSets).toBe(2500)
    expect(day(result, '2026-11-02').totalVolume).toBe(25000)
  })

  it('recomputes intensity, sums duration and counts distinct exercises for same-day sessions', async () => {
    // Session order mirrors the query: latest first.
    const sessions = [
      {
        id: 'w2',
        date: '2026-11-02',
        start_time: '2026-11-02T18:00:00Z',
        end_time: '2026-11-02T18:30:00Z',
      },
      {
        id: 'w1',
        date: '2026-11-02',
        start_time: '2026-11-02T08:00:00Z',
        end_time: '2026-11-02T08:45:00Z',
      },
    ]
    const mk = (workout_id: string, exercise_id: string, n: number): SetRow[] =>
      Array.from({ length: n }, () => ({ workout_id, exercise_id, weight: 10, reps: 5 }))
    // w2: ex-a x4, ex-b x2 ; w1: ex-a x5  -> 11 sets, 3 sessions-exercises but 2 distinct
    const sets = [...mk('w2', 'ex-a', 4), ...mk('w2', 'ex-b', 2), ...mk('w1', 'ex-a', 5)]
    const { client } = makeClient(sessions, sets)

    const result = await getCalendarAggregate(client, 'user-1', range)
    const d = day(result, '2026-11-02')

    expect(d.workoutCount).toBe(2)
    expect(d.totalSets).toBe(11)
    expect(d.exerciseCount).toBe(2)
    expect(d.intensity).toBe('moderate') // first session alone (6 sets) would be 'light'
    expect(d.duration).toBe(75)
  })
})
