import type { SupabaseClient } from '@supabase/supabase-js'
import dayjs from 'dayjs'
import { assertPostgresOk } from '../../api/errors'
import type {
  ExerciseProgress,
  ProgressDataPoint,
  ProgressRequest,
  TrendDirection,
} from '../../types/progress'
import type { Database } from '../database.types'

// Request-scoped Supabase client (anon key + user JWT). RLS restricts both
// `workout_sessions` and `workout_sets` to rows owned by the authenticated
// user, so the embedded join cannot leak other users' data. We still pass
// `user_id` explicitly as defense in depth and to keep the planner on the
// (user_id, date) index.

type AnyClient = SupabaseClient<Database> | SupabaseClient<any, 'public', any>

type SetJoinRow = {
  id: string
  workout_id: string
  exercise_id: string
  set_number: number
  weight: number | null
  reps: number | null
  created_at: string
  exercises: { name: string | null } | null
  workout_sessions: { date: string; user_id: string } | null
}

export type ProgressQueryInput = Omit<ProgressRequest, 'userId'> & {
  userId: string
}

export async function getProgressData(
  supabase: AnyClient,
  input: ProgressQueryInput,
): Promise<ExerciseProgress[]> {
  const { userId, exerciseIds, startDate, endDate, limit = 1000 } = input

  // One round-trip: join sets -> exercises (for name) and sets -> sessions
  // (for date + user_id filter). PostgREST embeds resolve via FK references.
  let query = (supabase as any)
    .from('workout_sets')
    .select(
      `
        id,
        workout_id,
        exercise_id,
        set_number,
        weight,
        reps,
        created_at,
        exercises!inner ( name ),
        workout_sessions!inner ( date, user_id )
      `,
    )
    .eq('workout_sessions.user_id', userId)
    .gte('workout_sessions.date', startDate)
    .lte('workout_sessions.date', endDate)

  if (exerciseIds && exerciseIds.length > 0) {
    query = query.in('exercise_id', exerciseIds)
  }

  // Mirror SQLite ordering: by session date asc, then exercise, then set #.
  // PostgREST supports ordering on embedded resources via foreignTable.
  query = query
    .order('date', {
      ascending: true,
      foreignTable: 'workout_sessions',
    })
    .order('exercise_id', { ascending: true })
    .order('set_number', { ascending: true })
    .limit(limit)

  const { data, error } = await query
  assertPostgresOk(error)

  const rows: SetJoinRow[] = (data ?? []) as SetJoinRow[]

  // Group by exercise.
  const exerciseData = new Map<string, ProgressDataPoint[]>()
  for (const row of rows) {
    const weight = row.weight
    const reps = row.reps
    const dataPoint: ProgressDataPoint = {
      id: row.id,
      date: row.workout_sessions?.date ?? '',
      exerciseId: row.exercise_id,
      exerciseName: row.exercises?.name ?? 'Unknown Exercise',
      weight: weight,
      reps: reps,
      volume: (weight || 0) * (reps || 0),
      isPersonalRecord: false,
      sessionId: row.workout_id,
      setNumber: row.set_number,
    }

    const bucket = exerciseData.get(row.exercise_id)
    if (bucket) bucket.push(dataPoint)
    else exerciseData.set(row.exercise_id, [dataPoint])
  }

  const results: ExerciseProgress[] = []
  exerciseData.forEach((dataPoints, exerciseId) => {
    const exerciseName = dataPoints[0]?.exerciseName || 'Unknown Exercise'
    const { markedDataPoints, personalRecords } = calculatePersonalRecords(dataPoints)
    const trends = calculateTrends(markedDataPoints)
    const statistics = calculateStatistics(markedDataPoints)

    results.push({
      exerciseId,
      exerciseName,
      dataPoints: markedDataPoints,
      personalRecords,
      trends,
      statistics,
    })
  })

  return results
}

// -- Helpers (ported verbatim from src/lib/database/queries/progress.ts) ----

function calculatePersonalRecords(dataPoints: ProgressDataPoint[]) {
  let maxWeight: ProgressDataPoint | null = null
  let maxReps: ProgressDataPoint | null = null
  let maxVolume: ProgressDataPoint | null = null

  const sortedPoints = [...dataPoints].sort((a, b) => (dayjs(a.date).isBefore(b.date) ? -1 : 1))

  const markedDataPoints = sortedPoints.map((point) => {
    const updatedPoint = { ...point }

    if (point.weight && (!maxWeight || point.weight > (maxWeight.weight || 0))) {
      maxWeight = point
      updatedPoint.isPersonalRecord = true
    }

    if (
      point.reps &&
      point.weight &&
      (!maxReps ||
        point.reps > (maxReps.reps || 0) ||
        (point.reps === maxReps.reps && point.weight > (maxReps.weight || 0)))
    ) {
      maxReps = point
      updatedPoint.isPersonalRecord = true
    }

    if (point.volume > 0 && (!maxVolume || point.volume > maxVolume.volume)) {
      maxVolume = point
      updatedPoint.isPersonalRecord = true
    }

    return updatedPoint
  })

  return {
    markedDataPoints,
    personalRecords: { maxWeight, maxReps, maxVolume },
  }
}

function calculateTrends(dataPoints: ProgressDataPoint[]) {
  const calculateTrendForMetric = (values: number[], threshold = 0.05): TrendDirection => {
    if (values.length < 2) return 'stable'
    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    const percentChange = (secondAvg - firstAvg) / firstAvg
    if (percentChange > threshold) return 'up'
    if (percentChange < -threshold) return 'down'
    return 'stable'
  }

  const weights = dataPoints.filter((p) => p.weight).map((p) => p.weight!)
  const reps = dataPoints.filter((p) => p.reps).map((p) => p.reps!)
  const volumes = dataPoints.filter((p) => p.volume > 0).map((p) => p.volume)

  return {
    weight: calculateTrendForMetric(weights),
    reps: calculateTrendForMetric(reps),
    volume: calculateTrendForMetric(volumes),
  }
}

function calculateStatistics(dataPoints: ProgressDataPoint[]) {
  const workoutDates = new Set(dataPoints.map((p) => p.date))
  const weights = dataPoints.filter((p) => p.weight).map((p) => p.weight!)
  const reps = dataPoints.filter((p) => p.reps).map((p) => p.reps!)
  const volumes = dataPoints.filter((p) => p.volume > 0).map((p) => p.volume)

  let improvementPercentage = 0
  if (volumes.length >= 2) {
    const firstVolume = volumes[0]
    const lastVolume = volumes[volumes.length - 1]
    improvementPercentage = ((lastVolume - firstVolume) / firstVolume) * 100
  }

  return {
    totalWorkouts: workoutDates.size,
    averageWeight: weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : null,
    averageReps: reps.length > 0 ? reps.reduce((a, b) => a + b, 0) / reps.length : null,
    totalVolume: volumes.reduce((a, b) => a + b, 0),
    improvementPercentage: Math.round(improvementPercentage * 100) / 100,
  }
}
