export type ExerciseTrackingType = 'strength' | 'cardio' | 'timed'

const CARDIO_CATEGORIES = new Set(['cardio'])
const TIMED_CATEGORIES = new Set(['stretching', 'mobility'])
const TIMED_FORCES = new Set(['static'])

export function normalizeTrackingType(
  value: string | null | undefined,
): ExerciseTrackingType | null {
  const normalized = (value ?? '').toLowerCase().trim()
  if (normalized === 'strength' || normalized === 'cardio' || normalized === 'timed') {
    return normalized
  }
  return null
}

export function getTrackingType(
  input:
    | {
        trackingType?: string | null
        categoryName?: string | null
        force?: string | null
      }
    | string
    | null
    | undefined,
): ExerciseTrackingType {
  if (typeof input === 'string' || input == null) {
    const normalizedCategory = (input ?? '').toLowerCase().trim()
    if (CARDIO_CATEGORIES.has(normalizedCategory)) return 'cardio'
    if (TIMED_CATEGORIES.has(normalizedCategory)) return 'timed'
    return 'strength'
  }

  const explicit = normalizeTrackingType(input.trackingType)
  if (explicit) return explicit

  const normalizedCategory = (input.categoryName ?? '').toLowerCase().trim()
  if (CARDIO_CATEGORIES.has(normalizedCategory)) return 'cardio'
  if (TIMED_CATEGORIES.has(normalizedCategory)) return 'timed'

  const normalizedForce = (input.force ?? '').toLowerCase().trim()
  if (TIMED_FORCES.has(normalizedForce)) return 'timed'

  return 'strength'
}
