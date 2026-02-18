import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '../lib/auth'
import LoginPage from '../components/LoginPage'
import WorkoutDashboard from '../components/WorkoutDashboard'
import { CalendarDashboard } from '../components/calendar/CalendarDashboard'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'workout' | 'calendar'>('calendar')

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login page for unauthenticated users
  if (!isAuthenticated) {
    return <LoginPage />
  }

  // Show dashboard for authenticated users with tabs
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gym Tracker Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Track your workouts, view progress, and stay motivated
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex">
              <button
                onClick={() => setActiveTab('calendar')}
                className={`flex-1 px-6 py-3 text-sm font-medium rounded-l-lg transition-colors ${
                  activeTab === 'calendar'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h6m-6 0a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V9a2 2 0 00-2-2m-6 0h6" />
                  </svg>
                  <span>Calendar View</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('workout')}
                className={`flex-1 px-6 py-3 text-sm font-medium rounded-r-lg transition-colors ${
                  activeTab === 'workout'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Workout Log</span>
                </div>
              </button>
            </div>
          </nav>
        </div>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {activeTab === 'calendar' ? (
            <CalendarDashboard />
          ) : (
            <WorkoutDashboard />
          )}
        </div>
      </div>
    </div>
  )
}
