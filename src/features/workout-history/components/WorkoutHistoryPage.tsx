import { Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth'
import { useWorkoutHistory } from '../useWorkoutHistory'
import { WorkoutHistoryList } from './WorkoutHistoryList'

export function WorkoutHistoryPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const history = useWorkoutHistory({
    userId: user?.id,
    mode: 'history',
    limit: 20,
    onDuplicated: (session) => {
      navigate({ to: '/workout', search: { sessionId: session.id } })
    },
  })

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Please sign in to view your history.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Workout History
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-600 dark:text-gray-400">
              A complete log of all your logged sessions
            </p>
          </div>
          <Link
            to="/"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors hidden sm:block"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
          <WorkoutHistoryList
            history={history}
            emptyTitle="No workout history found."
            emptyActionLabel="Log a Workout"
            showLoadMore
          />
        </div>
      </div>
    </div>
  )
}
