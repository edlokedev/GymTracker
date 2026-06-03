import { describe, expect, it } from 'vitest'
import { exercisesSuggestedContract } from '../../src/lib/api/contracts/exercises.suggested.contract'
import { getSuggestedExercises } from '../../src/routes/api.exercises.suggested'
import { fakeUser, runRoute } from './run-route'
import { stubSupabase } from './stub-supabase'

const parentRefs = {
  workout_sets: { table: 'workout_sessions', childKey: 'workout_id' },
}

const baseExercise = {
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

describe('GET /api/exercises/suggested', () => {
  it('ranks substitutions from catalog context plus private favorite/recent boosts', async () => {
    const supabase = stubSupabase(
      {
        exercise_favorites: [
          { user_id: fakeUser.id, exercise_id: 'ex-2', created_at: '2026-06-01T10:00:00Z' },
          { user_id: 'user-2', exercise_id: 'ex-3', created_at: '2026-06-01T11:00:00Z' },
        ],
        workout_sessions: [{ id: 'sess-1', user_id: fakeUser.id }],
        workout_sets: [
          {
            id: 'set-1',
            workout_id: 'sess-1',
            exercise_id: 'ex-2',
            created_at: '2026-06-02T10:00:00Z',
            workout_sessions: { user_id: fakeUser.id, start_time: '2026-06-02T10:00:00Z' },
          },
        ],
        exercises: [
          baseExercise,
          {
            ...baseExercise,
            id: 'ex-2',
            name: 'Incline Bench Press',
            primary_muscles: ['chest'],
            secondary_muscles: ['shoulders', 'triceps'],
          },
          {
            ...baseExercise,
            id: 'ex-3',
            name: 'Cable Fly',
            equipment: 'cable',
            mechanic: 'isolation',
            secondary_muscles: [],
          },
          {
            ...baseExercise,
            id: 'ex-4',
            name: 'Treadmill Run',
            category_id: 'cat-2',
            tracking_type: 'cardio',
            equipment: 'machine',
            primary_muscles: ['legs'],
            secondary_muscles: [],
            exercise_categories: { name: 'Cardio' },
          },
        ],
      },
      { userId: fakeUser.id, parentRefs },
    )

    const res = await runRoute({
      contract: exercisesSuggestedContract,
      method: 'GET',
      handler: getSuggestedExercises,
      user: fakeUser,
      supabase,
      query: { exerciseId: 'ex-1', muscle: 'chest', limit: '2' },
    })

    expect(res.status).toBe(200)
    const parsed = exercisesSuggestedContract.methods.GET.response.parse(res.body.data)
    expect(parsed.items.map((item) => item.exercise.id)).toEqual(['ex-2', 'ex-3'])
    expect(parsed.items[0].score).toBeGreaterThan(parsed.items[1].score)
    expect(parsed.items[0].reasons).toEqual(
      expect.arrayContaining(['favorite', 'recently used', 'same primary muscle']),
    )
    expect(parsed.items[1].reasons).not.toContain('favorite')
  })

  it('GET returns 400 without exercise or muscle context', async () => {
    const res = await runRoute({
      contract: exercisesSuggestedContract,
      method: 'GET',
      handler: getSuggestedExercises,
      user: fakeUser,
      supabase: stubSupabase({ exercise_favorites: [], workout_sets: [], exercises: [] }),
    })
    expect(res.status).toBe(400)
  })

  it('GET returns 401 anonymously', async () => {
    const res = await runRoute({
      contract: exercisesSuggestedContract,
      method: 'GET',
      handler: getSuggestedExercises,
      user: null,
      supabase: stubSupabase({ exercise_favorites: [], workout_sets: [], exercises: [] }),
      query: { muscle: 'chest' },
    })
    expect(res.status).toBe(401)
  })
})
