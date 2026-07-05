import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { InlineError } from '@/components/ui/InlineError'
import { TrashButton } from '@/components/ui/TrashButton'
import type { WorkoutSet, WorkoutSetInput } from '@/lib/types/database'
import type { ExerciseTrackingType } from '@/lib/utils/exercise-tracking'
import {
  buildWorkoutSetInput,
  formatDuration,
  formatSetRestTime,
  type SetEntryFormValues,
} from '../setEntry'

interface SetEntryProps {
  exerciseId?: string
  workoutId?: string
  existingSet?: WorkoutSet
  previousSet?: WorkoutSet
  setNumber: number
  trackingType: ExerciseTrackingType
  onSave: (setData: WorkoutSetInput) => Promise<WorkoutSet | null>
  onDelete?: () => void
  isActiveEntry?: boolean
  submitSignal?: number
  useStickyMobileActions?: boolean
  className?: string
}

function emptyValues(): SetEntryFormValues {
  return {
    reps: '',
    weight: '',
    durationMin: '',
    distanceKm: '',
    incline: '',
    speedKmh: '',
    durationSec: '',
    restTime: '',
    notes: '',
  }
}

function valuesFromSet(
  set: WorkoutSet,
  { carryNotes = true }: { carryNotes?: boolean } = {},
): SetEntryFormValues {
  return {
    reps: set.reps?.toString() ?? '',
    weight: set.weight?.toString() ?? '',
    durationMin: set.duration_seconds ? String(set.duration_seconds / 60) : '',
    distanceKm: set.distance_km?.toString() ?? '',
    incline: set.incline?.toString() ?? '',
    speedKmh: set.speed_kmh?.toString() ?? '',
    durationSec: set.duration_seconds?.toString() ?? '',
    restTime: set.rest_time?.toString() ?? '',
    notes: carryNotes ? (set.notes ?? '') : '',
  }
}

function initialValues(existingSet?: WorkoutSet, previousSet?: WorkoutSet): SetEntryFormValues {
  if (existingSet) return valuesFromSet(existingSet)
  if (previousSet) return valuesFromSet(previousSet, { carryNotes: false })
  return emptyValues()
}

