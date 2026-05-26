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

  const sessionLabel = session.name || 'workout'

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
          aria-label={`Edit ${sessionLabel}`}
          title={`Edit ${sessionLabel}`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40"
        >
          <EditIcon className="h-5 w-5" />
          <span className="sr-only">Edit {sessionLabel}</span>
        </Link>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDuplicate(session.id)
          }}
          disabled={isDuplicating}
          aria-label={isDuplicating ? `Duplicating ${sessionLabel}` : `Duplicate ${sessionLabel}`}
          aria-busy={isDuplicating}
          title={isDuplicating ? `Duplicating ${sessionLabel}` : `Duplicate ${sessionLabel}`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-700 transition-colors hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/40"
        >
          <DuplicateIcon className={isDuplicating ? 'h-5 w-5 animate-pulse' : 'h-5 w-5'} />
          <span className="sr-only">
            {isDuplicating ? `Duplicating ${sessionLabel}` : `Duplicate ${sessionLabel}`}
          </span>
        </button>
        <TrashButton
          label={`Delete ${sessionLabel}`}
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

function EditIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function DuplicateIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <rect width="13" height="13" x="9" y="9" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}
