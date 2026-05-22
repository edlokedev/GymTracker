import type { ExerciseWithParsedFields } from './types/database'

// Local fallback base used only when an exercise's media field is a relative
// path (legacy local-files setup). The Supabase seed populates these fields
// with absolute jsDelivr URLs which pass through untouched.
const EXERCISE_MEDIA_BASE_PATH = '/images/exercises'

export const EXERCISE_PLACEHOLDER_IMAGE = '/images/placeholder-exercise.png'

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith('//')
}

function resolveMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null
  if (isAbsoluteUrl(value)) return value
  return `${EXERCISE_MEDIA_BASE_PATH}/${value.replace(/^\/+/, '')}`
}

export function getExerciseMediaUrls(
  exercise: Pick<ExerciseWithParsedFields, 'gif_path' | 'preview_image_path'>,
) {
  return {
    gifUrl: resolveMediaUrl(exercise.gif_path),
    previewImageUrl: resolveMediaUrl(exercise.preview_image_path),
    placeholderUrl: EXERCISE_PLACEHOLDER_IMAGE,
  }
}
