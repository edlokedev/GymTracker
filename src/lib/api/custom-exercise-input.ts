// Server-side normalization + safety guard for Custom Exercise writes.
//
// The client uploads media to the public `exercise-images` bucket under its own
// uid folder, then sends the resulting public URL. Storage RLS stops a user
// writing outside their folder, but nothing stops them sending an ARBITRARY
// external URL in the body — so the server re-validates that any image URL is
// null or points into this project's bucket beneath the caller's uid.

import { badRequest } from './errors'

export const EXERCISE_IMAGE_BUCKET = 'exercise-images'

export interface CustomExerciseBody {
  name: string
  category_id: string
  tracking_type: 'strength' | 'cardio' | 'timed'
  equipment?: string | null
  primary_muscles?: string[]
  secondary_muscles?: string[]
  instructions?: string[]
  gif_path?: string | null
  preview_image_path?: string | null
}

export interface CustomExerciseInput {
  name: string
  category_id: string
  tracking_type: 'strength' | 'cardio' | 'timed'
  equipment: string | null
  primary_muscles: string[]
  secondary_muscles: string[]
  instructions: string[]
  gif_path: string | null
  preview_image_path: string | null
}

// Public base every owned image URL must start with:
//   <supabaseUrl>/storage/v1/object/public/exercise-images/<uid>/
export function ownedImagePrefix(supabaseUrl: string, userId: string): string {
  const base = supabaseUrl.replace(/\/+$/, '')
  return `${base}/storage/v1/object/public/${EXERCISE_IMAGE_BUCKET}/${userId}/`
}

// Returns the URL if it is null/empty or owned; throws badRequest otherwise.
export function assertOwnedExerciseImageUrl(
  url: string | null | undefined,
  userId: string,
  supabaseUrl: string,
): string | null {
  const trimmed = url?.trim()
  if (!trimmed) return null
  if (!trimmed.startsWith(ownedImagePrefix(supabaseUrl, userId))) {
    badRequest('Image URL must point to your own uploaded exercise image')
  }
  return trimmed
}

function cleanList(values: string[] | undefined, lower: boolean): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of values ?? []) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const value = lower ? trimmed.toLowerCase() : trimmed
    if (seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

// Build the persisted input from a validated body: trims, lowercases facets to
// match the catalog, and guards both image URLs against the caller's folder.
export function toCustomExerciseInput(
  body: CustomExerciseBody,
  userId: string,
  supabaseUrl: string,
): CustomExerciseInput {
  const equipment = body.equipment?.trim()
  return {
    name: body.name.trim(),
    category_id: body.category_id.trim(),
    tracking_type: body.tracking_type,
    equipment: equipment ? equipment.toLowerCase() : null,
    primary_muscles: cleanList(body.primary_muscles, true),
    secondary_muscles: cleanList(body.secondary_muscles, true),
    instructions: cleanList(body.instructions, false),
    gif_path: assertOwnedExerciseImageUrl(body.gif_path, userId, supabaseUrl),
    preview_image_path: assertOwnedExerciseImageUrl(body.preview_image_path, userId, supabaseUrl),
  }
}
