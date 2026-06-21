import { type FormEvent, useEffect, useId, useMemo, useState } from 'react'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import { createCustomExercise, updateCustomExercise, uploadCustomExerciseImage } from '../client'
import {
  type CustomExerciseDraft,
  type CustomExerciseDraftErrors,
  emptyCustomExerciseDraft,
  type TrackingType,
  trackingTypes,
  validateCustomExerciseDraft,
} from '../custom-exercise'

export interface CustomExerciseFormProps {
  isOpen: boolean
  onClose: () => void
  categories: { id: string; name: string }[]
  userId: string
  // When set, the form edits an existing custom exercise instead of creating.
  initial?: ExerciseWithParsedFields | null
  onSaved: (exercise: ExerciseWithParsedFields) => void
}

const TRACKING_LABELS: Record<TrackingType, string> = {
  strength: 'Strength',
  cardio: 'Cardio',
  timed: 'Timed',
}

function draftFromExercise(
  initial: ExerciseWithParsedFields | null | undefined,
): CustomExerciseDraft {
  if (!initial) return { ...emptyCustomExerciseDraft }
  return {
    name: initial.name ?? '',
    categoryId: initial.category_id ?? '',
    trackingType: (initial.tracking_type as TrackingType) ?? 'strength',
    equipment: initial.equipment ?? '',
    primaryMuscles: initial.primary_muscles ?? [],
    secondaryMuscles: initial.secondary_muscles ?? [],
    instructions: initial.instructions ?? [],
    gifPath: initial.gif_path ?? '',
    previewImagePath: initial.preview_image_path ?? '',
  }
}

const inputClass =
  'w-full min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

export default function CustomExerciseForm({
  isOpen,
  onClose,
  categories,
  userId,
  initial,
  onSaved,
}: CustomExerciseFormProps) {
  const formId = useId()
  const [draft, setDraft] = useState<CustomExerciseDraft>(() => draftFromExercise(initial))
  const [musclesText, setMusclesText] = useState('')
  const [secondaryText, setSecondaryText] = useState('')
  const [instructionsText, setInstructionsText] = useState('')
  const [errors, setErrors] = useState<CustomExerciseDraftErrors>({})
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Re-seed the form whenever it opens (or the edited exercise changes).
  useEffect(() => {
    if (!isOpen) return
    const seed = draftFromExercise(initial)
    setDraft(seed)
    setMusclesText(seed.primaryMuscles.join(', '))
    setSecondaryText(seed.secondaryMuscles.join(', '))
    setInstructionsText(seed.instructions.join('\n'))
    setErrors({})
    setImageFile(null)
    setSubmitError(null)
  }, [isOpen, initial])

  const isEditing = Boolean(initial)

  const splitList = (text: string, sep: string) =>
    text
      .split(sep)
      .map((value) => value.trim())
      .filter(Boolean)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitError(null)

    const candidate: CustomExerciseDraft = {
      ...draft,
      primaryMuscles: splitList(musclesText, ','),
      secondaryMuscles: splitList(secondaryText, ','),
      instructions: splitList(instructionsText, '\n'),
    }

    const validation = validateCustomExerciseDraft(candidate)
    if (!validation.ok) {
      setErrors(validation.errors)
      return
    }
    setErrors({})

    setIsSaving(true)
    try {
      const payload = { ...validation.value }
      if (imageFile) {
        const url = await uploadCustomExerciseImage(imageFile, userId)
        if (imageFile.type === 'image/gif') payload.gif_path = url
        else payload.preview_image_path = url
      }

      const saved =
        isEditing && initial
          ? await updateCustomExercise(initial.id, payload)
          : await createCustomExercise(payload)

      onSaved(saved)
      onClose()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save exercise')
    } finally {
      setIsSaving(false)
    }
  }

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="relative w-full sm:max-w-lg bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-xl shadow-xl max-h-full sm:max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
              {isEditing ? 'Edit exercise' : 'Add custom exercise'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form
            id={formId}
            onSubmit={handleSubmit}
            className="overflow-y-auto p-4 sm:p-6 space-y-4"
          >
            <div>
              <label htmlFor={`${formId}-name`} className={labelClass}>
                Name
              </label>
              <input
                id={`${formId}-name`}
                className={inputClass}
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Pendlay Row"
                maxLength={120}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor={`${formId}-category`} className={labelClass}>
                Category
              </label>
              <select
                id={`${formId}-category`}
                className={`${inputClass} cursor-pointer`}
                value={draft.categoryId}
                onChange={(e) => setDraft((d) => ({ ...d, categoryId: e.target.value }))}
              >
                <option value="">Pick a category…</option>
                {sortedCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>
              )}
            </div>

            <div>
              <span className={labelClass}>How is it tracked?</span>
              <div className="grid grid-cols-3 gap-2">
                {trackingTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, trackingType: type }))}
                    aria-pressed={draft.trackingType === type}
                    className={`min-h-[44px] rounded-lg border text-sm font-medium cursor-pointer ${
                      draft.trackingType === type
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {TRACKING_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor={`${formId}-equipment`} className={labelClass}>
                Equipment <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id={`${formId}-equipment`}
                className={inputClass}
                value={draft.equipment}
                onChange={(e) => setDraft((d) => ({ ...d, equipment: e.target.value }))}
                placeholder="e.g. barbell"
              />
            </div>

            <div>
              <label htmlFor={`${formId}-primary`} className={labelClass}>
                Primary muscles <span className="text-gray-400">(comma separated, optional)</span>
              </label>
              <input
                id={`${formId}-primary`}
                className={inputClass}
                value={musclesText}
                onChange={(e) => setMusclesText(e.target.value)}
                placeholder="e.g. back, lats"
              />
            </div>

            <div>
              <label htmlFor={`${formId}-secondary`} className={labelClass}>
                Secondary muscles <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id={`${formId}-secondary`}
                className={inputClass}
                value={secondaryText}
                onChange={(e) => setSecondaryText(e.target.value)}
                placeholder="e.g. biceps"
              />
            </div>

            <div>
              <label htmlFor={`${formId}-instructions`} className={labelClass}>
                Instructions <span className="text-gray-400">(one step per line, optional)</span>
              </label>
              <textarea
                id={`${formId}-instructions`}
                className={`${inputClass} min-h-[88px]`}
                value={instructionsText}
                onChange={(e) => setInstructionsText(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <label htmlFor={`${formId}-image`} className={labelClass}>
                Image or GIF <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id={`${formId}-image`}
                type="file"
                accept="image/*"
                className="block w-full text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          </form>

          <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 min-h-[44px] text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form={formId}
              disabled={isSaving}
              className="px-6 py-3 min-h-[44px] text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 rounded-lg disabled:opacity-60 cursor-pointer"
            >
              {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Add exercise'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
