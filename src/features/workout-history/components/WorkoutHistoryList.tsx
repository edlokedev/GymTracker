import { Link } from '@tanstack/react-router'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InlineError } from '@/components/ui/InlineError'
import { WorkoutDetailModal } from '@/features/calendar/components/WorkoutDetailModal'
import { WorkoutSessionCard } from '@/features/workout-session/components/WorkoutSessionCard'
import type { useWorkoutHistory } from '../useWorkoutHistory'

type WorkoutHistory = ReturnType<typeof useWorkoutHistory>

interface WorkoutHistoryListProps {
  history: WorkoutHistory
  emptyTitle: string
  emptyDescription?: string
  emptyActionLabel: string
  showLoadMore?: boolean
}

export function WorkoutHistoryList({
  history,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  showLoadMore = false,
}: WorkoutHistoryListProps) {
  const {
    sessions,
    isLoading,
    hasMore,
    error,
    duplicatingId,
    deletingId,
    deleteCandidate,
    deleteCandidateLabel,
    deleteError,
    isModalOpen,
    isModalLoading,
    selectedWorkout,
    selectedDate,
    actions,
  } = history

  return (
    <>
      <InlineError message={error || deleteError} className="mb-4" />

      {sessions.length === 0 && !isLoading ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{emptyTitle}</h3>
          {emptyDescription && (
            <p className="text-gray-600 dark:text-gray-400 mb-4">{emptyDescription}</p>
          )}
          <Link
            to="/workout"
            className="inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            {emptyActionLabel}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <WorkoutSessionCard
              key={session.id}
              session={session}
              isDuplicating={duplicatingId === session.id}
              isDeleting={deletingId === session.id}
              onDuplicate={actions.duplicateSession}
              onDelete={actions.requestDelete}
              onClick={actions.openWorkoutDetails}
            />
          ))}
        </div>
      )}

      {isLoading && (
        <div className="text-center py-6">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      )}

      {showLoadMore && !isLoading && hasMore && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={actions.loadMore}
            className="min-h-11 rounded-full border border-blue-600 px-6 py-2 font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
          >
            Load More
          </button>
        </div>
      )}

      <WorkoutDetailModal
        isOpen={isModalOpen}
        onClose={actions.closeDetailModal}
        workout={selectedWorkout}
        selectedDate={selectedDate}
        isLoading={isModalLoading}
        onWorkoutDeleted={actions.removeDeletedSession}
        onDuplicateWorkout={(workoutId) =>
          actions.duplicateSession(workoutId).then(() => undefined)
        }
        onDeleteWorkout={actions.deleteSession}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteCandidate)}
        title="Delete Workout"
        description={`Delete "${deleteCandidateLabel}"? This will permanently remove the workout and all of its sets.`}
        confirmLabel={deletingId ? 'Deleting...' : 'Delete Workout'}
        isConfirming={Boolean(deletingId)}
        onConfirm={actions.confirmDelete}
        onCancel={actions.cancelDelete}
      >
        <InlineError message={deleteError} />
      </ConfirmDialog>
    </>
  )
}
