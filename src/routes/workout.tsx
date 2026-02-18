import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import WorkoutSessionManager from '../components/WorkoutSessionManager'
import type { WorkoutSession } from '../lib/database'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/workout')({
  component: WorkoutPage
})

function WorkoutPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(null)

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please sign in to track your workouts
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Sign in with Google to access your workout tracking dashboard
          </p>
          {/* The Header component should handle the sign-in button */}
        </div>
      </div>
    )
  }

  const userId = user.id

  const handleSessionSave = (session: WorkoutSession) => {
    setCurrentSession(session)
    console.log('Session saved:', session)
  }

  const handleSessionComplete = (session: WorkoutSession) => {
    console.log('Session completed:', session)
    // In a real app, you might redirect to a summary page or workout history
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">Log Workout</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
            Track your exercises, sets, reps, and weights
          </p>
        </div>

        <WorkoutSessionManager
          userId={userId}
          existingSession={currentSession || undefined}
          onSessionSave={handleSessionSave}
          onSessionComplete={handleSessionComplete}
        />
      </div>
    </div>
  )
}