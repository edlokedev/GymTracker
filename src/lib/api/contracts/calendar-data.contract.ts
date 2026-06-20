import { z } from 'zod'
import { defineContract } from '../define-contract'
import { calendarDate } from './calendar-date.schema'

// GET /api/calendar-data — calendar rollup + summary stats + resolved range.
const intensity = z.enum(['light', 'moderate', 'intense'])

const workoutDay = z.object({
  date: z.string(),
  hasWorkout: z.boolean(),
  workoutCount: z.number(),
  totalSets: z.number(),
  totalVolume: z.number(),
  exerciseCount: z.number(),
  sessionIds: z.array(z.string()),
  intensity,
  duration: z.number().optional(),
})

const summary = z.object({
  totalWorkouts: z.number(),
  totalVolume: z.number(),
  averageWorkoutsPerWeek: z.number(),
  longestStreak: z.number(),
  currentStreak: z.number(),
  lastWorkoutDate: z.string().nullable(),
  workoutsThisMonth: z.number(),
})

export const calendarDataContract = defineContract({
  path: '/api/calendar-data',
  methods: {
    GET: {
      query: z.object({
        start: calendarDate.optional(),
        end: calendarDate.optional(),
        today: calendarDate.optional(),
      }),
      response: z.object({
        workouts: z.array(workoutDay),
        summary,
        dateRange: z.object({ start: z.string(), end: z.string() }),
      }),
    },
  },
})
