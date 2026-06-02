import { useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InlineError } from '@/components/ui/InlineError'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TrashButton } from '@/components/ui/TrashButton'
import { ExerciseHistory } from '@/features/exercise-library/components/ExerciseHistory'
import ExerciseSelector from '@/features/exercise-library/components/ExerciseSelector'
import type { WorkoutSession, WorkoutSet } from '@/lib/types/database'
import { type ExerciseTrackingType, getTrackingType } from '@/lib/utils/exercise-tracking'
import { formatExerciseName } from '@/lib/utils/text'
import { getNextActiveExerciseId } from '../model'
import { formatDuration, formatSetRestTime } from '../setEntry'
import { useWorkoutSession } from '../useWorkoutSession'
import SetEntry from './SetEntry'

interface WorkoutSessionManagerProps {
  existingSession?: WorkoutSession
  onSessionSave?: (session: WorkoutSession) => void
  onSessionComplete?: (session: WorkoutSession) => void
  onSessionDelete?: (sessionId: string) => void | Promise<void>
  className?: string
}

export default function WorkoutSessionManager({
  existingSession,
  onSessionSave,
  onSessionComplete,
  onSessionDelete,
  className = '',
}: WorkoutSessionManagerProps) {
  const workout = useWorkoutSession({
    existingSession,
    onSessionSave,
    onSessionComplete,
    onSessionDelete,
  })
  const {
    session,
    exercises,
    sessionName,
    sessionNotes,
    sessionDate,
    selectedExercise,
    activeExerciseId,
    activeExercise,
    isSessionStarted,
    loading,
    saveStatus,
    commandStatus,
    commandError,
    totalSets,
    totalVolume,
    sessionDuration,
    setSessionName,
    setSessionNotes,
    setSessionDate,
    actions,
  } = workout

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    description: string
    confirmLabel?: string
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: 'Confirm',
    onConfirm: () => {},
  })
  const [showWorkoutDetails, setShowWorkoutDetails] = useState(false)
  const [completedExerciseIds, setCompletedExerciseIds] = useState<Set<string>>(() => new Set())
  const [submitSignal, setSubmitSignal] = useState(0)
  const exerciseRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const showWorkoutHeader =
    isSessionStarted ||
    Boolean(session) ||
    saveStatus !== 'idle' ||
    commandStatus === 'running' ||
    commandStatus === 'error'

  useEffect(() => {
    if (session?.id) {
      setCompletedExerciseIds(new Set())
      return
    }
    setCompletedExerciseIds(new Set())
  }, [session?.id])

  const focusExercise = (exerciseId: string | null) => {
    if (!exerciseId) return
    window.requestAnimationFrame(() => {
      exerciseRefs.current[exerciseId]?.focus({ preventScroll: true })
    })
  }

  const selectExercise = (exerciseId: string) => {
    actions.selectActiveExercise(exerciseId)
    focusExercise(exerciseId)
  }

  const focusAddExercise = () => {
    document.getElementById('workout-add-exercise')?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const promptDeleteSession = () => {
    if (!session) return

    const workoutLabel = session.name?.trim() || 'this workout'

    setConfirmModal({
      isOpen: true,
      title: 'Delete Workout',
      description: `Are you sure you want to delete "${workoutLabel}"? This will permanently remove the workout and all of its sets.`,
      confirmLabel: 'Delete Workout',
      onConfirm: async () => {
        const didDelete = await actions.deleteSession()
        if (didDelete) {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        }
      },
    })
  }

  const removeExercise = (exerciseId: string) => {
    const exerciseToRemove = exercises.find((e) => e.exercise.id === exerciseId)
    const exerciseName = exerciseToRemove
      ? formatExerciseName(exerciseToRemove.exercise.name)
      : 'this exercise'

    setConfirmModal({
      isOpen: true,
      title: 'Remove Exercise',
      description: `Are you sure you want to remove "${exerciseName}" and all its sets from your workout?`,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        const remainingExercises = exercises.filter((e) => e.exercise.id !== exerciseId)
        const didRemove = await actions.removeExercise(exerciseId)
        if (didRemove) {
          setCompletedExerciseIds((current) => {
            const next = new Set(current)
            next.delete(exerciseId)
            if (activeExerciseId === exerciseId) {
              const nextActiveExerciseId = getNextActiveExerciseId(
                remainingExercises,
                exerciseId,
                next,
              )
              actions.selectActiveExercise(nextActiveExerciseId)
              focusExercise(nextActiveExerciseId)
            }
            return next
          })
          setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        }
      },
    })
  }

  const completeExercise = (exerciseId: string) => {
    const exerciseToComplete = exercises.find((exercise) => exercise.exercise.id === exerciseId)
    if (!exerciseToComplete || exerciseToComplete.sets.length === 0) return

    setCompletedExerciseIds((current) => {
      const nextCompletedExerciseIds = new Set(current).add(exerciseId)
      const nextActiveExerciseId = getNextActiveExerciseId(
        exercises,
        exerciseId,
        nextCompletedExerciseIds,
      )
      actions.selectActiveExercise(nextActiveExerciseId)
      focusExercise(nextActiveExerciseId)
      return nextCompletedExerciseIds
    })
  }

  const resumeExercise = (exerciseId: string) => {
    setCompletedExerciseIds((current) => {
      const next = new Set(current)
      next.delete(exerciseId)
      return next
    })
    actions.selectActiveExercise(exerciseId)
    focusExercise(exerciseId)
  }

  const activeExerciseName = activeExercise
    ? formatExerciseName(activeExercise.exercise.name)
    : 'No exercise'
  const activeExerciseIsComplete = activeExerciseId
    ? completedExerciseIds.has(activeExerciseId)
    : false

  return (
    <div
      className={`space-y-4 sm:space-y-6 ${
        isSessionStarted && !session?.end_time
          ? 'pb-[calc(9rem+env(safe-area-inset-bottom))] sm:pb-0'
          : ''
      } ${className}`}
    >
      <div className="motion-enter rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        {showWorkoutHeader && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isSessionStarted && (
                <h1 className="font-bold text-gray-900 text-xl dark:text-white sm:text-2xl">
                  Active Workout
                </h1>
              )}
              {saveStatus === 'saving' && (
                <StatusBadge tone="neutral" className="animate-pulse">
                  Saving...
                </StatusBadge>
              )}
              {saveStatus === 'saved' && (
                <span className="font-medium text-green-600 text-sm opacity-100 transition-opacity duration-300 dark:text-green-400">
                  Saved
                </span>
              )}
              {saveStatus === 'error' && <StatusBadge tone="danger">Save failed</StatusBadge>}
              {commandStatus === 'running' && saveStatus !== 'saving' && (
                <StatusBadge tone="info" className="animate-pulse">
                  Working...
                </StatusBadge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {session?.end_time && <StatusBadge tone="success">Completed</StatusBadge>}
              {session && (
                <TrashButton
                  label="Delete workout"
                  onClick={promptDeleteSession}
                  disabled={loading}
                />
              )}
            </div>
          </div>
        )}

        <InlineError message={commandError} className="mb-4" />

        <div className="space-y-4">
          {isSessionStarted && (
            <button
              type="button"
              onClick={() => setShowWorkoutDetails((current) => !current)}
              className="motion-press flex min-h-11 w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700 text-sm transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-200 dark:hover:bg-gray-700"
              aria-expanded={showWorkoutDetails}
            >
              <span>Workout details</span>
              <span className="text-gray-500 text-xs dark:text-gray-400">
                {showWorkoutDetails ? 'Hide' : sessionName || sessionDate}
              </span>
            </button>
          )}

          {(!isSessionStarted || showWorkoutDetails) && (
            <div className="motion-disclosure-content space-y-4">
              <div>
                <label className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Workout Name
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  onBlur={actions.saveSession}
                  placeholder="e.g., Push Day, Legs, etc."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:disabled:bg-gray-600"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Notes
                </label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  onBlur={actions.saveSession}
                  placeholder="How are you feeling? Any goals for this workout?"
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:disabled:bg-gray-600"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Date
                </label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  onBlur={actions.saveSession}
                  onClick={(e) => {
                    try {
                      if ('showPicker' in HTMLInputElement.prototype) {
                        e.currentTarget.showPicker()
                      }
                    } catch {
                      // ignore
                    }
                  }}
                  className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-600"
                />
              </div>
            </div>
          )}

          {isSessionStarted && (
            <div className="grid grid-cols-3 gap-4 border-gray-200 border-t pt-4 dark:border-gray-700">
              <div className="text-center">
                <div className="font-bold text-2xl text-blue-600 dark:text-blue-400">
                  {totalSets}
                </div>
                <div className="text-gray-600 text-sm dark:text-gray-400">Sets</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-2xl text-green-600 dark:text-green-400">
                  {totalVolume.toLocaleString()}
                </div>
                <div className="text-gray-600 text-sm dark:text-gray-400">Volume</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-2xl text-purple-600 dark:text-purple-400">
                  {sessionDuration || '0m'}
                </div>
                <div className="text-gray-600 text-sm dark:text-gray-400">Duration</div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          {!isSessionStarted ? (
            <button
              onClick={actions.startSession}
              disabled={loading}
              className="motion-press rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-blue-600 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start Workout'}
            </button>
          ) : !session?.end_time ? (
            <button
              onClick={actions.completeSession}
              disabled={loading || totalSets === 0}
              className="motion-press rounded-xl bg-gradient-to-r from-green-600 to-green-500 px-6 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:from-green-700 hover:to-green-600 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Completing...' : 'Complete Workout'}
            </button>
          ) : null}
        </div>
      </div>

      {exercises.length > 0 && (
        <div className="space-y-4 sm:space-y-6">
          <WorkoutExerciseRail
            exercises={exercises}
            activeExerciseId={activeExerciseId}
            completedExerciseIds={completedExerciseIds}
            onSelectExercise={selectExercise}
          />

          {exercises.map((exerciseInWorkout) => {
            const previousSet = exerciseInWorkout.sets[exerciseInWorkout.sets.length - 1]
            const exerciseId = exerciseInWorkout.exercise.id
            const exerciseName = formatExerciseName(exerciseInWorkout.exercise.name)
            const trackingType = getTrackingType({
              trackingType: exerciseInWorkout.exercise.tracking_type,
              categoryName: exerciseInWorkout.exercise.category_name,
              force: exerciseInWorkout.exercise.force,
            })
            const isExerciseComplete = completedExerciseIds.has(exerciseId)
            const completionStats = getExerciseCompletionStats(exerciseInWorkout.sets, trackingType)
            const isActiveExercise = activeExerciseId === exerciseId
            const showOnMobile = isActiveExercise || isExerciseComplete || !activeExerciseId

            return (
              <div
                key={exerciseId}
                id={`workout-exercise-${exerciseId}`}
                ref={(node) => {
                  exerciseRefs.current[exerciseId] = node
                }}
                tabIndex={-1}
                aria-current={isActiveExercise ? 'true' : undefined}
                className={`motion-enter rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 sm:p-6 ${
                  isActiveExercise
                    ? 'border-blue-300 dark:border-blue-700'
                    : 'border-gray-200 dark:border-gray-700'
                } ${showOnMobile ? '' : 'hidden sm:block'}`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-blue-600 text-xs uppercase dark:text-blue-400">
                      {isActiveExercise ? 'Current exercise' : 'Exercise'}
                    </p>
                    <h3 className="mt-1 font-bold text-gray-900 text-xl dark:text-white">
                      {exerciseName}
                    </h3>
                    <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">
                      {exerciseInWorkout.exercise.category_name} -{' '}
                      {exerciseInWorkout.exercise.equipment || 'No equipment'}
                    </p>
                    {exerciseInWorkout.exercise.primary_muscles.length > 0 && (
                      <p className="mt-1 text-gray-500 text-sm dark:text-gray-500">
                        Primary: {exerciseInWorkout.exercise.primary_muscles.join(', ')}
                      </p>
                    )}
                  </div>
                  <TrashButton
                    label={`Remove ${exerciseName}`}
                    onClick={() => removeExercise(exerciseId)}
                    className="shrink-0"
                  />
                </div>

                {isExerciseComplete ? (
                  <div className="motion-enter rounded-lg border border-green-200 bg-green-50 p-3 text-green-900 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-200">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-green-700 text-xs uppercase dark:text-green-300">
                          Exercise done
                        </p>
                        <p className="mt-1 text-sm text-green-800 dark:text-green-200">
                          Ready for the next exercise.
                        </p>
                      </div>
                      <div className="flex gap-4 text-right text-sm">
                        {completionStats.map((stat, index) => (
                          <span key={`${stat.label}-${index}`}>
                            <strong>{stat.value}</strong>
                            {stat.label && <> {stat.label}</>}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => resumeExercise(exerciseId)}
                      className="motion-press mt-3 min-h-11 w-full rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 font-medium text-blue-700 transition-colors duration-200 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                      aria-label={`Resume ${exerciseName}`}
                    >
                      Resume Exercise
                    </button>
                  </div>
                ) : (
                  <>
                    <LastSetSummary set={previousSet} trackingType={trackingType} />

                    <div className="mt-4">
                      <SetEntry
                        key={`new-set-${exerciseId}-${exerciseInWorkout.sets.length}`}
                        exerciseId={exerciseId}
                        workoutId={session?.id}
                        setNumber={actions.getNextSetNumber(exerciseInWorkout.sets)}
                        previousSet={previousSet}
                        trackingType={trackingType}
                        onSave={(setData) => actions.saveSet(exerciseId, setData)}
                        isActiveEntry={isActiveExercise}
                        submitSignal={submitSignal}
                        useStickyMobileActions={isActiveExercise}
                        className="border-blue-200 shadow-md dark:border-blue-800"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => completeExercise(exerciseId)}
                      disabled={exerciseInWorkout.sets.length === 0}
                      className={`motion-press mt-3 min-h-12 w-full rounded-lg border border-green-300 bg-green-50 px-4 py-3 font-semibold text-green-700 transition-colors duration-200 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-700 dark:bg-green-950/30 dark:text-green-300 dark:hover:bg-green-900/50 ${
                        isActiveExercise ? 'hidden sm:block' : ''
                      }`}
                      aria-label={`Mark ${exerciseName} done`}
                    >
                      Done Exercise
                    </button>

                    <details className="mt-4 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
                      <summary className="motion-press flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 font-semibold text-gray-700 text-sm dark:text-gray-200">
                        <span>Past performance and logged sets</span>
                        <span className="inline-flex items-center gap-2 text-gray-500 text-xs dark:text-gray-400">
                          {exerciseInWorkout.sets.length} sets
                          <svg
                            className="motion-chevron h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </span>
                      </summary>
                      <div className="motion-disclosure-content space-y-4 border-gray-200 border-t p-3 dark:border-gray-700">
                        <div>
                          <h4 className="mb-2 px-1 font-semibold text-gray-700 text-sm dark:text-gray-300">
                            Past Performance
                          </h4>
                          <div className="max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            <ExerciseHistory exerciseId={exerciseId} limit={15} />
                          </div>
                        </div>

                        {exerciseInWorkout.sets.length > 0 && (
                          <div>
                            <h4 className="mb-2 px-1 font-semibold text-gray-700 text-sm dark:text-gray-300">
                              Logged Sets
                            </h4>
                            <div className="space-y-3">
                              {exerciseInWorkout.sets.map((set) => (
                                <SetEntry
                                  key={set.id}
                                  exerciseId={exerciseId}
                                  workoutId={session?.id}
                                  existingSet={set}
                                  setNumber={set.set_number}
                                  trackingType={trackingType}
                                  onSave={(setData) =>
                                    actions.updateSet(exerciseId, set.id, setData)
                                  }
                                  onDelete={() => actions.deleteSet(exerciseId, set.id)}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {isSessionStarted && (
        <div
          id="workout-add-exercise"
          className="motion-enter rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 sm:p-6"
        >
          <h2 className="mb-4 font-semibold text-gray-900 text-lg dark:text-white">Add Exercise</h2>
          <ExerciseSelector
            onSelectExercise={actions.addExercise}
            selectedExercise={selectedExercise}
          />
        </div>
      )}

      {isSessionStarted && exercises.length === 0 && (
        <div className="motion-enter rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-12">
          <svg
            className="mx-auto mb-4 h-16 w-16 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          <h3 className="mb-2 font-medium text-gray-900 text-lg dark:text-white">
            No exercises added yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Add your first exercise to start tracking your workout.
          </p>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel="Cancel"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {isSessionStarted && !session?.end_time && (
        <MobileWorkoutActionBar
          activeExerciseName={activeExerciseName}
          totalSets={totalSets}
          totalVolume={totalVolume}
          hasActiveExercise={Boolean(activeExerciseId)}
          activeExerciseIsComplete={activeExerciseIsComplete}
          activeExerciseHasSets={
            activeExercise?.sets.length ? activeExercise.sets.length > 0 : false
          }
          canCompleteWorkout={totalSets > 0}
          loading={loading}
          onDoneExercise={() => {
            if (activeExerciseId) {
              completeExercise(activeExerciseId)
            }
          }}
          onPrimaryAction={() => {
            if (!activeExerciseId) {
              focusAddExercise()
              return
            }
            if (activeExerciseIsComplete) {
              resumeExercise(activeExerciseId)
              return
            }
            setSubmitSignal((current) => current + 1)
          }}
          onCompleteWorkout={actions.completeSession}
        />
      )}
    </div>
  )
}

function WorkoutExerciseRail({
  exercises,
  activeExerciseId,
  completedExerciseIds,
  onSelectExercise,
}: {
  exercises: ReturnType<typeof useWorkoutSession>['exercises']
  activeExerciseId: string | null
  completedExerciseIds: Set<string>
  onSelectExercise: (exerciseId: string) => void
}) {
  const useTwoRows = exercises.length > 2

  return (
    <nav
      aria-label="Workout exercises"
      className={`scrollbar-none motion-enter sticky top-0 z-20 max-w-full gap-2 overflow-x-auto overscroll-x-contain rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900 sm:hidden ${
        useTwoRows
          ? 'grid auto-cols-[minmax(9.5rem,calc(50vw-1.5rem))] grid-flow-col grid-rows-2'
          : 'flex'
      }`}
    >
      {exercises.map((exerciseInWorkout) => {
        const exerciseId = exerciseInWorkout.exercise.id
        const exerciseName = formatExerciseName(exerciseInWorkout.exercise.name)
        const isActive = activeExerciseId === exerciseId
        const isComplete = completedExerciseIds.has(exerciseId)

        return (
          <button
            key={exerciseId}
            type="button"
            onClick={() => onSelectExercise(exerciseId)}
            aria-pressed={isActive}
            aria-label={`${exerciseName}, ${exerciseInWorkout.sets.length} sets${
              isComplete ? ', done' : ''
            }`}
            className={`motion-press inline-flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-2 font-semibold text-sm transition-colors ${
              useTwoRows ? '' : 'w-[min(18rem,calc(100vw-4rem))] shrink-0'
            } ${
              isActive
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <span className="truncate">{exerciseName}</span>
            <span className="ml-2 inline-flex shrink-0 items-center gap-1">
              <span className="rounded bg-black/10 px-1.5 py-0.5 text-xs">
                {exerciseInWorkout.sets.length}
              </span>
              {isComplete && (
                <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700 text-xs dark:bg-green-900/50 dark:text-green-200">
                  Done
                </span>
              )}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

function MobileWorkoutActionBar({
  activeExerciseName,
  totalSets,
  totalVolume,
  hasActiveExercise,
  activeExerciseIsComplete,
  activeExerciseHasSets,
  canCompleteWorkout,
  loading,
  onDoneExercise,
  onPrimaryAction,
  onCompleteWorkout,
}: {
  activeExerciseName: string
  totalSets: number
  totalVolume: number
  hasActiveExercise: boolean
  activeExerciseIsComplete: boolean
  activeExerciseHasSets: boolean
  canCompleteWorkout: boolean
  loading: boolean
  onDoneExercise: () => void
  onPrimaryAction: () => void
  onCompleteWorkout: () => void
}) {
  const primaryLabel = hasActiveExercise
    ? activeExerciseIsComplete
      ? 'Resume'
      : 'Save Set'
    : 'Add Exercise'

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-gray-200 border-t bg-white px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:hidden">
      <div className="mx-auto max-w-2xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900 text-sm dark:text-white">
              {activeExerciseName}
            </p>
            <p className="text-gray-500 text-xs dark:text-gray-400">
              {totalSets} sets · {totalVolume.toLocaleString()} kg
            </p>
          </div>
          {hasActiveExercise && !activeExerciseIsComplete && activeExerciseHasSets && (
            <button
              type="button"
              onClick={onDoneExercise}
              disabled={loading}
              className="motion-press min-h-11 shrink-0 rounded-lg border border-green-300 bg-green-50 px-3 py-2 font-semibold text-green-700 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-700 dark:bg-green-950/30 dark:text-green-300"
            >
              Done Exercise
            </button>
          )}
          {!hasActiveExercise && canCompleteWorkout && (
            <button
              type="button"
              onClick={onCompleteWorkout}
              disabled={loading}
              className="motion-press min-h-11 shrink-0 rounded-lg border border-green-300 bg-green-50 px-3 py-2 font-semibold text-green-700 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-700 dark:bg-green-950/30 dark:text-green-300"
            >
              Complete Workout
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onPrimaryAction}
          disabled={loading}
          className="motion-press min-h-12 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  )
}

function LastSetSummary({
  set,
  trackingType,
}: {
  set?: WorkoutSet
  trackingType: ExerciseTrackingType
}) {
  if (!set) {
    return (
      <div className="motion-enter rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 font-medium text-blue-700 text-sm dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
        First set for this exercise.
      </div>
    )
  }

  const stats: string[] = []

  if (trackingType === 'strength') {
    if (set.reps) stats.push(`${set.reps} reps`)
    if (set.weight !== undefined) stats.push(`${set.weight} kg`)
  } else if (trackingType === 'cardio') {
    if (set.duration_seconds) stats.push(`${set.duration_seconds / 60} min`)
    if (set.distance_km !== undefined) stats.push(`${set.distance_km} km`)
    if (set.incline !== undefined) stats.push(`incline ${set.incline}`)
    if (set.speed_kmh !== undefined) stats.push(`${set.speed_kmh} km/h`)
  } else {
    if (set.duration_seconds) stats.push(formatDuration(set.duration_seconds))
  }

  if (set.rest_time !== undefined) stats.push(`${formatSetRestTime(set.rest_time)} rest`)

  return (
    <div className="motion-enter rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-3 text-white shadow-sm">
      <p className="font-semibold text-blue-100 text-xs uppercase">Last set</p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-semibold text-sm">
        {stats.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
    </div>
  )
}

function getExerciseCompletionStats(
  sets: WorkoutSet[],
  trackingType: ExerciseTrackingType,
): Array<{ value: string; label: string }> {
  const stats = [{ value: String(sets.length), label: 'sets' }]

  if (trackingType === 'cardio') {
    const durationSeconds = sets.reduce((total, set) => total + (set.duration_seconds ?? 0), 0)
    const distanceKm = sets.reduce((total, set) => total + (set.distance_km ?? 0), 0)
    if (durationSeconds > 0) stats.push({ value: formatDuration(durationSeconds), label: '' })
    if (sets.some((set) => set.distance_km !== undefined)) {
      stats.push({ value: distanceKm.toLocaleString(), label: 'km' })
    }
    return stats
  }

  if (trackingType === 'timed') {
    const durationSeconds = sets.reduce((total, set) => total + (set.duration_seconds ?? 0), 0)
    if (durationSeconds > 0) stats.push({ value: formatDuration(durationSeconds), label: '' })
    return stats
  }

  const exerciseVolume = sets.reduce((total, set) => total + (set.weight || 0) * (set.reps || 0), 0)
  stats.push({ value: exerciseVolume.toLocaleString(), label: 'kg' })
  return stats
}
