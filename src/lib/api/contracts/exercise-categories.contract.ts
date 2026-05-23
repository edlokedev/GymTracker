import { z } from 'zod'
import { defineContract } from '../define-contract'

// GET /api/exercise-categories → catalog categories with exercise counts.
export const exerciseCategoriesContract = defineContract({
  path: '/api/exercise-categories',
  methods: {
    GET: {
      response: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().nullable(),
          exercise_count: z.number(),
        }),
      ),
    },
  },
})
