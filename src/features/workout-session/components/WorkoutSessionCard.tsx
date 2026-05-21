import { Link } from '@tanstack/react-router'
import { TrashButton } from '@/components/ui/TrashButton'
import type { WorkoutSession } from '@/lib/types/database'

export interface WorkoutSessionCardProps {
  session: WorkoutSession
  isDuplicating: boolean
  isDeleting?: boolean
  onDuplicate: (sessionId: string) => void
  onDelete: (session: WorkoutSession) => void
  onClick: (session: WorkoutSession) => void
}

export function WorkoutSessionCard({
  session,
  isDuplicating,
  isDeleting = false,
  onDuplicate,
  onDelete,
  onClick,
}: WorkoutSessionCardProps) {
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div
      onClick={() => onClick(session)}
      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors gap-4 sm:gap-0 cursor-pointer"
    >
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white">
          {session.name || `Workout ${formatDate(session.date)}`}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 sm:mt-0">
          {formatDate(session.date)}
          {session.end_time && (
            <span className="ml-2 text-green-600 dark:text-green-400">✓ Completed</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          to="/workout"
          search={{ sessionId: session.id }}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex min-h-11 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40"
        >
          Edit
        </Link>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDuplicate(session.id)
          }}
          disabled={isDuplicating}
          className="inline-flex min-h-11 items-center rounded-lg border border-purple-200 bg-purple-50 px-3 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100 disabled:opacity-50 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/40"
        >
          {isDuplicating ? 'Duplicating...' : 'Duplicate'}
        </button>
        <TrashButton
          label={`Delete ${session.name || 'workout'}`}
          onClick={(e) => {
            e.stopPropagation()
            onDelete(session)
          }}
          disabled={isDeleting || isDuplicating}
        />
        <div className="text-right hidden sm:block ml-2 w-[70px]">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {session.start_time &&
              new Date(session.start_time).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
          </p>
        </div>
      </div>
    </div>
  )
}
