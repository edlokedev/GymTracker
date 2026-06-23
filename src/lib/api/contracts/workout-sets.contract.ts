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
  duration_seconds: z.number().optional(),
  distance_km: z.number().optional(),
  incline: z.number().optional(),
  speed_kmh: z.number().optional(),
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
  duration_seconds: z.number().optional(),
  distance_km: z.number().optional(),
  incline: z.number().optional(),
  speed_kmh: z.number().optional(),
})

const workoutSetHistoryItem = z.object({
  id: z.string(),
  set_number: z.number(),
  reps: z.number(),
  weight: z.number(),
  duration_seconds: z.number().optional(),
  distance_km: z.number().optional(),
  incline: z.number().optional(),
  speed_kmh: z.number().optional(),
  session_date: z.string(),
  session_name: z.string().nullable(),
})

export const workoutSetsContract = defineContract({
  path: '/api/workout-sets',
  methods: {
    GET: {
      query: z.object({
        id: z.string().optional(),
        workoutId: z.string().optional(),
        action: z.literal('history').optional(),
        exerciseId: z.string().optional(),
        limit: z.string().optional(),
      }),
      // GET ?id=… returns one set; GET ?workoutId=… returns a list.
      // GET ?action=history&exerciseId=... returns ExerciseHistory rows.
      response: z.union([workoutSet, z.array(workoutSet), z.array(workoutSetHistoryItem)]),
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
    // Repoint a whole exercise group's sets in one workout to a different
    // exercise ("Change exercise"). Returns the changed set ids + count.
    PATCH: {
      query: z.object({
        workoutId: z.string(),
        fromExerciseId: z.string(),
        toExerciseId: z.string(),
      }),
      response: z.object({ repointed: z.number(), setIds: z.array(z.string()) }),
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

export { workoutSet, workoutSetHistoryItem }
