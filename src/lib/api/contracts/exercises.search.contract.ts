import { z } from 'zod'
import { defineContract } from '../define-contract'
import { catalogExerciseSchema } from './exercise.schema'

export const exercisesSearchContract = defineContract({
  path: '/api/exercises/search',
  methods: {
    GET: {
      query: z.object({
        query: z.string().optional(),
        category_id: z.string().optional(),
        equipment: z.string().optional(),
        muscle_group: z.string().optional(),
        level: z.string().optional(),
        limit: z.string().optional(),
        offset: z.string().optional(),
      }),
      response: z.object({
        items: z.array(catalogExerciseSchema),
        total: z.number(),
        page: z.number(),
        totalPages: z.number(),
        hasMore: z.boolean(),
      }),
    },
  },
})
