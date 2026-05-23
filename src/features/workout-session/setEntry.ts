import type { WorkoutSetInput } from '@/lib/types/database'

export interface SetEntryFormValues {
  reps: string
  weight: string
  restTime: string
  notes: string
}

export type SetEntryValidationError =
  | 'missing-workout-context'
  | 'invalid-reps'
  | 'invalid-weight'
  | 'invalid-rest-time'

export type SetEntryValidationResult =
  | { ok: true; data: WorkoutSetInput }
  | { ok: false; error: SetEntryValidationError; message: string }

const SET_ENTRY_ERROR_MESSAGES: Record<SetEntryValidationError, string> = {
  'missing-workout-context': 'Cannot save set until workout and exercise are ready.',
  'invalid-reps': 'Please enter a valid number of reps.',
  'invalid-weight': 'Please enter a valid weight.',
  'invalid-rest-time': 'Please enter a valid rest time.',
}

function invalid(error: SetEntryValidationError): SetEntryValidationResult {
  return { ok: false, error, message: SET_ENTRY_ERROR_MESSAGES[error] }
}

export function buildWorkoutSetInput({
  exerciseId,
  workoutId,
  setNumber,
  values,
}: {
  exerciseId?: string
  workoutId?: string
  setNumber: number
  values: SetEntryFormValues
}): SetEntryValidationResult {
  if (!exerciseId || !workoutId) {
    return invalid('missing-workout-context')
  }

  const repsNum = Number.parseInt(values.reps, 10)
  if (!values.reps || Number.isNaN(repsNum) || repsNum <= 0) {
    return invalid('invalid-reps')
  }

  const weightNum = Number.parseFloat(values.weight)
  if (values.weight && (Number.isNaN(weightNum) || weightNum < 0)) {
    return invalid('invalid-weight')
  }

  let restTimeNum: number | undefined
  if (values.restTime) {
    restTimeNum = Number.parseInt(values.restTime, 10)
    if (Number.isNaN(restTimeNum) || restTimeNum < 0) {
      return invalid('invalid-rest-time')
    }
  }

  return {
    ok: true,
    data: {
      workout_id: workoutId,
      exercise_id: exerciseId,
      set_order: setNumber,
      reps: repsNum,
      weight: values.weight && !Number.isNaN(weightNum) && weightNum > 0 ? weightNum : undefined,
      rest_time: restTimeNum,
      notes: values.notes.trim() || undefined,
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
