export type ExerciseTrackingType = 'strength' | 'cardio' | 'timed'

const CARDIO_CATEGORIES = new Set(['cardio'])
const TIMED_CATEGORIES = new Set(['stretching'])

export function getTrackingType(categoryName: string | null | undefined): ExerciseTrackingType {
  const normalized = (categoryName ?? '').toLowerCase().trim()
  if (CARDIO_CATEGORIES.has(normalized)) return 'cardio'
  if (TIMED_CATEGORIES.has(normalized)) return 'timed'
  return 'strength'
}
