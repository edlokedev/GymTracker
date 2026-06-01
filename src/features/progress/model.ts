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
  { value: 'volume', label: 'Volume' },
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
    metric: 'volume',
  }
}

export function createProgressState(now = dayjs()): ProgressState {
  return {
    filters: createProgressFilters(now),
    data: [],
    isLoading: false,
    error: null,
    selectedChart: 'line',
    showTrendLines: true,
    highlightPRs: true,
  }
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
}): Record<ProgressMetric, number> {
  return {
    weight: point.weight || 0,
    reps: point.reps || 0,
    volume: point.volume,
    duration: point.durationSeconds || 0,
    distance: point.distanceKm || 0,
    speed: point.speedKmh || 0,
  }
}

export function buildProgressChartPoints(
  data: ExerciseProgress[],
  metric: ProgressMetric,
  options: { highlightPRs?: boolean } = {},
): ChartDataPoint[] {
  return data
    .flatMap((exercise) =>
      exercise.dataPoints
        .filter((point) => options.highlightPRs !== false || !point.isPersonalRecord)
        .map((point) => ({
          date: point.date,
          value: metricValue(point)[metric],
          exerciseName: exercise.exerciseName,
          isPersonalRecord: point.isPersonalRecord,
          volume: point.volume,
          weight: point.weight,
          reps: point.reps,
          durationSeconds: point.durationSeconds,
          distanceKm: point.distanceKm,
          speedKmh: point.speedKmh,
        })),
    )
    .sort((left, right) => left.date.localeCompare(right.date))
}

export function summarizeProgress(data: ExerciseProgress[]) {
  return {
    exercisesTracked: data.length,
    totalWorkouts: data.reduce((sum, exercise) => sum + exercise.statistics.totalWorkouts, 0),
    personalRecords: data.reduce((sum, exercise) => {
      let count = 0
      if (exercise.personalRecords.maxWeight) count += 1
      if (exercise.personalRecords.maxReps) count += 1
      if (exercise.personalRecords.maxVolume) count += 1
      if (exercise.personalRecords.maxDuration) count += 1
      if (exercise.personalRecords.maxDistance) count += 1
      if (exercise.personalRecords.maxSpeed) count += 1
      return sum + count
    }, 0),
  }
}
