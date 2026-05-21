import type { ExerciseWithParsedFields } from './types/database'

const EXERCISE_MEDIA_BASE_PATH = '/images/exercises'
export const EXERCISE_PLACEHOLDER_IMAGE = '/images/placeholder-exercise.png'

function buildMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return `${EXERCISE_MEDIA_BASE_PATH}/${path.replace(/^\/+/, '')}`
}

export function getExerciseMediaUrls(
  exercise: Pick<ExerciseWithParsedFields, 'gif_path' | 'preview_image_path'>,
) {
  return {
    gifUrl: buildMediaUrl(exercise.gif_path),
    previewImageUrl: buildMediaUrl(exercise.preview_image_path),
    placeholderUrl: EXERCISE_PLACEHOLDER_IMAGE,
  }
}
