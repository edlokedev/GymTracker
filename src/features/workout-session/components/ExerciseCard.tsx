import { memo, type RefObject } from 'react'
import { TrashButton } from '@/components/ui/TrashButton'
import { ExerciseHistory } from '@/features/exercise-library/components/ExerciseHistory'
import type { WorkoutSet } from '@/lib/types/database'
import { type ExerciseTrackingType, getTrackingType } from '@/lib/utils/exercise-tracking'
import { formatExerciseName } from '@/lib/utils/text'
import { type ExerciseInWorkout, getNextSetNumber } from '../model'
import { formatDuration, formatSetRestTime } from '../setEntry'
import type { useWorkoutSession } from '../useWorkoutSession'
import SetEntry from './SetEntry'

type WorkoutActions = ReturnType<typeof useWorkoutSession>['actions']
export interface ExerciseCardActions {
  startChangeExercise: (id: string) => void
  removeExercise: (id: string) => void
  resumeExercise: (id: string) => void
  completeExercise: (id: string) => void
  saveSet: WorkoutActions['saveSet']
  updateSet: WorkoutActions['updateSet']
  deleteSet: WorkoutActions['deleteSet']
}

export default memo(function ExerciseCard({
  exerciseInWorkout,
  lastPerformanceSet,
  isExerciseComplete,
  isActiveExercise,
  showOnMobile,
  historyOpened,
  sessionId,
  submitSignal,
  exerciseRefs,
  cardActions,
  setHistoryOpenedIds,
}: {
  exerciseInWorkout: ExerciseInWorkout
  lastPerformanceSet: WorkoutSet | undefined
  isExerciseComplete: boolean
  isActiveExercise: boolean
  showOnMobile: boolean
  historyOpened: boolean
  sessionId: string | undefined
  submitSignal: number
  exerciseRefs: RefObject<Record<string, HTMLDivElement | null>>
  cardActions: RefObject<ExerciseCardActions>
  setHistoryOpenedIds: React.Dispatch<React.SetStateAction<Set<string>>>
}) {
  const previousSet = exerciseInWorkout.sets[exerciseInWorkout.sets.length - 1]
  const exerciseId = exerciseInWorkout.exercise.id
  const setDefaults = previousSet ?? lastPerformanceSet
  const exerciseName = formatExerciseName(exerciseInWorkout.exercise.name)
  const trackingType = getTrackingType({
    trackingType: exerciseInWorkout.exercise.tracking_type,
    categoryName: exerciseInWorkout.exercise.category_name,
    force: exerciseInWorkout.exercise.force,
  })
  const completionStats = getExerciseCompletionStats(exerciseInWorkout.sets, trackingType)
  return (
    <div
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
          <h3 className="mt-1 font-bold text-gray-900 text-xl dark:text-white">{exerciseName}</h3>
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
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => cardActions.current.startChangeExercise(exerciseId)}
            className="motion-press inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-3 py-2 font-medium text-gray-700 text-sm transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            aria-label={`Change ${exerciseName}`}
          >
            Change
          </button>
          <TrashButton
            label={`Remove ${exerciseName}`}
            onClick={() => cardActions.current.removeExercise(exerciseId)}
          />
        </div>
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
            onClick={() => cardActions.current.resumeExercise(exerciseId)}
            className="motion-press mt-3 min-h-11 w-full rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 font-medium text-blue-700 transition-colors duration-200 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
            aria-label={`Resume ${exerciseName}`}
          >
            Resume Exercise
          </button>
        </div>
      ) : (
        <>
          <LastSetSummary
            set={setDefaults}
            trackingType={trackingType}
            source={previousSet ? 'current-workout' : 'history'}
          />

          <div className="mt-4">
            <SetEntry
              key={`new-set-${exerciseId}-${exerciseInWorkout.sets.length}`}
              exerciseId={exerciseId}
              workoutId={sessionId}
              setNumber={getNextSetNumber(exerciseInWorkout.sets)}
              previousSet={setDefaults}
              trackingType={trackingType}
              onSave={(setData) => cardActions.current.saveSet(exerciseId, setData)}
              isActiveEntry={isActiveExercise}
              submitSignal={submitSignal}
              useStickyMobileActions={isActiveExercise}
              className="border-blue-200 shadow-md dark:border-blue-800"
            />
          </div>

          <button
            type="button"
            onClick={() => cardActions.current.completeExercise(exerciseId)}
            disabled={exerciseInWorkout.sets.length === 0}
            className={`motion-press mt-3 min-h-12 w-full rounded-lg border border-green-300 bg-green-50 px-4 py-3 font-semibold text-green-700 transition-colors duration-200 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-700 dark:bg-green-950/30 dark:text-green-300 dark:hover:bg-green-900/50 ${
              isActiveExercise ? 'hidden sm:block' : ''
            }`}
            aria-label={`Mark ${exerciseName} done`}
          >
            Done Exercise
          </button>

          <details
            onToggle={(event) => {
              if (!event.currentTarget.open) return
              setHistoryOpenedIds((current) =>
                current.has(exerciseId) ? current : new Set(current).add(exerciseId),
              )
            }}
            className="mt-4 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40"
          >
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
                  {historyOpened && <ExerciseHistory exerciseId={exerciseId} limit={15} />}
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
                        workoutId={sessionId}
                        existingSet={set}
                        setNumber={set.set_number}
                        trackingType={trackingType}
                        onSave={(setData) =>
                          cardActions.current.updateSet(exerciseId, set.id, setData)
                        }
                        onDelete={() => cardActions.current.deleteSet(exerciseId, set.id)}
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
})

function LastSetSummary({
  set,
  trackingType,
  source = 'current-workout',
}: {
  set?: WorkoutSet
  trackingType: ExerciseTrackingType
  source?: 'current-workout' | 'history'
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
    if (set.duration_seconds)
      stats.push(`${Math.round((set.duration_seconds / 60) * 100) / 100} min`)
    if (set.distance_km !== undefined) stats.push(`${set.distance_km} km`)
    if (set.incline !== undefined) stats.push(`incline ${set.incline}`)
    if (set.speed_kmh !== undefined) stats.push(`${set.speed_kmh} km/h`)
  } else {
    if (set.duration_seconds) stats.push(formatDuration(set.duration_seconds))
  }

  if (set.rest_time !== undefined) stats.push(`${formatSetRestTime(set.rest_time)} rest`)

  return (
    <div className="motion-enter rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-3 text-white shadow-sm">
      <p className="font-semibold text-blue-100 text-xs uppercase">
        {source === 'history' ? 'Last performance' : 'Last set'}
      </p>
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
