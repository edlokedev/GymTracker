import { describe, expect, it } from 'vitest'
import { workoutDetailsContract } from '../../src/lib/api/contracts/workout-details.contract'
import { getWorkoutDetails } from '../../src/routes/api.workout-details'
import { fakeUser, runRoute } from './run-route'
import { stubSupabase } from './stub-supabase'

describe('GET /api/workout-details', () => {
  it('returns sessions + sets + totals for the requested date (happy path)', async () => {
    const supabase = stubSupabase(
      {
        workout_sessions: [
          {
            id: 'sess-1',
            user_id: fakeUser.id,
            date: '2026-05-23',
            start_time: '2026-05-23T10:00:00Z',
            end_time: '2026-05-23T11:00:00Z',
            notes: null,
          },
        ],
        workout_sets: [
          {
            id: 'set-1',
            workout_id: 'sess-1',
            exercise_id: 'ex-1',
            set_number: 1,
            weight: 100,
            reps: 5,
            rest_time: null,
            notes: null,
            created_at: '2026-05-23T10:00:00Z',
          },
        ],
        exercises: [{ id: 'ex-1', name: 'Bench Press' }],
      },
      { userId: fakeUser.id },
    )
    const res = await runRoute({
      contract: workoutDetailsContract,
      method: 'GET',
      handler: getWorkoutDetails,
      user: fakeUser,
      supabase,
      query: { date: '2026-05-23' },
    })
    expect(res.status).toBe(200)
    const parsed = workoutDetailsContract.methods.GET.response.parse(res.body.data)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].totalVolume).toBe(500)
    expect(parsed[0].exerciseCount).toBe(1)
    expect(parsed[0].sets[0].exerciseName).toBe('Bench Press')
  })

  it('returns 401 for anonymous requests', async () => {
    const supabase = stubSupabase({ workout_sessions: [], workout_sets: [] })
    const res = await runRoute({
      contract: workoutDetailsContract,
      method: 'GET',
      handler: getWorkoutDetails,
      user: null,
      supabase,
      query: { date: '2026-05-23' },
    })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Unauthorized')
  })

  it('returns 400 when ?date is missing', async () => {
    const supabase = stubSupabase(
      { workout_sessions: [], workout_sets: [] },
      { userId: fakeUser.id },
    )
    const res = await runRoute({
      contract: workoutDetailsContract,
      method: 'GET',
      handler: getWorkoutDetails,
      user: fakeUser,
      supabase,
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('date is required')
  })
})
