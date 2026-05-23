import { describe, expect, it } from 'vitest'
import { progressContract } from '../../src/lib/api/contracts/progress.contract'
import { getProgress } from '../../src/routes/api.progress'
import { fakeUser, runRoute } from './run-route'
import { stubSupabase } from './stub-supabase'

describe('GET /api/progress', () => {
  it('returns the progress envelope for the authenticated user', async () => {
    // The progress query embeds workout_sessions onto workout_sets via a
    // PostgREST join. The stub flattens this: each set row carries
    // `exercises` and `workout_sessions` properties already.
    const supabase = stubSupabase({
      workout_sets: [
        {
          id: 'set-1',
          workout_id: 'sess-1',
          exercise_id: 'ex-1',
          set_number: 1,
          weight: 100,
          reps: 5,
          created_at: '2026-05-20T10:00:00Z',
          exercises: { name: 'Bench Press' },
          workout_sessions: { date: '2026-05-20', user_id: fakeUser.id },
        },
      ],
    })
    const res = await runRoute({
      contract: progressContract,
      method: 'GET',
      handler: getProgress,
      user: fakeUser,
      supabase,
      query: { startDate: '2026-05-01', endDate: '2026-05-31' },
    })
    expect(res.status).toBe(200)
    const parsed = progressContract.methods.GET.response.parse(res.body.data)
    expect(parsed.totalExercises).toBe(1)
    expect(parsed.dateRange).toEqual({ start: '2026-05-01', end: '2026-05-31' })
    expect(parsed.progress[0].exerciseName).toBe('Bench Press')
  })

  it('returns 401 for anonymous requests', async () => {
    const supabase = stubSupabase({ workout_sets: [] })
    const res = await runRoute({
      contract: progressContract,
      method: 'GET',
      handler: getProgress,
      user: null,
      supabase,
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 when startDate is after endDate', async () => {
    const supabase = stubSupabase({ workout_sets: [] })
    const res = await runRoute({
      contract: progressContract,
      method: 'GET',
      handler: getProgress,
      user: fakeUser,
      supabase,
      query: { startDate: '2026-06-01', endDate: '2026-05-01' },
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Start date cannot be after end date')
  })
})