export default function SetEntry({
  exerciseId,
  workoutId,
  existingSet,
  previousSet,
  setNumber,
  trackingType,
  onSave,
  onDelete,
  isActiveEntry = false,
  submitSignal = 0,
  useStickyMobileActions = false,
  className = '',
}: SetEntryProps) {
  const entryId = useId()
  const [values, setValues] = useState<SetEntryFormValues>(initialValues(existingSet, previousSet))
  const [isSaved, setIsSaved] = useState(!!existingSet)
  const [isEditing, setIsEditing] = useState(!existingSet)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [saveFeedback, setSaveFeedback] = useState(false)
  const [showDetails, setShowDetails] = useState(
    Boolean(existingSet?.rest_time || existingSet?.notes),
  )
  const saveFeedbackTimeoutRef = useRef<number | null>(null)
  const submitSignalRef = useRef(submitSignal)

  const set = (field: keyof SetEntryFormValues, value: string) =>
    setValues((prev) => ({ ...prev, [field]: value }))

  useEffect(() => {
    if (existingSet) {
      setValues(valuesFromSet(existingSet))
      setIsSaved(true)
      setIsEditing(false)
      setValidationMessage(null)
      setShowDetails(Boolean(existingSet.rest_time || existingSet.notes))
    }
  }, [existingSet])

  useEffect(() => {
    if (!existingSet) {
      setValues(initialValues(undefined, previousSet))
      setValidationMessage(null)
      setShowDetails(Boolean(previousSet?.rest_time))
    }
  }, [existingSet, previousSet])

  useEffect(() => {
    return () => {
      if (saveFeedbackTimeoutRef.current) window.clearTimeout(saveFeedbackTimeoutRef.current)
    }
  }, [])

  const flashSavedState = useCallback(() => {
    setSaveFeedback(false)
    if (saveFeedbackTimeoutRef.current) window.clearTimeout(saveFeedbackTimeoutRef.current)
    window.setTimeout(() => {
      setSaveFeedback(true)
      saveFeedbackTimeoutRef.current = window.setTimeout(() => setSaveFeedback(false), 1200)
    }, 0)
  }, [])

  const bumpNumber = (value: string, amount: number, min = 0) => {
    const current = Number.parseFloat(value || '0')
    const nextValue = Number.isFinite(current) ? current + amount : amount
    const clamped = Math.max(min, nextValue)
    return Number.isInteger(clamped) ? String(clamped) : String(Number(clamped.toFixed(2)))
  }

  const handleSave = useCallback(async () => {
    if (isSaved && !existingSet) return

    const result = buildWorkoutSetInput({
      exerciseId,
      workoutId,
      setNumber,
      trackingType,
      values,
    })

    if (!result.ok) {
      setValidationMessage(result.message)
      return
    }

    try {
      setValidationMessage(null)
      setIsSubmitting(true)
      const savedSet = await onSave(result.data)
      if (!savedSet) return

      flashSavedState()

      if (!existingSet) {
        setValues(valuesFromSet(savedSet, { carryNotes: false }))
        setIsSaved(false)
        setIsEditing(true)
      } else {
        setIsSaved(true)
        setIsEditing(false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [
    exerciseId,
    existingSet,
    flashSavedState,
    isSaved,
    onSave,
    setNumber,
    trackingType,
    values,
    workoutId,
  ])

  const handleCancel = () => {
    if (existingSet) {
      setValues(valuesFromSet(existingSet))
      setValidationMessage(null)
      setIsEditing(false)
    } else {
      setValues(emptyValues())
      setValidationMessage(null)
    }
  }

  useEffect(() => {
    if (submitSignalRef.current === submitSignal) return
    submitSignalRef.current = submitSignal
    if (isActiveEntry && !existingSet) {
      void handleSave()
    }
  }, [existingSet, handleSave, isActiveEntry, submitSignal])

  const inputClass = (flash = false) =>
    `min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-lg font-semibold text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400${flash ? ' motion-field-flash' : ''}`

  const smallInputClass =
    'min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400'

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
              onClick={() => setIsEditing(true)}
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
        <div className="space-y-3">
          {trackingType === 'strength' && (
            <StrengthFields
              values={values}
              set={set}
              entryId={entryId}
              bumpNumber={bumpNumber}
              inputClass={inputClass}
            />
          )}

          {trackingType === 'cardio' && (
            <CardioFields
              values={values}
              set={set}
              entryId={entryId}
              bumpNumber={bumpNumber}
              inputClass={inputClass}
            />
          )}

          {trackingType === 'timed' && (
            <TimedFields
              values={values}
              set={set}
              entryId={entryId}
              bumpNumber={bumpNumber}
              inputClass={inputClass}
            />
          )}

          <button
            type="button"
            onClick={() => setShowDetails((c) => !c)}
            className="motion-press min-h-11 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
            aria-expanded={showDetails}
          >
            {showDetails ? 'Hide rest and notes' : 'Add rest time or notes'}
          </button>

          {showDetails && (
            <div className="space-y-3">
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
                  value={values.restTime}
                  onChange={(e) => set('restTime', e.target.value)}
                  placeholder="60"
                  min="0"
                  step="5"
                  className={smallInputClass}
                />
              </div>
              <div>
                <label
                  htmlFor={`${entryId}-notes`}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Notes
                </label>
                <textarea
                  id={`${entryId}-notes`}
                  value={values.notes}
                  onChange={(e) => set('notes', e.target.value)}
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

          <div
            className={`flex-col gap-2 pt-2 sm:flex sm:flex-row ${
              useStickyMobileActions && !existingSet ? 'hidden' : 'flex'
            }`}
          >
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
        <SetDisplay set={existingSet ?? null} values={values} trackingType={trackingType} />
      )}
    </div>
  )
}

// ─── Field groups ────────────────────────────────────────────────────────────

interface FieldGroupProps {
  values: SetEntryFormValues
  set: (field: keyof SetEntryFormValues, value: string) => void
  entryId: string
  bumpNumber: (value: string, amount: number, min?: number) => string
  inputClass: (flash?: boolean) => string
}

function StrengthFields({ values, set, entryId, bumpNumber, inputClass }: FieldGroupProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
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
          value={values.reps}
          onChange={(e) => set('reps', e.target.value)}
          placeholder="0"
          min="1"
          max="100"
          className={inputClass()}
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => set('reps', bumpNumber(values.reps, -1, 1))}
            className="motion-press min-h-11 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            aria-label="Decrease reps by 1"
          >
            -1
          </button>
          <button
            type="button"
            onClick={() => set('reps', bumpNumber(values.reps, 1, 1))}
            className="motion-press min-h-11 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            aria-label="Increase reps by 1"
          >
            +1
          </button>
        </div>
      </div>
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
          value={values.weight}
          onChange={(e) => set('weight', e.target.value)}
          placeholder="0"
          min="0"
          step="0.5"
          className={inputClass()}
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => set('weight', bumpNumber(values.weight, -2.5, 0))}
            className="motion-press min-h-11 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            aria-label="Decrease weight by 2.5 kilograms"
          >
            -2.5
          </button>
          <button
            type="button"
            onClick={() => set('weight', bumpNumber(values.weight, 2.5, 0))}
            className="motion-press min-h-11 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            aria-label="Increase weight by 2.5 kilograms"
          >
            +2.5
          </button>
        </div>
      </div>
    </div>
  )
}

