import { z } from 'zod'
import { defineContract } from '../define-contract'
import { catalogExerciseSchema } from './exercise.schema'

// Body for create/edit. Optional detail fields default to empty; image URLs are
// re-validated server-side against the caller's storage folder.
export const customExerciseBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    category_id: z.string().trim().min(1),
    tracking_type: z.enum(['strength', 'cardio', 'timed']),
    equipment: z.string().trim().min(1).nullable().optional(),
    primary_muscles: z.array(z.string()).optional(),
    secondary_muscles: z.array(z.string()).optional(),
    instructions: z.array(z.string()).optional(),
    gif_path: z.string().url().nullable().optional(),
    preview_image_path: z.string().url().nullable().optional(),
  })
  .strict()

const idQuery = z.object({ id: z.string().trim().min(1) })

export const customExercisesContract = defineContract({
  path: '/api/exercises/custom',
  methods: {
    GET: {
      response: z.object({
        items: z.array(catalogExerciseSchema),
        exerciseIds: z.array(z.string()),
      }),
    },
    POST: {
      body: customExerciseBodySchema,
      response: catalogExerciseSchema,
    },
    PATCH: {
      query: idQuery,
      body: customExerciseBodySchema,
      response: catalogExerciseSchema,
    },
    DELETE: {
      query: idQuery,
      response: z.object({
        exerciseId: z.string(),
        archived: z.literal(true),
      }),
    },
  },
})
