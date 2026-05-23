import { describe, expect, it } from 'vitest'
import { exerciseCategoriesContract } from '../../src/lib/api/contracts/exercise-categories.contract'
import { getExerciseCategories } from '../../src/routes/api.exercise-categories'
import { runRoute } from './run-route'
import { stubSupabase } from './stub-supabase'

describe('GET /api/exercise-categories', () => {
  it('returns categories each with an exercise_count', async () => {
    const supabase = stubSupabase({
      exercise_categories: [
        { id: 'cat-strength', name: 'Strength', description: 'Heavy lifts' },
        { id: 'cat-cardio', name: 'Cardio', description: null },
      ],
      exercises: [
        { id: 'e1', category_id: 'cat-strength' },
        { id: 'e2', category_id: 'cat-strength' },
        { id: 'e3', category_id: 'cat-cardio' },
      ],
    })
    const res = await runRoute({
      contract: exerciseCategoriesContract,
      method: 'GET',
      handler: getExerciseCategories,
      isPublic: true,
      supabase,
    })
    expect(res.status).toBe(200)
    const parsed = exerciseCategoriesContract.methods.GET.response.parse(res.body.data)
    expect(parsed).toHaveLength(2)
    const strength = parsed.find((c) => c.id === 'cat-strength')
    expect(strength?.exercise_count).toBe(2)
    const cardio = parsed.find((c) => c.id === 'cat-cardio')
    expect(cardio?.exercise_count).toBe(1)
  })
})
