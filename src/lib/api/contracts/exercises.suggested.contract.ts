import { z } from 'zod'
import { defineContract } from '../define-contract'
import { catalogExerciseSchema } from './exercise.schema'

export const exercisesSuggestedContract = defineContract({
  path: '/api/exercises/suggested',
  methods: {
    GET: {
      query: z.object({
        exerciseId: z.string().optional(),
        muscle: z.string().optional(),
        limit: z.string().optional(),
      }),
      response: z.object({
        items: z.array(
          z.object({
            exercise: catalogExerciseSchema,
            score: z.number(),
            reasons: z.array(z.string()),
          }),
        ),
      }),
    },
  },
})
