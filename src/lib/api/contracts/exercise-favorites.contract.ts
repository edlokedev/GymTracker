import { z } from 'zod'
import { defineContract } from '../define-contract'
import { catalogExerciseSchema } from './exercise.schema'

export const exerciseFavoritesContract = defineContract({
  path: '/api/exercise-favorites',
  methods: {
    GET: {
      response: z.object({
        items: z.array(catalogExerciseSchema),
        exerciseIds: z.array(z.string()),
      }),
    },
    POST: {
      body: z.object({ exerciseId: z.string().trim().min(1) }).strict(),
      response: z.object({
        exerciseId: z.string(),
        isFavorite: z.literal(true),
      }),
    },
    DELETE: {
      query: z.object({ exerciseId: z.string().trim().min(1) }),
      response: z.object({
        exerciseId: z.string(),
        isFavorite: z.literal(false),
      }),
    },
  },
})
