import { describe, expect, it } from 'vitest'
import { exercisesRecentContract } from '../../src/lib/api/contracts/exercises.recent.contract'
import { getRecentExercises } from '../../src/routes/api.exercises.recent'
import { fakeUser, runRoute } from './run-route'
import { stubSupabase } from './stub-supabase'

const parentRefs = {
  workout_sets: { table: 'workout_sessions', childKey: 'workout_id' },
}

const bench = {
  id: 'ex-1',
  name: 'Bench Press',
  category_id: 'cat-1',
  tracking_type: 'strength',
  force: 'push',
  level: 'intermediate',
  mechanic: 'compound',
  equipment: 'barbell',
  primary_muscles: ['chest'],
  secondary_muscles: ['triceps'],
  instructions: ['Lie down', 'Lift'],
  gif_path: null,
  preview_image_path: null,
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
  exercise_categories: { name: 'Chest' },
}

describe('GET /api/exercises/recent', () => {
  it('groups visible workout history by exercise and hides other users rows', async () => {
    const supabase = stubSupabase(
      {
        workout_sessions: [
          { id: 'sess-1', user_id: fakeUser.id, start_time: '2026-06-01T10:00:00Z' },
          { id: 'sess-2', user_id: fakeUser.id, start_time: '2026-06-02T10:00:00Z' },
          { id: 'sess-3', user_id: 'user-2', start_time: '2026-06-03T10:00:00Z' },
        ],
        workout_sets: [
          {
            id: 'set-1',
            workout_id: 'sess-1',
            exercise_id: 'ex-1',
            created_at: '2026-06-01T10:05:00Z',
            workout_sessions: { user_id: fakeUser.id, start_time: '2026-06-01T10:00:00Z' },
          },
          {
            id: 'set-2',
            workout_id: 'sess-2',
            exercise_id: 'ex-1',
            created_at: '2026-06-02T10:05:00Z',
            workout_sessions: { user_id: fakeUser.id, start_time: '2026-06-02T10:00:00Z' },
          },
          {
            id: 'set-3',
            workout_id: 'sess-3',
            exercise_id: 'ex-2',
            created_at: '2026-06-03T10:05:00Z',
            workout_sessions: { user_id: 'user-2', start_time: '2026-06-03T10:00:00Z' },
          },
        ],
        exercises: [bench, { ...bench, id: 'ex-2', name: 'Squat' }],
      },
      { userId: fakeUser.id, parentRefs },
    )

    const res = await runRoute({
      contract: exercisesRecentContract,
      method: 'GET',
      handler: getRecentExercises,
      user: fakeUser,
      supabase,
      query: { limit: '10' },
    })

    expect(res.status).toBe(200)
    const parsed = exercisesRecentContract.methods.GET.response.parse(res.body.data)
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0]).toMatchObject({
      exercise: { id: 'ex-1', name: 'Bench Press' },
      lastUsedAt: '2026-06-02T10:00:00Z',
      useCount: 2,
    })
  })

  it('GET returns 401 anonymously', async () => {
    const res = await runRoute({
      contract: exercisesRecentContract,
      method: 'GET',
      handler: getRecentExercises,
      user: null,
      supabase: stubSupabase({ workout_sets: [], exercises: [] }),
    })
    expect(res.status).toBe(401)
  })
})
