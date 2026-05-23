import { describe, expect, it } from 'vitest'
import { exercisesSearchContract } from '../../src/lib/api/contracts/exercises.search.contract'
import { searchExercises } from '../../src/routes/api.exercises.search'
import { runRoute } from './run-route'
import { stubSupabase } from './stub-supabase'

describe('GET /api/exercises/search', () => {
  it('returns paginated catalog items (happy path)', async () => {
    const supabase = stubSupabase({
      exercises: [
        {
          id: 'ex-1',
          name: 'Bench Press',
          category_id: 'cat-1',
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
        },
      ],
    })
    const res = await runRoute({
      contract: exercisesSearchContract,
      method: 'GET',
      handler: searchExercises,
      isPublic: true,
      supabase,
      query: { limit: '10', offset: '0' },
    })
    expect(res.status).toBe(200)
    const parsed = exercisesSearchContract.methods.GET.response.parse(res.body.data)
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0].name).toBe('Bench Press')
    expect(parsed.total).toBe(1)
    expect(parsed.page).toBe(1)
    expect(parsed.hasMore).toBe(false)
  })

  it('returns an empty page when no matches', async () => {
    const supabase = stubSupabase({ exercises: [] })
    const res = await runRoute({
      contract: exercisesSearchContract,
      method: 'GET',
      handler: searchExercises,
      isPublic: true,
      supabase,
    })
    expect(res.status).toBe(200)
    const parsed = exercisesSearchContract.methods.GET.response.parse(res.body.data)
    expect(parsed.items).toEqual([])
    expect(parsed.total).toBe(0)
  })
})
