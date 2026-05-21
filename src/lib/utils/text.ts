function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function toTitleCase(value: string): string {
  return normalizeWhitespace(value)
    .split(' ')
    .filter(Boolean)
    .map((word) => word.split('-').map(toTitleCaseSegment).join('-'))
    .join(' ')
}

export function formatExerciseName(value: string): string {
  return toTitleCase(value)
}

const EXERCISE_ACRONYMS = new Set(['ez', 'trx'])

function toTitleCaseSegment(value: string): string {
  const lowerValue = value.toLowerCase()
  if (EXERCISE_ACRONYMS.has(lowerValue)) return lowerValue.toUpperCase()
  if (!/[a-z]/i.test(value)) return value

  return lowerValue.charAt(0).toUpperCase() + lowerValue.slice(1)
}
