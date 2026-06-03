import { z } from 'zod'
import { defineContract } from '../define-contract'
import { startFromTemplateResponse } from './workout-templates.contract'

// WorkoutSession on the wire. Dates serialize to ISO strings via JSON.stringify.
const workoutSession = z.object({
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

const workoutWithDetails = workoutSession.extend({
  exercises: z.array(
    z.object({
      exercise: z.object({
        id: z.string(),
        name: z.string(),
        primary_muscles: z.array(z.string()),
        secondary_muscles: z.array(z.string()),
        instructions: z.array(z.string()),
        equipment: z.string(),
        category_id: z.string(),
        category_name: z.string(),
        tracking_type: z.enum(['strength', 'cardio', 'timed']),
        force: z.enum(['push', 'pull', 'static']).nullable(),
        level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).nullable(),
        mechanic: z.enum(['compound', 'isolation']).nullable(),
        gif_path: z.string().nullable(),
        preview_image_path: z.string().nullable(),
        created_at: z.string(),
        updated_at: z.string(),
      }),
      sets: z.array(workoutSet),
    }),
  ),
})

const paginatedSessions = z.object({
  data: z.array(workoutSession),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  hasMore: z.boolean(),
})

const sessionInput = z
  .object({
    name: z.string().optional(),
    date: z.string().optional(),
    notes: z.string().optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
  })
  .strict()

const createSessionQuery = z.object({
  action: z.undefined().optional(),
  duplicateId: z.undefined().optional(),
})

const duplicateSessionQuery = z.object({
  action: z.literal('duplicate'),
  duplicateId: z.string().trim().min(1),
})

const startFromTemplateQuery = z.object({
  action: z.literal('startFromTemplate'),
})

const startFromTemplateBody = z
  .object({
    templateId: z.string().trim().min(1),
  })
  .strict()

export const workoutSessionsContract = defineContract({
  path: '/api/workout-sessions',
  methods: {
    GET: {
      query: z.object({
        id: z.string().optional(),
        includeDetails: z.literal('true').optional(),
        limit: z.string().optional(),
        offset: z.string().optional(),
      }),
      // Three shapes depending on inputs:
      //   GET ?id=…                    → WorkoutSession
      //   GET ?id=…&includeDetails=true → WorkoutWithDetails
      //   GET (no id)                  → PaginatedResult<WorkoutSession>
      response: z.union([workoutSession, workoutWithDetails, paginatedSessions]),
    },
    POST: {
      query: z.union([duplicateSessionQuery, startFromTemplateQuery, createSessionQuery]),
      body: z.union([sessionInput, startFromTemplateBody]).optional(),
      response: z.union([workoutSession, startFromTemplateResponse]),
    },
    PATCH: {
      query: z.object({ id: z.string(), action: z.literal('complete').optional() }),
      body: sessionInput.partial().optional(),
      response: workoutSession,
    },
    DELETE: {
      query: z.object({ id: z.string() }),
      response: z.object({}),
    },
  },
})

export { paginatedSessions, workoutSession, workoutWithDetails }
