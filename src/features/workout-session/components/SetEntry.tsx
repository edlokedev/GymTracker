import { useEffect, useId, useRef, useState } from 'react'
import { InlineError } from '@/components/ui/InlineError'
import { TrashButton } from '@/components/ui/TrashButton'
import type { WorkoutSet, WorkoutSetInput } from '@/lib/types/database'
import { buildWorkoutSetInput, formatSetRestTime } from '../setEntry'

interface SetEntryProps {
  exerciseId?: string
  workoutId?: string
  existingSet?: WorkoutSet
  previousSet?: WorkoutSet
  setNumber: number
  onSave: (setData: WorkoutSetInput) => Promise<WorkoutSet | null>
  onDelete?: () => void
  className?: string
}

export default function SetEntry({
  exerciseId,
  workoutId,
  existingSet,
  previousSet,
  setNumber,
  onSave,
  onDelete,
  className = '',
}: SetEntryProps) {
  const entryId = useId()
  const [reps, setReps] = useState<string>(existingSet?.reps?.toString() || '')
  const [weight, setWeight] = useState<string>(existingSet?.weight?.toString() || '')
  const [restTime, setRestTime] = useState<string>(existingSet?.rest_time?.toString() || '')
  const [notes, setNotes] = useState<string>(existingSet?.notes || '')
  const [isSaved, setIsSaved] = useState(!!existingSet)
  const [isEditing, setIsEditing] = useState(!existingSet)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [copyFlash, setCopyFlash] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState(false)
  const [showDetails, setShowDetails] = useState(
    Boolean(existingSet?.rest_time || existingSet?.notes),
  )
  const copyFlashTimeoutRef = useRef<number | null>(null)
  const saveFeedbackTimeoutRef = useRef<number | null>(null)

  // Update form when existingSet changes
  useEffect(() => {
    if (existingSet) {
      setReps(existingSet.reps?.toString() || '')
      setWeight(existingSet.weight?.toString() || '')
      setRestTime(existingSet.rest_time?.toString() || '')
      setNotes(existingSet.notes || '')
      setIsSaved(true)
      setIsEditing(false)
      setValidationMessage(null)
      setShowDetails(Boolean(existingSet.rest_time || existingSet.notes))
    }
  }, [existingSet])

  useEffect(() => {
    return () => {
      if (copyFlashTimeoutRef.current) {
        window.clearTimeout(copyFlashTimeoutRef.current)
      }
      if (saveFeedbackTimeoutRef.current) {
        window.clearTimeout(saveFeedbackTimeoutRef.current)
      }
    }
  }, [])

  const flashCopiedFields = () => {
    setCopyFlash(false)
    if (copyFlashTimeoutRef.current) {
      window.clearTimeout(copyFlashTimeoutRef.current)
    }
    window.setTimeout(() => {
      setCopyFlash(true)
      copyFlashTimeoutRef.current = window.setTimeout(() => setCopyFlash(false), 560)
    }, 0)
  }

  const flashSavedState = () => {
    setSaveFeedback(false)
    if (saveFeedbackTimeoutRef.current) {
      window.clearTimeout(saveFeedbackTimeoutRef.current)
    }
    window.setTimeout(() => {
      setSaveFeedback(true)
      saveFeedbackTimeoutRef.current = window.setTimeout(() => setSaveFeedback(false), 1200)
    }, 0)
  }

  const bumpNumber = (value: string, amount: number) => {
    const current = Number.parseFloat(value || '0')
    return Number.isFinite(current) ? String(current + amount) : String(amount)
  }

  const copyPreviousSet = () => {
    if (!previousSet) return

    setReps(previousSet.reps?.toString() || '')
    setWeight(previousSet.weight?.toString() || '')
    setRestTime(previousSet.rest_time?.toString() || '')
    setNotes('')
    setValidationMessage(null)
    setShowDetails(Boolean(previousSet.rest_time))
    flashCopiedFields()
  }

  const handleSave = async () => {
    // Prevent duplicate submissions
    if (isSaved && !existingSet) {
      return
    }

    const result = buildWorkoutSetInput({
      exerciseId,
      workoutId,
      setNumber,
      values: { reps, weight, restTime, notes },
    })

    if (!result.ok) {
      setValidationMessage(result.message)
      return
    }

    try {
      setValidationMessage(null)
      setIsSubmitting(true)
      const savedSet = await onSave(result.data)

      if (!savedSet) {
        return
      }

      flashSavedState()

      if (!existingSet) {
        setReps('')
        setWeight('')
        setRestTime('')
        setNotes('')
        setIsSaved(false)
        setIsEditing(true)
      } else {
        setIsSaved(true)
        setIsEditing(false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    if (existingSet) {
      // Revert to saved values
      setReps(existingSet.reps?.toString() || '')
      setWeight(existingSet.weight?.toString() || '')
      setRestTime(existingSet.rest_time?.toString() || '')
      setNotes(existingSet.notes || '')
      setValidationMessage(null)
      setIsEditing(false)
    } else {
      // Clear new set
      setReps('')
      setWeight('')
      setRestTime('')
      setNotes('')
      setValidationMessage(null)
    }
  }

  return (
    <div
      className={`border rounded-xl p-4 transition-all duration-200 ${
        isSaved
          ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700 shadow-sm'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md'
      } ${saveFeedback ? 'motion-save-flash' : ''} ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900 dark:text-white">Set {setNumber}</h4>
        {isSaved && !isEditing && (
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="motion-press min-h-10 rounded-lg px-3 py-2 text-sm text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
            >
              Edit
            </button>
            {onDelete && (
              <TrashButton
                label={`Delete set ${setNumber}`}
                onClick={onDelete}
                className="min-h-11 min-w-11 rounded-md border-transparent bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20"
              />
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        /* Editing Mode */
        <div className="space-y-3">
          {!existingSet && previousSet && (
            <button
              type="button"
              onClick={copyPreviousSet}
              className="motion-press min-h-11 w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40"
            >
              Same as last set: {previousSet.reps ?? '-'} reps
              {previousSet.weight !== undefined ? ` at ${previousSet.weight} kg` : ''}
            </button>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Reps */}
            <div>
              <label
                htmlFor={`${entryId}-reps`}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Reps *
              </label>
              <input
                id={`${entryId}-reps`}
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="0"
                min="1"
                max="100"
                className={`min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-lg font-semibold text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${copyFlash ? 'motion-field-flash' : ''}`}
              />
              <button
                type="button"
                onClick={() => setReps((current) => bumpNumber(current, 1))}
                className="motion-press mt-2 min-h-10 w-full rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                +1 rep
              </button>
            </div>

            {/* Weight */}
            <div>
              <label
                htmlFor={`${entryId}-weight`}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Weight (kg)
              </label>
              <input
                id={`${entryId}-weight`}
                type="number"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0"
                min="0"
                step="0.5"
                className={`min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-lg font-semibold text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${copyFlash ? 'motion-field-flash' : ''}`}
              />
              <button
                type="button"
                onClick={() => setWeight((current) => bumpNumber(current, 2.5))}
                className="motion-press mt-2 min-h-10 w-full rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                +2.5 kg
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDetails((current) => !current)}
            className="motion-press min-h-11 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
            aria-expanded={showDetails}
          >
            {showDetails ? 'Hide rest and notes' : 'Add rest time or notes'}
          </button>

          {showDetails && (
            <div className="space-y-3">
              {/* Rest Time */}
              <div>
                <label
                  htmlFor={`${entryId}-rest-time`}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Rest Time (seconds)
                </label>
                <input
                  id={`${entryId}-rest-time`}
                  type="number"
                  inputMode="numeric"
                  value={restTime}
                  onChange={(e) => setRestTime(e.target.value)}
                  placeholder="60"
                  min="0"
                  step="5"
                  className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>

              {/* Notes */}
              <div>
                <label
                  htmlFor={`${entryId}-notes`}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Notes
                </label>
                <textarea
                  id={`${entryId}-notes`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes about this set..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
            </div>
          )}

          <InlineError message={validationMessage} />
          {saveFeedback && (
            <p className="motion-enter font-semibold text-green-600 text-sm dark:text-green-400">
              Saved
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="motion-press min-h-12 flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 font-medium text-white shadow-sm transition-all duration-200 hover:from-blue-700 hover:to-blue-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-blue-600 disabled:hover:to-blue-500"
            >
              {isSubmitting ? 'Saving...' : `${existingSet ? 'Update' : 'Save'} Set`}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="motion-press min-h-12 rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-600 transition-all duration-200 hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Display Mode */
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Reps:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">{reps}</span>
            </div>
            {weight && (
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Weight:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                  {weight} kg
                </span>
              </div>
            )}
          </div>

          {restTime && (
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Rest:</span>
              <span className="ml-2 text-gray-900 dark:text-white">
                {formatSetRestTime(parseInt(restTime, 10))}
              </span>
            </div>
          )}

          {notes && (
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Notes:</span>
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
