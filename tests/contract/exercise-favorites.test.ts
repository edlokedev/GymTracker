import { describe, expect, it } from 'vitest'
import { exerciseFavoritesContract } from '../../src/lib/api/contracts/exercise-favorites.contract'
import {
  addExerciseFavorite,
  deleteExerciseFavorite,
  getExerciseFavorites,
} from '../../src/routes/api.exercise-favorites'
import { fakeUser, runRoute } from './run-route'
import { stubSupabase } from './stub-supabase'

const exercise = {
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

describe('/api/exercise-favorites', () => {
  it('GET returns only authenticated user favorites', async () => {
    const supabase = stubSupabase(
      {
        exercise_favorites: [
          {
            user_id: fakeUser.id,
            exercise_id: 'ex-1',
            created_at: '2026-06-01T10:00:00Z',
          },
          {
            user_id: 'user-2',
            exercise_id: 'ex-2',
            created_at: '2026-06-01T11:00:00Z',
          },
        ],
        exercises: [
          exercise,
          {
            ...exercise,
            id: 'ex-2',
            name: 'Squat',
            exercise_categories: { name: 'Legs' },
          },
        ],
      },
      { userId: fakeUser.id },
    )

    const res = await runRoute({
      contract: exerciseFavoritesContract,
      method: 'GET',
      handler: getExerciseFavorites,
      user: fakeUser,
      supabase,
    })

    expect(res.status).toBe(200)
    const parsed = exerciseFavoritesContract.methods.GET.response.parse(res.body.data)
    expect(parsed.exerciseIds).toEqual(['ex-1'])
    expect(parsed.items.map((item) => item.id)).toEqual(['ex-1'])
  })

  it('POST creates a favorite for authenticated user and ignores client user identity', async () => {
    const supabase = stubSupabase(
      { exercise_favorites: [], exercises: [exercise] },
      { userId: fakeUser.id },
    )

    const res = await runRoute({
      contract: exerciseFavoritesContract,
      method: 'POST',
      handler: addExerciseFavorite,
      user: fakeUser,
      supabase,
      body: { exerciseId: 'ex-1', user_id: 'user-2' },
    })

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ exerciseId: 'ex-1', isFavorite: true })
    expect(supabase._tables.exercise_favorites).toMatchObject([
      { user_id: fakeUser.id, exercise_id: 'ex-1' },
    ])
  })

  it('DELETE removes own favorite without touching another user row', async () => {
    const supabase = stubSupabase(
      {
        exercise_favorites: [
          { user_id: fakeUser.id, exercise_id: 'ex-1', created_at: '2026-06-01T10:00:00Z' },
          { user_id: 'user-2', exercise_id: 'ex-1', created_at: '2026-06-01T11:00:00Z' },
        ],
        exercises: [exercise],
      },
      { userId: fakeUser.id },
    )

    const res = await runRoute({
      contract: exerciseFavoritesContract,
      method: 'DELETE',
      handler: deleteExerciseFavorite,
      user: fakeUser,
      supabase,
      query: { exerciseId: 'ex-1' },
    })

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ exerciseId: 'ex-1', isFavorite: false })
    expect(supabase._tables.exercise_favorites).toEqual([
      { user_id: 'user-2', exercise_id: 'ex-1', created_at: '2026-06-01T11:00:00Z' },
    ])
  })

  it('DELETE returns 404 when no own favorite exists', async () => {
    const supabase = stubSupabase(
      {
        exercise_favorites: [
          { user_id: 'user-2', exercise_id: 'ex-1', created_at: '2026-06-01T11:00:00Z' },
        ],
        exercises: [exercise],
      },
      { userId: fakeUser.id },
    )

    const res = await runRoute({
      contract: exerciseFavoritesContract,
      method: 'DELETE',
      handler: deleteExerciseFavorite,
      user: fakeUser,
      supabase,
      query: { exerciseId: 'ex-1' },
    })

    expect(res.status).toBe(404)
    expect(supabase._tables.exercise_favorites).toEqual([
      { user_id: 'user-2', exercise_id: 'ex-1', created_at: '2026-06-01T11:00:00Z' },
    ])
  })

  it('GET returns 401 anonymously', async () => {
    const res = await runRoute({
      contract: exerciseFavoritesContract,
      method: 'GET',
      handler: getExerciseFavorites,
      user: null,
      supabase: stubSupabase({ exercise_favorites: [], exercises: [] }),
    })
    expect(res.status).toBe(401)
  })
})
