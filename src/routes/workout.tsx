import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import LoginPage from '@/features/auth/components/LoginPage'
import WorkoutSessionManager from '@/features/workout-session/components/WorkoutSessionManager'
import { getLocalCalendarDate } from '@/lib/utils/calendar'
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

export function WorkoutPage() {
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
      date: getLocalCalendarDate(now),
      start_time: now.toISOString(),
      created_at: now,
      updated_at: now,
    })
  }, [sessionId, user, currentSession?.id])

  // Mirror index.tsx: render the dashboard shell + skeleton while auth
  // resolves so first paint isn't blank and the layout doesn't shift.
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 h-28 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
          <div className="h-96 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
          <span className="sr-only">Loading your workout…</span>
        </div>
      </div>
    )
  }

  // Signed-out visitors get the shared login page (matching index.tsx),
  // instead of a dead-end prompt with no sign-in control.
  if (!isAuthenticated || !user) {
    return <LoginPage />
  }

  const handleSessionSave = (session: WorkoutSession) => {
    if (isStartingTemplate) return
    setCurrentSession(session)
  }

  const handleSessionComplete = (_session: WorkoutSession) => {}

  // Heading reflects whether this is a new session or an editor view.
  const isEditing = Boolean(sessionId)
  const isStartingTemplate = Boolean(templateId && !sessionId)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
            {isEditing ? 'Edit Workout' : isStartingTemplate ? 'Start Workout' : 'Log Workout'}
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
