import { z } from 'zod'
import { defineContract } from '../define-contract'

const catalogExercise = z.object({
  id: z.string(),
  name: z.string(),
  category_id: z.string(),
  force: z.string().nullable(),
  level: z.string().nullable(),
  mechanic: z.string().nullable(),
  equipment: z.string().nullable(),
  primary_muscles: z.array(z.string()),
  secondary_muscles: z.array(z.string()),
  instructions: z.array(z.string()),
  gif_path: z.string().nullable(),
  preview_image_path: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  category_name: z.string(),
})

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
        items: z.array(catalogExercise),
        total: z.number(),
        page: z.number(),
        totalPages: z.number(),
        hasMore: z.boolean(),
      }),
    },
  },
})
