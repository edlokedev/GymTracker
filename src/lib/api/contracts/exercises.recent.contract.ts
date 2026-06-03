import { z } from 'zod'
import { defineContract } from '../define-contract'
import { catalogExerciseSchema } from './exercise.schema'

export const exercisesRecentContract = defineContract({
  path: '/api/exercises/recent',
  methods: {
    GET: {
      query: z.object({ limit: z.string().optional() }),
      response: z.object({
        items: z.array(
          z.object({
            exercise: catalogExerciseSchema,
            lastUsedAt: z.string(),
            useCount: z.number(),
          }),
        ),
      }),
    },
  },
})
