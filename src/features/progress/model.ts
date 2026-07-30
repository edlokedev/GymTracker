import dayjs from 'dayjs'
import type {
  ChartDataPoint,
  DatePreset,
  ExerciseProgress,
  ProgressFilters,
  ProgressState,
} from '@/lib/types/progress'
import { DATE_PRESETS } from '@/lib/types/progress'

export type ProgressMetric = ProgressFilters['metric']
export type ProgressDatePresetValue = (typeof DATE_PRESETS)[number]['value']

export const DEFAULT_PROGRESS_DATE_PRESET: ProgressDatePresetValue = '90d'
export const PROGRESS_METRIC_OPTIONS: Array<{ value: ProgressMetric; label: string }> = [
  { value: 'weight', label: 'Weight' },
  { value: 'reps', label: 'Reps' },
  { value: 'duration', label: 'Duration' },
  { value: 'distance', label: 'Distance' },
  { value: 'speed', label: 'Speed' },
]

export function getProgressDateRange(
  presetValue: ProgressDatePresetValue = DEFAULT_PROGRESS_DATE_PRESET,
  now = dayjs(),
): ProgressFilters['dateRange'] {
  const preset = DATE_PRESETS.find((item) => item.value === presetValue) || DATE_PRESETS[2]

  return {
    start: now.subtract(preset.days, 'day').format('YYYY-MM-DD'),
    end: now.format('YYYY-MM-DD'),
  }
}

export function createProgressFilters(now = dayjs()): ProgressFilters {
  return {
    exerciseIds: [],
    dateRange: getProgressDateRange(DEFAULT_PROGRESS_DATE_PRESET, now),
    metric: 'weight',
  }
}

export function createProgressState(now = dayjs()): ProgressState {
  return {
    filters: createProgressFilters(now),
    data: [],
    selectedExerciseId: null,
    isLoading: false,
    error: null,
  }
}

export function findMostRecentExerciseId(data: ExerciseProgress[]): string | null {
  let selectedExerciseId: string | null = null
  let latestDate = ''

  for (const exercise of data) {
    for (const point of exercise.dataPoints) {
      if (point.date >= latestDate) {
        latestDate = point.date
        selectedExerciseId = exercise.exerciseId
      }
    }
  }

  return selectedExerciseId
}

export function applyProgressDatePreset(
  filters: ProgressFilters,
  presetValue: ProgressDatePresetValue,
  now = dayjs(),
): ProgressFilters {
  return {
    ...filters,
    dateRange: getProgressDateRange(presetValue, now),
  }
}

export function findDatePresetForRange(
  dateRange: ProgressFilters['dateRange'],
  now = dayjs(),
): DatePreset | null {
  return (
    DATE_PRESETS.find((preset) => {
      const presetRange = getProgressDateRange(preset.value, now)
      return presetRange.start === dateRange.start && presetRange.end === dateRange.end
    }) || null
  )
}

function metricValue(point: {
  volume: number
  weight: number | null
  reps: number | null
  durationSeconds: number | null
  distanceKm: number | null
  speedKmh: number | null
}): Record<ProgressMetric, number | null> {
  return {
    weight: point.weight,
    reps: point.reps,
    volume: point.volume > 0 ? point.volume : null,
    duration: point.durationSeconds,
    distance: point.distanceKm,
    speed: point.speedKmh,
  }
}

export function getAvailableProgressMetrics(exercise: ExerciseProgress): ProgressMetric[] {
  return PROGRESS_METRIC_OPTIONS.map((option) => option.value).filter((metric) =>
    exercise.dataPoints.some((point) => {
      const value = metricValue(point)[metric]
      return value !== null && Number.isFinite(value) && value > 0
    }),
  )
}

export function buildProgressChartPoints(
  data: ExerciseProgress[],
  metric: ProgressMetric,
  options: { exerciseId?: string | null } = {},
): ChartDataPoint[] {
  const exercise = data.find((item) => item.exerciseId === options.exerciseId) ?? data.at(0) ?? null
  if (!exercise) return []

  const bestByWorkout = new Map<string, ChartDataPoint>()
  for (const point of exercise.dataPoints) {
    const value = metricValue(point)[metric]
    if (value === null || !Number.isFinite(value)) continue

    const chartPoint = {
      date: point.date,
      value,
      exerciseName: exercise.exerciseName,
      isPersonalRecord: point.isPersonalRecord,
      volume: point.volume,
      weight: point.weight,
      reps: point.reps,
      durationSeconds: point.durationSeconds,
      distanceKm: point.distanceKm,
      speedKmh: point.speedKmh,
    }
    const currentBest = bestByWorkout.get(point.sessionId)
    if (!currentBest || chartPoint.value > currentBest.value) {
      bestByWorkout.set(point.sessionId, chartPoint)
    }
  }

  return [...bestByWorkout.values()].sort((left, right) => left.date.localeCompare(right.date))
}
