// Pure model for Custom Exercises (per CONTEXT.md): the form draft a user
// fills, its validation, and the normalized create payload sent to the API.
// No I/O here — kept pure so it can be unit-tested and reused on client+server.

export type TrackingType = 'strength' | 'cardio' | 'timed'

export const trackingTypes: TrackingType[] = ['strength', 'cardio', 'timed']

const CUSTOM_ID_PREFIX = 'custom-'
const MAX_NAME_LENGTH = 120

// Shape the form binds to. Strings/arrays so inputs map 1:1 to fields.
export interface CustomExerciseDraft {
  name: string
  categoryId: string
  trackingType: TrackingType
  equipment: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  gifPath: string
  previewImagePath: string
}

// Normalized payload the create/edit route accepts (matches DB column names).
export interface CustomExercisePayload {
  name: string
  category_id: string
  tracking_type: TrackingType
  equipment: string | null
  primary_muscles: string[]
  secondary_muscles: string[]
  instructions: string[]
  gif_path: string | null
  preview_image_path: string | null
}

export interface CustomExerciseDraftErrors {
  name?: string
  categoryId?: string
  trackingType?: string
}

export type ValidateResult =
  | { ok: true; value: CustomExercisePayload }
  | { ok: false; errors: CustomExerciseDraftErrors }

export const emptyCustomExerciseDraft: CustomExerciseDraft = {
  name: '',
  categoryId: '',
  trackingType: 'strength',
  equipment: '',
  primaryMuscles: [],
  secondaryMuscles: [],
  instructions: [],
  gifPath: '',
  previewImagePath: '',
}

export function customExerciseId(): string {
  return `${CUSTOM_ID_PREFIX}${crypto.randomUUID()}`
}

export function isCustomExerciseId(id: string): boolean {
  return id.startsWith(CUSTOM_ID_PREFIX)
}

function nullableTrimmed(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function cleanList(values: string[], lower: boolean): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of values) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const value = lower ? trimmed.toLowerCase() : trimmed
    if (seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

// Build the API payload from a draft. Assumes the draft already validated;
// trims, drops blanks, lowercases the faceted fields (equipment/muscles) so
// they match the existing lowercase facets in the catalog.
export function normalizeCustomExerciseDraft(draft: CustomExerciseDraft): CustomExercisePayload {
  return {
    name: draft.name.trim(),
    category_id: draft.categoryId.trim(),
    tracking_type: draft.trackingType,
    equipment: draft.equipment ? (nullableTrimmed(draft.equipment)?.toLowerCase() ?? null) : null,
    primary_muscles: cleanList(draft.primaryMuscles, true),
    secondary_muscles: cleanList(draft.secondaryMuscles, true),
    instructions: cleanList(draft.instructions, false),
    gif_path: nullableTrimmed(draft.gifPath),
    preview_image_path: nullableTrimmed(draft.previewImagePath),
  }
}

export function validateCustomExerciseDraft(draft: CustomExerciseDraft): ValidateResult {
  const errors: CustomExerciseDraftErrors = {}

  const name = draft.name.trim()
  if (!name) {
    errors.name = 'Name is required'
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = `Name must be ${MAX_NAME_LENGTH} characters or fewer`
  }

  if (!draft.categoryId.trim()) {
    errors.categoryId = 'Pick a category'
  }

  if (!trackingTypes.includes(draft.trackingType)) {
    errors.trackingType = 'Pick how this exercise is tracked'
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, value: normalizeCustomExerciseDraft(draft) }
}