function CardioFields({ values, set, entryId, bumpNumber, inputClass }: FieldGroupProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={`${entryId}-duration-min`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Duration (min) *
          </label>
          <input
            id={`${entryId}-duration-min`}
            type="number"
            inputMode="decimal"
            value={values.durationMin}
            onChange={(e) => set('durationMin', e.target.value)}
            placeholder="30"
            min="0.5"
            step="0.5"
            className={inputClass()}
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => set('durationMin', bumpNumber(values.durationMin, -5, 0.5))}
              className="motion-press min-h-11 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              aria-label="Decrease duration by 5 minutes"
            >
              -5
            </button>
            <button
              type="button"
              onClick={() => set('durationMin', bumpNumber(values.durationMin, 5, 0.5))}
              className="motion-press min-h-11 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              aria-label="Increase duration by 5 minutes"
            >
              +5
            </button>
          </div>
        </div>
        <div>
          <label
            htmlFor={`${entryId}-distance`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Distance (km)
          </label>
          <input
            id={`${entryId}-distance`}
            type="number"
            inputMode="decimal"
            value={values.distanceKm}
            onChange={(e) => set('distanceKm', e.target.value)}
            placeholder="0"
            min="0"
            step="0.1"
            className={inputClass()}
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => set('distanceKm', bumpNumber(values.distanceKm, -0.5, 0))}
              className="motion-press min-h-11 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              aria-label="Decrease distance by 0.5 kilometers"
            >
              -0.5
            </button>
            <button
              type="button"
              onClick={() => set('distanceKm', bumpNumber(values.distanceKm, 0.5, 0))}
              className="motion-press min-h-11 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              aria-label="Increase distance by 0.5 kilometers"
            >
              +0.5
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={`${entryId}-incline`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Incline (level)
          </label>
          <input
            id={`${entryId}-incline`}
            type="number"
            inputMode="decimal"
            value={values.incline}
            onChange={(e) => set('incline', e.target.value)}
            placeholder="0"
            min="0"
            step="0.5"
            className={inputClass()}
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => set('incline', bumpNumber(values.incline, -1, 0))}
              className="motion-press min-h-11 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              aria-label="Decrease incline by 1 level"
            >
              -1
            </button>
            <button
              type="button"
              onClick={() => set('incline', bumpNumber(values.incline, 1, 0))}
              className="motion-press min-h-11 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              aria-label="Increase incline by 1 level"
            >
              +1
            </button>
          </div>
        </div>
        <div>
          <label
            htmlFor={`${entryId}-speed`}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Speed (km/h)
          </label>
          <input
            id={`${entryId}-speed`}
            type="number"
            inputMode="decimal"
            value={values.speedKmh}
            onChange={(e) => set('speedKmh', e.target.value)}
            placeholder="0"
            min="0"
            step="0.5"
            className={inputClass()}
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => set('speedKmh', bumpNumber(values.speedKmh, -0.5, 0))}
              className="motion-press min-h-11 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              aria-label="Decrease speed by 0.5 kilometers per hour"
            >
              -0.5
            </button>
            <button
              type="button"
              onClick={() => set('speedKmh', bumpNumber(values.speedKmh, 0.5, 0))}
              className="motion-press min-h-11 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              aria-label="Increase speed by 0.5 kilometers per hour"
            >
              +0.5
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TimedFields({ values, set, entryId, bumpNumber, inputClass }: FieldGroupProps) {
  return (
    <div>
      <label
        htmlFor={`${entryId}-duration-sec`}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        Duration (seconds) *
      </label>
      <input
        id={`${entryId}-duration-sec`}
        type="number"
        inputMode="numeric"
        value={values.durationSec}
        onChange={(e) => set('durationSec', e.target.value)}
        placeholder="60"
        min="1"
        step="5"
        className={inputClass()}
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => set('durationSec', bumpNumber(values.durationSec, -5, 1))}
          className="motion-press min-h-11 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          aria-label="Decrease duration by 5 seconds"
        >
          -5
        </button>
        <button
          type="button"
          onClick={() => set('durationSec', bumpNumber(values.durationSec, 5, 1))}
          className="motion-press min-h-11 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          aria-label="Increase duration by 5 seconds"
        >
          +5
        </button>
      </div>
    </div>
  )
}

