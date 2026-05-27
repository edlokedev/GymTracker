import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import LoginPage from '@/features/auth/components/LoginPage'
import { CalendarDashboardContent } from '@/features/calendar/components/CalendarDashboard'
import { useCalendarData } from '@/features/calendar/useCalendarData'
import WorkoutDashboard, {
  WorkoutDashboardOverview,
} from '@/features/workout-session/components/WorkoutDashboard'
import { useAuth } from '@/lib/auth'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const [activeTab, setActiveTab] = useState<'workout' | 'calendar'>('calendar')
  const calendar = useCalendarData(user?.id || '')

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <WorkoutDashboardOverview
          className="mb-6"
          summaryStats={calendar.state.summaryStats}
          isSummaryLoading={calendar.state.isLoading}
        />

        <div className="mb-6">
          <nav className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex">
              <button
                onClick={() => setActiveTab('calendar')}
                className={`flex-1 cursor-pointer rounded-l-lg px-6 py-3 font-medium text-sm transition-colors ${
                  activeTab === 'calendar'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4m-6 0V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1m-6 0h6m-6 0a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2m-6 0h6"
                    />
                  </svg>
                  <span>Calendar View</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('workout')}
                className={`flex-1 cursor-pointer rounded-r-lg px-6 py-3 font-medium text-sm transition-colors ${
                  activeTab === 'workout'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"
                    />
                  </svg>
                  <span>Workout Log</span>
                </div>
              </button>
            </div>
          </nav>
        </div>

        <div className="dashboard-content">
          {activeTab === 'calendar' ? (
            <CalendarDashboardContent calendar={calendar} user={user} showSummaryStats={false} />
          ) : (
            <WorkoutDashboard showOverview={false} className="bg-transparent" />
          )}
        </div>
      </div>
    </div>
  )
}
