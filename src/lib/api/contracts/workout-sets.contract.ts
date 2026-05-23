import { z } from 'zod'
import { defineContract } from '../define-contract'

// WorkoutSet shape as it travels over the wire. `created_at` / `updated_at`
// are Date objects in memory, but `JSON.stringify` serializes them to ISO
// strings, so contracts (which describe the wire shape) accept strings.
const workoutSet = z.object({
  id: z.string(),
  workout_id: z.string(),
  exercise_id: z.string(),
  set_number: z.number(),
  weight: z.number().optional(),
  reps: z.number().optional(),
  rest_time: z.number().optional(),
  notes: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

const workoutSetInput = z.object({
  workout_id: z.string(),
  exercise_id: z.string(),
  set_order: z.number(),
  reps: z.number().optional(),
  weight: z.number().optional(),
  rest_time: z.number().optional(),
  notes: z.string().optional(),
})

export const workoutSetsContract = defineContract({
  path: '/api/workout-sets',
  methods: {
    GET: {
      query: z.object({ id: z.string().optional(), workoutId: z.string().optional() }),
      // GET ?id=… returns one set; GET ?workoutId=… returns a list.
      response: z.union([workoutSet, z.array(workoutSet)]),
    },
    POST: {
      body: workoutSetInput,
      response: workoutSet,
    },
    PUT: {
      query: z.object({ id: z.string() }),
      body: workoutSetInput.partial(),
      response: workoutSet,
    },
    DELETE: {
      query: z.object({
        id: z.string().optional(),
        workoutId: z.string().optional(),
        exerciseId: z.string().optional(),
      }),
      // Single delete returns {}; bulk delete returns { deleted: number }.
      // Order the union so `{ deleted: n }` matches first — zod strips unknown
      // keys, so a stricter shape must precede the empty object.
      response: z.union([z.object({ deleted: z.number() }), z.object({})]),
    },
  },
})

export { workoutSet }
