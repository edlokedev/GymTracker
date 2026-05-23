import { z } from 'zod'
import { defineContract } from '../define-contract'

// GET /api/progress — returns ExerciseProgress[] plus totals + resolved range.
const dataPoint = z.object({
  id: z.string(),
  date: z.string(),
  exerciseId: z.string(),
  exerciseName: z.string(),
  weight: z.number().nullable(),
  reps: z.number().nullable(),
  volume: z.number(),
  isPersonalRecord: z.boolean(),
  sessionId: z.string(),
  setNumber: z.number(),
})

const trend = z.enum(['up', 'down', 'stable'])

const exerciseProgress = z.object({
  exerciseId: z.string(),
  exerciseName: z.string(),
  dataPoints: z.array(dataPoint),
  personalRecords: z.object({
    maxWeight: dataPoint.nullable(),
    maxReps: dataPoint.nullable(),
    maxVolume: dataPoint.nullable(),
  }),
  trends: z.object({ weight: trend, reps: trend, volume: trend }),
  statistics: z.object({
    totalWorkouts: z.number(),
    averageWeight: z.number().nullable(),
    averageReps: z.number().nullable(),
    totalVolume: z.number(),
    improvementPercentage: z.number(),
  }),
})

export const progressContract = defineContract({
  path: '/api/progress',
  methods: {
    GET: {
      query: z.object({
        exercises: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        metric: z.enum(['weight', 'reps', 'volume']).optional(),
        limit: z.string().optional(),
      }),
      response: z.object({
        progress: z.array(exerciseProgress),
        totalExercises: z.number(),
        dateRange: z.object({ start: z.string(), end: z.string() }),
      }),
    },
  },
})
