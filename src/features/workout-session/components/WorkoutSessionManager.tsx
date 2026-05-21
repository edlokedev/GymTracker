import { useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InlineError } from '@/components/ui/InlineError'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TrashButton } from '@/components/ui/TrashButton'
import { ExerciseHistory } from '@/features/exercise-library/components/ExerciseHistory'
import ExerciseSelector from '@/features/exercise-library/components/ExerciseSelector'
import type { WorkoutSession, WorkoutSet } from '@/lib/types/database'
import { formatExerciseName } from '@/lib/utils/text'
import { useWorkoutSession } from '../useWorkoutSession'
import SetEntry from './SetEntry'

interface WorkoutSessionManagerProps {
  userId: string
  existingSession?: WorkoutSession
  onSessionSave?: (session: WorkoutSession) => void
  onSessionComplete?: (session: WorkoutSession) => void
  onSessionDelete?: (sessionId: string) => void | Promise<void>
  className?: string
}

export default function WorkoutSessionManager({
  userId,
  existingSession,
  onSessionSave,
  onSessionComplete,
  onSessionDelete,
  className = '',
}: WorkoutSessionManagerProps) {
  const workout = useWorkoutSession({
    userId,
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
        const didRemove = await actions.removeExercise(exerciseId)
        if (didRemove) {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        }
      },
    })
  }

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      <div className="motion-enter rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-gray-900 text-xl dark:text-white sm:text-2xl">
              {isSessionStarted ? 'Active Workout' : 'New Workout'}
            </h1>
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
          {exercises.map((exerciseInWorkout) => {
            const previousSet = exerciseInWorkout.sets[exerciseInWorkout.sets.length - 1]

            return (
              <div
                key={exerciseInWorkout.exercise.id}
                className="motion-enter rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 sm:p-6"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-blue-600 text-xs uppercase dark:text-blue-400">
                      Current exercise
                    </p>
                    <h3 className="mt-1 font-bold text-gray-900 text-xl dark:text-white">
                      {formatExerciseName(exerciseInWorkout.exercise.name)}
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
                  <button
                    type="button"
                    onClick={() => removeExercise(exerciseInWorkout.exercise.id)}
                    className="motion-press min-h-11 rounded-lg border border-red-300 bg-red-100 px-3 py-2 font-medium text-red-700 transition-colors duration-200 hover:bg-red-200 dark:border-red-600 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                  >
                    Remove
                  </button>
                </div>

                <LastSetSummary set={previousSet} />

                <div className="mt-4">
                  <SetEntry
                    key={`new-set-${exerciseInWorkout.exercise.id}-${exerciseInWorkout.sets.length}`}
                    exerciseId={exerciseInWorkout.exercise.id}
                    workoutId={session?.id}
                    setNumber={actions.getNextSetNumber(exerciseInWorkout.sets)}
                    previousSet={previousSet}
                    onSave={(setData) => actions.saveSet(exerciseInWorkout.exercise.id, setData)}
                    className="border-blue-200 shadow-md dark:border-blue-800"
                  />
                </div>

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
                        <ExerciseHistory
                          userId={userId}
                          exerciseId={exerciseInWorkout.exercise.id}
                          limit={15}
                        />
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
                              exerciseId={exerciseInWorkout.exercise.id}
                              workoutId={session?.id}
                              existingSet={set}
                              setNumber={set.set_number}
                              onSave={(setData) =>
                                actions.updateSet(exerciseInWorkout.exercise.id, set.id, setData)
                              }
                              onDelete={() =>
                                actions.deleteSet(exerciseInWorkout.exercise.id, set.id)
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )
          })}
        </div>
      )}

      {isSessionStarted && (
        <div className="motion-enter rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 sm:p-6">
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
    </div>
  )
}

function LastSetSummary({ set }: { set?: WorkoutSet }) {
  if (!set) {
    return (
      <div className="motion-enter rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 font-medium text-blue-700 text-sm dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
        First set for this exercise.
      </div>
    )
  }

  return (
    <div className="motion-enter rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-3 text-white shadow-sm">
      <p className="font-semibold text-blue-100 text-xs uppercase">Last set</p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-semibold text-sm">
        <span>{set.reps} reps</span>
        {set.weight !== undefined && <span>{set.weight} kg</span>}
        {set.rest_time !== undefined && <span>{set.rest_time}s rest</span>}
      </div>
    </div>
  )
}
