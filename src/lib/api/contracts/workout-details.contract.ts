import { z } from 'zod'
import { defineContract } from '../define-contract'

// GET /api/workout-details?date=YYYY-MM-DD
// Returns every workout session the authenticated user has on the given
// date, each rolled up with its sets and computed totals.
// Mirrors WorkoutSessionWithSets in src/lib/types/calendar.ts (camelCase
// because the legacy SQLite shape was camelCase).
const workoutDetailSet = z.object({
  id: z.string(),
  sessionId: z.string(),
  exerciseId: z.string(),
  setNumber: z.number(),
  reps: z.number(),
  weight: z.number(),
  restTime: z.number().optional(),
  notes: z.string().optional(),
  exerciseName: z.string().optional(),
  durationSeconds: z.number().optional(),
  distanceKm: z.number().optional(),
  incline: z.number().optional(),
  speedKmh: z.number().optional(),
})

const workoutSessionWithSets = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string(),
  duration: z.number().optional(),
  notes: z.string().optional(),
  locationName: z.string().optional(),
  sets: z.array(workoutDetailSet),
  totalVolume: z.number(),
  exerciseCount: z.number(),
})

export const workoutDetailsContract = defineContract({
  path: '/api/workout-details',
  methods: {
    GET: {
      query: z.object({ date: z.string() }),
      response: z.array(workoutSessionWithSets),
    },
  },
})
