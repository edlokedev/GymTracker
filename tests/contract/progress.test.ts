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
          duration_seconds: 1200,
          distance_km: 2,
          speed_kmh: 6,
          incline: 5,
          created_at: '2026-05-20T10:00:00Z',
          exercises: { name: 'Bench Press' },
          workout_sessions: { date: '2026-05-20', user_id: fakeUser.id },
        },
        {
          id: 'set-2',
          workout_id: 'sess-2',
          exercise_id: 'ex-1',
          set_number: 1,
          weight: 100,
          reps: 6,
          duration_seconds: 1500,
          distance_km: 3,
          speed_kmh: 7.2,
          incline: 5,
          created_at: '2026-05-22T10:00:00Z',
          exercises: { name: 'Bench Press' },
          workout_sessions: { date: '2026-05-22', user_id: fakeUser.id },
        },
      ],
    })
    const res = await runRoute({
      contract: progressContract,
      method: 'GET',
      handler: getProgress,
      user: fakeUser,
      supabase,
      query: { startDate: '2026-05-01', endDate: '2026-05-31', metric: 'distance' },
    })
    expect(res.status).toBe(200)
    const parsed = progressContract.methods.GET.response.parse(res.body.data)
    expect(parsed.totalExercises).toBe(1)
    expect(parsed.dateRange).toEqual({ start: '2026-05-01', end: '2026-05-31' })
    expect(parsed.progress[0].exerciseName).toBe('Bench Press')
    expect(parsed.progress[0].dataPoints[0]).toMatchObject({
      durationSeconds: 1200,
      distanceKm: 2,
      speedKmh: 6,
      incline: 5,
    })
    expect(parsed.progress[0].personalRecords.maxDistance?.distanceKm).toBe(3)
    expect(parsed.progress[0].statistics.totalDistanceKm).toBe(5)
    expect(parsed.progress[0].statistics.improvementPercentage).toBe(50)
  })

  it('returns 400 for unsupported progress metrics', async () => {
    const supabase = stubSupabase({ workout_sets: [] })
    const res = await runRoute({
      contract: progressContract,
      method: 'GET',
      handler: getProgress,
      user: fakeUser,
      supabase,
      query: { metric: 'pace' },
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid progress metric')
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