// ─── Display mode ─────────────────────────────────────────────────────────────

function SetDisplay({
  set,
  values,
  trackingType,
}: {
  set: WorkoutSet | null
  values: SetEntryFormValues
  trackingType: ExerciseTrackingType
}) {
  return (
    <div className="space-y-2">
      {trackingType === 'strength' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Reps:</span>
            <span className="ml-2 font-semibold text-gray-900 dark:text-white">{values.reps}</span>
          </div>
          {values.weight && (
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Weight:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                {values.weight} kg
              </span>
            </div>
          )}
        </div>
      )}

      {trackingType === 'cardio' && (
        <div className="grid grid-cols-2 gap-4">
          {values.durationMin && (
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Duration:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                {values.durationMin} min
              </span>
            </div>
          )}
          {values.distanceKm && (
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Distance:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                {values.distanceKm} km
              </span>
            </div>
          )}
          {values.incline && (
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Incline:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                {values.incline}
              </span>
            </div>
          )}
          {values.speedKmh && (
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Speed:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                {values.speedKmh} km/h
              </span>
            </div>
          )}
        </div>
      )}

      {trackingType === 'timed' && (
        <div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Duration:</span>
          <span className="ml-2 font-semibold text-gray-900 dark:text-white">
            {set?.duration_seconds
              ? formatDuration(set.duration_seconds)
              : `${values.durationSec}s`}
          </span>
        </div>
      )}

      {values.restTime && (
        <div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Rest:</span>
          <span className="ml-2 text-gray-900 dark:text-white">
            {formatSetRestTime(Number.parseInt(values.restTime, 10))}
          </span>
        </div>
      )}

      {values.notes && (
        <div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Notes:</span>
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{values.notes}</span>
        </div>
      )}
    </div>
  )
}
