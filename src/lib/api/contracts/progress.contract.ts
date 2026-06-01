import { z } from 'zod'
import { defineContract } from '../define-contract'

const progressMetric = z.enum(['weight', 'reps', 'volume', 'duration', 'distance', 'speed'])

// GET /api/progress — returns ExerciseProgress[] plus totals + resolved range.
const dataPoint = z.object({
  id: z.string(),
  date: z.string(),
  exerciseId: z.string(),
  exerciseName: z.string(),
  weight: z.number().nullable(),
  reps: z.number().nullable(),
  volume: z.number(),
  durationSeconds: z.number().nullable(),
  distanceKm: z.number().nullable(),
  speedKmh: z.number().nullable(),
  incline: z.number().nullable(),
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
    maxDuration: dataPoint.nullable(),
    maxDistance: dataPoint.nullable(),
    maxSpeed: dataPoint.nullable(),
  }),
  trends: z.record(progressMetric, trend),
  statistics: z.object({
    totalWorkouts: z.number(),
    averageWeight: z.number().nullable(),
    averageReps: z.number().nullable(),
    totalVolume: z.number(),
    totalDurationSeconds: z.number(),
    totalDistanceKm: z.number(),
    averageSpeedKmh: z.number().nullable(),
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
        metric: progressMetric.optional(),
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
