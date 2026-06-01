import { Link } from '@tanstack/react-router'
import { type MouseEvent, useEffect } from 'react'
import { DuplicateIcon, EditIcon } from '@/components/ui/ActionIcons'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InlineError } from '@/components/ui/InlineError'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { TrashButton } from '@/components/ui/TrashButton'
import {
  formatWorkoutDetailDate,
  formatWorkoutDuration,
  formatWorkoutSummaryDate,
  getWorkoutDetailLabel,
  getWorkoutSetMetricColumns,
  getWorkoutSetMetricValue,
  getWorkoutTotalVolume,
  groupWorkoutSetsByExercise,
  type WorkoutDetailWorkout,
} from '@/features/workout-detail/model'
import { useWorkoutDetailActions } from '@/features/workout-detail/useWorkoutDetailActions'

interface WorkoutDetailModalProps {
  isOpen: boolean
  onClose: () => void
  workout?: WorkoutDetailWorkout | null
  selectedDate?: Date | null
  isLoading: boolean
  onWorkoutDeleted?: (workoutId: string) => void | Promise<void>
  onDuplicateWorkout?: (workoutId: string) => void | Promise<void>
  onDeleteWorkout?: (workoutId: string) => void | Promise<void>
}

export function WorkoutDetailModal({
  isOpen,
  onClose,
  workout,
  selectedDate,
  isLoading,
  onWorkoutDeleted,
  onDuplicateWorkout,
  onDeleteWorkout,
}: WorkoutDetailModalProps) {
  const detail = useWorkoutDetailActions({
    isOpen,
    onClose,
    onWorkoutDeleted,
    onDuplicateWorkout,
    onDeleteWorkout,
  })

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const stopModalClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  const handleDuplicate = async () => {
    if (!workout) return
    await detail.actions.duplicateWorkout(workout.id)
  }

  const handleDelete = async () => {
    if (!workout) return
    detail.actions.requestDelete()
  }

  const confirmDelete = async () => {
    if (!workout) return
    await detail.actions.confirmDelete(workout.id)
  }

  const workoutLabel = getWorkoutDetailLabel(workout)
  const exerciseGroups = workout ? groupWorkoutSetsByExercise(workout.sets) : []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[calc(100dvh_-_1.5rem_-_env(safe-area-inset-bottom))] w-full max-w-2xl flex-col overflow-hidden rounded-xl border shadow-2xl sm:max-h-[85dvh]"
        onClick={stopModalClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workout-detail-title"
        style={{
          background: 'var(--color-surface-primary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="h-1 w-full" style={{ background: 'var(--gradient-primary)' }} />

        <div
          className="flex flex-shrink-0 items-center justify-between border-b p-4 sm:p-6"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-surface-elevated)',
          }}
        >
          <div className="min-w-0">
            <h2
              id="workout-detail-title"
              className="truncate bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 bg-clip-text text-2xl font-bold text-transparent dark:from-blue-300 dark:via-sky-300 dark:to-cyan-200"
            >
              {workout?.name || 'Workout Details'}
            </h2>
            {selectedDate && (
              <p className="mt-1 text-sm font-medium text-gray-600 dark:text-slate-300">
                {workout?.name && 'Workout Details - '}
                {formatWorkoutDetailDate(selectedDate)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md transition-colors hover:scale-105 hover:bg-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:hover:bg-slate-800/70"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Close workout details"
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

        <ScrollArea
          className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"
          style={{ background: 'var(--color-surface-primary)' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                Loading workout details...
              </span>
            </div>
          ) : !workout ? (
            <div className="text-center py-8">
              <div className="text-gray-400 dark:text-gray-600 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 12h6M9 16h6M9 8h6M3 12a9 9 0 1118 0 9 9 0 01-18 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No workout found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No workout data available for this date.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 border border-blue-100/70 dark:border-indigo-900/40 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Date
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                      {formatWorkoutSummaryDate(workout.date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Duration
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                      {formatWorkoutDuration(workout.duration)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Total Sets
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                      {workout.sets.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Total Volume
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                      {Math.round(getWorkoutTotalVolume(workout))} kg
                    </p>
                  </div>
                </div>

                {workout.notes && (
                  <div className="mt-4 pt-4 border-t border-blue-200/60 dark:border-indigo-800/60">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Workout Notes
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white">{workout.notes}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Exercises
                </h3>

                {exerciseGroups.map((group) => {
                  const metricColumns = getWorkoutSetMetricColumns(group.sets)

                  return (
                    <div key={group.exerciseId} className="mb-6 last:mb-0">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                        {group.exerciseName}
                      </h4>

                      <div className="bg-white/90 dark:bg-gray-900/80 rounded-xl border border-gray-200/70 dark:border-gray-700/60 overflow-hidden shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
                        <table className="w-full">
                          <thead className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 dark:from-blue-600/20 dark:via-indigo-600/20 dark:to-purple-600/20">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                Set
                              </th>
                              {metricColumns.map((column) => (
                                <th
                                  key={column.key}
                                  className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide"
                                >
                                  {column.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200/70 dark:divide-gray-700/60">
                            {group.sets.map((set, index) => (
                              <tr key={set.id}>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                  {index + 1}
                                </td>
                                {metricColumns.map((column) => (
                                  <td
                                    key={column.key}
                                    className="px-4 py-2 text-sm text-gray-900 dark:text-white"
                                  >
                                    {getWorkoutSetMetricValue(set, column.key)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {group.sets.find((set) => set.notes) && (
                        <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 rounded-lg border border-blue-100/60 dark:border-indigo-900/40">
                          <p className="text-xs font-medium text-blue-800 dark:text-blue-400 mb-1">
                            Notes:
                          </p>
                          {group.sets
                            .filter((set) => set.notes)
                            .map((set) => (
                              <p key={set.id} className="text-sm text-blue-700 dark:text-blue-300">
                                Set {group.sets.indexOf(set) + 1}: {set.notes}
                              </p>
                            ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="flex flex-shrink-0 flex-col gap-3 border-t border-gray-200/70 bg-white/80 p-4 pb-[max(env(safe-area-inset-bottom),1rem)] backdrop-blur dark:border-gray-700/70 dark:bg-gray-900/80 sm:flex-row sm:items-center sm:p-6">
          <InlineError message={detail.duplicateError} />

          {workout && (
            <div className="flex w-full items-center justify-end gap-3">
              <Link
                to="/workout"
                search={{ sessionId: workout.id }}
                onClick={(event) => {
                  if (detail.isDeleting) {
                    event.preventDefault()
                  }
                }}
                aria-disabled={detail.isDeleting}
                aria-label={`Edit ${workoutLabel}`}
                title={`Edit ${workoutLabel}`}
                className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40"
              >
                <EditIcon className="h-5 w-5" />
                <span className="sr-only">Edit {workoutLabel}</span>
              </Link>
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={detail.isDuplicating || detail.isDeleting}
                aria-busy={detail.isDuplicating}
                aria-label={
                  detail.isDuplicating ? `Duplicating ${workoutLabel}` : `Duplicate ${workoutLabel}`
                }
                title={
                  detail.isDuplicating ? `Duplicating ${workoutLabel}` : `Duplicate ${workoutLabel}`
                }
                className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-700 transition-colors hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/40"
              >
                <DuplicateIcon
                  className={detail.isDuplicating ? 'h-5 w-5 animate-pulse' : 'h-5 w-5'}
                />
                <span className="sr-only">
                  {detail.isDuplicating
                    ? `Duplicating ${workoutLabel}`
                    : `Duplicate ${workoutLabel}`}
                </span>
              </button>
              <TrashButton
                onClick={handleDelete}
                disabled={detail.isDeleting || detail.isDuplicating}
                aria-busy={detail.isDeleting}
                label="Delete workout"
                className="justify-self-end"
              />
            </div>
          )}
        </div>

        <ConfirmDialog
          isOpen={detail.isDeleteDialogOpen}
          title="Delete Workout"
          description={`Delete "${workoutLabel}"? This will permanently remove the workout and all of its sets.`}
          confirmLabel={detail.isDeleting ? 'Deleting...' : 'Delete Workout'}
          isConfirming={detail.isDeleting}
          onConfirm={confirmDelete}
          onCancel={detail.actions.cancelDelete}
        >
          <InlineError message={detail.deleteError} />
        </ConfirmDialog>
      </div>
    </div>
  )
}
