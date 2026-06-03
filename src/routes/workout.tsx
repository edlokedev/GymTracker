import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import WorkoutSessionManager from '@/features/workout-session/components/WorkoutSessionManager'
import { useAuth } from '../lib/auth'
import type { WorkoutSession } from '../lib/types/database'

interface WorkoutSearch {
  sessionId?: string
  templateId?: string
}

export const Route = createFileRoute('/workout')({
  // Validate / coerce the `?sessionId=` search param so this page can be
  // entered as a workout *editor* from the History list, the Workout
  // Details modal, or the Workout dashboard. Without this the route
  // silently dropped the param and always opened the "New Workout" form.
  validateSearch: (raw: Record<string, unknown>): WorkoutSearch => {
    const id = raw.sessionId
    const templateId = raw.templateId
    return {
      ...(typeof id === 'string' && id.length > 0 ? { sessionId: id } : {}),
      ...(typeof templateId === 'string' && templateId.length > 0 ? { templateId } : {}),
    }
  },
  component: WorkoutPage,
})

function WorkoutPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { sessionId, templateId } = Route.useSearch()
  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(null)

  // When the page is opened with ?sessionId=... we seed `currentSession`
  // with just enough scaffolding for the editor to hydrate. The full
  // session (name/date/notes/sets/exercises) is fetched on the next tick
  // by useWorkoutSession via GET /api/workout-sessions?id=...&includeDetails=true,
  // so a few hundred ms of empty fields is the worst case here.
  useEffect(() => {
    if (!sessionId || !user) return
    if (currentSession?.id === sessionId) return
    const now = new Date()
    setCurrentSession({
      id: sessionId,
      user_id: user.id,
      date: now.toISOString().slice(0, 10),
      start_time: now.toISOString(),
      created_at: now,
      updated_at: now,
    })
  }, [sessionId, user, currentSession?.id])

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

  const handleSessionSave = (session: WorkoutSession) => {
    setCurrentSession(session)
    console.log('Session saved:', session)
  }

  const handleSessionComplete = (session: WorkoutSession) => {
    console.log('Session completed:', session)
    // In a real app, you might redirect to a summary page or workout history
  }

  // Heading reflects whether this is a new session or an editor view.
  const isEditing = Boolean(sessionId)
  const isStartingTemplate = Boolean(templateId && !sessionId)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
            {isEditing ? 'Edit Workout' : isStartingTemplate ? 'Start Template' : 'Log Workout'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
            Track your exercises, sets, reps, and weights
          </p>
        </div>

        <WorkoutSessionManager
          existingSession={currentSession || undefined}
          initialTemplateId={isStartingTemplate ? templateId : undefined}
          onSessionSave={handleSessionSave}
          onSessionComplete={handleSessionComplete}
        />
      </div>
    </div>
  )
}
