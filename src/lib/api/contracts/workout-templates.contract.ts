import { z } from 'zod'
import { defineContract } from '../define-contract'
import { catalogExerciseSchema } from './exercise.schema'

const workoutSessionForTemplateStart = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string().optional(),
  date: z.string(),
  start_time: z.string(),
  end_time: z.string().optional(),
  notes: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

const workoutTemplateExercise = z.object({
  id: z.string(),
  template_id: z.string(),
  exercise_id: z.string(),
  position: z.number(),
  target_sets: z.number().optional(),
  notes: z.string().optional(),
  created_at: z.string(),
})

const workoutTemplate = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  notes: z.string().optional(),
  source_session_id: z.string().optional(),
  is_archived: z.boolean(),
  last_used_at: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

const workoutTemplateWithExercises = workoutTemplate.extend({
  exercises: z.array(
    z.object({
      templateExercise: workoutTemplateExercise,
      exercise: catalogExerciseSchema,
    }),
  ),
})

const templateInput = z
  .object({
    name: z.string().trim().min(1).optional(),
    notes: z.string().optional(),
    sourceSessionId: z.string().trim().min(1).optional(),
    exercises: z
      .array(
        z.object({
          exerciseId: z.string().trim().min(1),
          targetSets: z.number().int().positive().optional(),
          notes: z.string().optional(),
        }),
      )
      .optional(),
    is_archived: z.boolean().optional(),
  })
  .strict()

export const workoutTemplatesContract = defineContract({
  path: '/api/workout-templates',
  methods: {
    GET: {
      query: z.object({ id: z.string().optional() }),
      response: z.union([z.array(workoutTemplateWithExercises), workoutTemplateWithExercises]),
    },
    POST: {
      body: templateInput,
      response: workoutTemplateWithExercises,
    },
    PUT: {
      query: z.object({ id: z.string() }),
      body: templateInput.partial(),
      response: workoutTemplateWithExercises,
    },
    DELETE: {
      query: z.object({ id: z.string() }),
      response: z.object({}),
    },
  },
})

export const startFromTemplateResponse = z.object({
  session: workoutSessionForTemplateStart,
  template: workoutTemplateWithExercises,
})

export { workoutTemplate, workoutTemplateExercise, workoutTemplateWithExercises }
