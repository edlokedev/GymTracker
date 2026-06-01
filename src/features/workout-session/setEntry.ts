import type { WorkoutSetInput } from '@/lib/types/database'
import type { ExerciseTrackingType } from '@/lib/utils/exercise-tracking'

export interface SetEntryFormValues {
  // strength / bodyweight
  reps: string
  weight: string
  // cardio
  durationMin: string
  distanceKm: string
  incline: string
  speedKmh: string
  // timed
  durationSec: string
  // shared
  restTime: string
  notes: string
}

export type SetEntryValidationError =
  | 'missing-workout-context'
  | 'invalid-reps'
  | 'invalid-weight'
  | 'invalid-rest-time'
  | 'invalid-duration'
  | 'invalid-distance'
  | 'invalid-incline'
  | 'invalid-speed'

export type SetEntryValidationResult =
  | { ok: true; data: WorkoutSetInput }
  | { ok: false; error: SetEntryValidationError; message: string }

const SET_ENTRY_ERROR_MESSAGES: Record<SetEntryValidationError, string> = {
  'missing-workout-context': 'Cannot save set until workout and exercise are ready.',
  'invalid-reps': 'Please enter a valid number of reps.',
  'invalid-weight': 'Please enter a valid weight.',
  'invalid-rest-time': 'Please enter a valid rest time.',
  'invalid-duration': 'Please enter a valid duration.',
  'invalid-distance': 'Please enter a valid distance.',
  'invalid-incline': 'Please enter a valid incline level.',
  'invalid-speed': 'Please enter a valid speed.',
}

function invalid(error: SetEntryValidationError): SetEntryValidationResult {
  return { ok: false, error, message: SET_ENTRY_ERROR_MESSAGES[error] }
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function parsePositiveNumber(value: string): number | null {
  const n = parseNumber(value)
  return n !== null && n > 0 ? n : null
}

function parseNonNegativeNumber(value: string): number | null {
  const n = parseNumber(value)
  return n !== null && n >= 0 ? n : null
}

function parseNonNegativeInt(value: string): number | null {
  const n = parseNumber(value)
  return n !== null && Number.isInteger(n) && n >= 0 ? n : null
}

function parsePositiveInt(value: string): number | null {
  const n = parseNumber(value)
  return n !== null && Number.isInteger(n) && n > 0 ? n : null
}

export function buildWorkoutSetInput({
  exerciseId,
  workoutId,
  setNumber,
  trackingType,
  values,
}: {
  exerciseId?: string
  workoutId?: string
  setNumber: number
  trackingType: ExerciseTrackingType
  values: SetEntryFormValues
}): SetEntryValidationResult {
  if (!exerciseId || !workoutId) {
    return invalid('missing-workout-context')
  }

  const base = {
    workout_id: workoutId,
    exercise_id: exerciseId,
    set_order: setNumber,
    notes: values.notes.trim() || undefined,
  }

  let restTimeNum: number | undefined
  if (values.restTime) {
    const parsed = parseNonNegativeInt(values.restTime)
    if (parsed === null) return invalid('invalid-rest-time')
    restTimeNum = parsed
  }

  if (trackingType === 'strength') {
    const repsNum = parsePositiveInt(values.reps)
    if (repsNum === null) return invalid('invalid-reps')

    const weightNum = values.weight ? parseNonNegativeNumber(values.weight) : null
    if (values.weight && weightNum === null) return invalid('invalid-weight')

    return {
      ok: true,
      data: {
        ...base,
        reps: repsNum,
        weight: weightNum !== null && weightNum > 0 ? weightNum : undefined,
        rest_time: restTimeNum,
      },
    }
  }

  if (trackingType === 'cardio') {
    const durationMin = parsePositiveNumber(values.durationMin)
    if (durationMin === null) {
      return invalid('invalid-duration')
    }

    const distanceKm = values.distanceKm ? parseNonNegativeNumber(values.distanceKm) : null
    if (values.distanceKm && distanceKm === null) return invalid('invalid-distance')

    const incline = values.incline ? parseNonNegativeNumber(values.incline) : null
    if (values.incline && incline === null) return invalid('invalid-incline')

    const speedKmh = values.speedKmh ? parseNonNegativeNumber(values.speedKmh) : null
    if (values.speedKmh && speedKmh === null) return invalid('invalid-speed')

    return {
      ok: true,
      data: {
        ...base,
        duration_seconds: Math.round(durationMin * 60),
        distance_km: distanceKm ?? undefined,
        incline: incline ?? undefined,
        speed_kmh: speedKmh ?? undefined,
        rest_time: restTimeNum,
      },
    }
  }

  // timed
  const durationSec = parsePositiveInt(values.durationSec)
  if (durationSec === null) {
    return invalid('invalid-duration')
  }

  return {
    ok: true,
    data: {
      ...base,
      duration_seconds: durationSec,
      rest_time: restTimeNum,
    },
  }
}

export function formatSetRestTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes === 0) return `${remainingSeconds}s`
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
}
