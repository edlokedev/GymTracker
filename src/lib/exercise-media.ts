import type { ExerciseWithParsedFields } from './types/database'

// Local fallback base for exercise media. Only used when an `images[]` entry is
// a relative path (legacy SQLite seed data). The Supabase seed populates this
// field with absolute jsDelivr URLs which pass through untouched.
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

// Derive a `{ gifUrl, previewImageUrl }` pair from an exercise's images array.
// The Free Exercise DB serves two static frames per exercise (`0.jpg`,
// `1.jpg`) — no GIFs — so `gifUrl` is intentionally null and the UI falls
// through to the first image as the preview.
//
// Accepts a `Pick<..., 'images'>` so callers don't need to materialize the
// full ExerciseWithParsedFields shape just to render a thumbnail.
export function getExerciseMediaUrls(exercise: Pick<ExerciseWithParsedFields, 'images'>) {
  const images = Array.isArray(exercise.images) ? exercise.images : []
  const previewImageUrl = resolveMediaUrl(images[0])
  return {
    gifUrl: null as string | null,
    previewImageUrl,
    placeholderUrl: EXERCISE_PLACEHOLDER_IMAGE,
  }
}
