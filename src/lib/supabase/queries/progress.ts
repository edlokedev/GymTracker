import dayjs from 'dayjs'
import { assertPostgresOk, BadRequestError } from '../../api/errors'
import type {
  ExerciseProgress,
  ProgressDataPoint,
  ProgressMetric,
  ProgressRequest,
  TrendDirection,
} from '../../types/progress'
import { type AppSupabaseClient, queryClient } from '../query-client'

// Request-scoped Supabase client (anon key + user JWT). RLS restricts both
// `workout_sessions` and `workout_sets` to rows owned by the authenticated
// user, so the embedded join cannot leak other users' data. We still pass
// `user_id` explicitly as defense in depth and to keep the planner on the
// (user_id, date) index.

type SetJoinRow = {
  id: string
  workout_id: string
  exercise_id: string
  set_number: number
  weight: number | null
  reps: number | null
  duration_seconds: number | null
  distance_km: number | null
  speed_kmh: number | null
  incline: number | null
  created_at: string
  exercises: { name: string | null } | null
  workout_sessions: { date: string; user_id: string } | null
}

export type ProgressQueryInput = ProgressRequest & {
  userId: string
  // Hard cap on total rows fetched across pages (tests override).
  maxRows?: number
}

const PROGRESS_MAX_PAGE_SIZE = 1000
const PROGRESS_MAX_ROWS = 20000

export async function getProgressData(
  supabase: AppSupabaseClient,
  input: ProgressQueryInput,
): Promise<ExerciseProgress[]> {
  const {
    userId,
    exerciseIds,
    startDate,
    endDate,
    metric = 'volume',
    limit = PROGRESS_MAX_PAGE_SIZE,
    maxRows = PROGRESS_MAX_ROWS,
  } = input

  // Page size is capped by PostgREST's max-rows (1000 by default).
  const pageSize = Math.min(Math.max(Math.floor(limit) || 1, 1), PROGRESS_MAX_PAGE_SIZE)

  const rows: SetJoinRow[] = []
  for (let from = 0; ; from += pageSize) {
    // One round-trip per page: join sets -> exercises (for name) and
    // sets -> sessions (for date + user_id filter). PostgREST embeds resolve
    // via FK references.
    let query = queryClient(supabase)
      .from<SetJoinRow>('workout_sets')
      .select(
        `
          id,
          workout_id,
          exercise_id,
          set_number,
          weight,
          reps,
          duration_seconds,
          distance_km,
          speed_kmh,
          incline,
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

    // Order PARENT rows (to-one embed, PostgREST >= 11).
    // `{ foreignTable }` would only sort the embedded rows, leaving the real order as
    // exercise_id, set_number - so a limit would silently drop late exercises.
    // `id` is a unique tie-breaker so range paging is stable.
    query = query
      .order('workout_sessions(date)', { ascending: true })
      .order('exercise_id', { ascending: true })
      .order('set_number', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)

    const { data, error } = await query
    assertPostgresOk(error)

    const page = (data ?? []) as SetJoinRow[]
    rows.push(...page)
    if (page.length < pageSize) break
    if (rows.length >= maxRows) {
      throw new BadRequestError('Too much data for this date range. Narrow the range or exercises.')
    }
  }

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
      durationSeconds: row.duration_seconds ?? null,
      distanceKm: row.distance_km ?? null,
      speedKmh: row.speed_kmh ?? null,
      incline: row.incline ?? null,
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
    const statistics = calculateStatistics(markedDataPoints, metric)

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
  let maxDuration: ProgressDataPoint | null = null
  let maxDistance: ProgressDataPoint | null = null
  let maxSpeed: ProgressDataPoint | null = null

  const sortedPoints = [...dataPoints].sort(
    (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf(),
  )

  const markedDataPoints = sortedPoints.map((point) => {
    const updatedPoint = { ...point }

    if (point.weight && (!maxWeight || point.weight > (maxWeight.weight || 0))) {
      maxWeight = point
      updatedPoint.isPersonalRecord = true
    }

    if (
      point.reps &&
      (!maxReps ||
        point.reps > (maxReps.reps || 0) ||
        (point.reps === maxReps.reps && (point.weight ?? 0) > (maxReps.weight ?? 0)))
    ) {
      maxReps = point
      updatedPoint.isPersonalRecord = true
    }

    if (point.volume > 0 && (!maxVolume || point.volume > maxVolume.volume)) {
      maxVolume = point
      updatedPoint.isPersonalRecord = true
    }

    if (
      point.durationSeconds &&
      (!maxDuration || point.durationSeconds > (maxDuration.durationSeconds || 0))
    ) {
      maxDuration = point
      updatedPoint.isPersonalRecord = true
    }

    if (point.distanceKm && (!maxDistance || point.distanceKm > (maxDistance.distanceKm || 0))) {
      maxDistance = point
      updatedPoint.isPersonalRecord = true
    }

    if (point.speedKmh && (!maxSpeed || point.speedKmh > (maxSpeed.speedKmh || 0))) {
      maxSpeed = point
      updatedPoint.isPersonalRecord = true
    }

    return updatedPoint
  })

  return {
    markedDataPoints,
    personalRecords: { maxWeight, maxReps, maxVolume, maxDuration, maxDistance, maxSpeed },
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

  const weights = dataPoints.map((p) => p.weight).filter(isNumber)
  const reps = dataPoints.map((p) => p.reps).filter(isNumber)
  const volumes = dataPoints.filter((p) => p.volume > 0).map((p) => p.volume)
  const durations = dataPoints.map((p) => p.durationSeconds).filter(isPositiveNumber)
  const distances = dataPoints.map((p) => p.distanceKm).filter(isPositiveNumber)
  const speeds = dataPoints.map((p) => p.speedKmh).filter(isPositiveNumber)

  return {
    weight: calculateTrendForMetric(weights),
    reps: calculateTrendForMetric(reps),
    volume: calculateTrendForMetric(volumes),
    duration: calculateTrendForMetric(durations),
    distance: calculateTrendForMetric(distances),
    speed: calculateTrendForMetric(speeds),
  }
}

function calculateStatistics(dataPoints: ProgressDataPoint[], metric: ProgressMetric) {
  const workoutDates = new Set(dataPoints.map((p) => p.date))
  const weights = dataPoints.map((p) => p.weight).filter(isNumber)
  const reps = dataPoints.map((p) => p.reps).filter(isNumber)
  const volumes = dataPoints.filter((p) => p.volume > 0).map((p) => p.volume)
  const durations = dataPoints.map((p) => p.durationSeconds).filter(isPositiveNumber)
  const distances = dataPoints.map((p) => p.distanceKm).filter(isPositiveNumber)
  const speeds = dataPoints.map((p) => p.speedKmh).filter(isPositiveNumber)
  const metricValues = getMetricValues(dataPoints, metric)

  let improvementPercentage = 0
  if (metricValues.length >= 2) {
    const firstValue = metricValues[0]
    const lastValue = metricValues[metricValues.length - 1]
    improvementPercentage = ((lastValue - firstValue) / firstValue) * 100
  }

  return {
    totalWorkouts: workoutDates.size,
    averageWeight: weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : null,
    averageReps: reps.length > 0 ? reps.reduce((a, b) => a + b, 0) / reps.length : null,
    totalVolume: volumes.reduce((a, b) => a + b, 0),
    totalDurationSeconds: durations.reduce((a, b) => a + b, 0),
    totalDistanceKm: distances.reduce((a, b) => a + b, 0),
    averageSpeedKmh: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null,
    improvementPercentage: Math.round(improvementPercentage * 100) / 100,
  }
}

function isNumber(value: number | null): value is number {
  return value !== null
}

function isPositiveNumber(value: number | null): value is number {
  return value !== null && value > 0
}

function getMetricValues(dataPoints: ProgressDataPoint[], metric: ProgressMetric): number[] {
  return dataPoints
    .map((point) => {
      switch (metric) {
        case 'weight':
          return point.weight
        case 'reps':
          return point.reps
        case 'volume':
          return point.volume
        case 'duration':
          return point.durationSeconds
        case 'distance':
          return point.distanceKm
        case 'speed':
          return point.speedKmh
        default:
          return null
      }
    })
    .filter(isPositiveNumber)
}
