import type { WorkoutSessionWithSets } from '@/lib/types/calendar'
import type { WorkoutSession } from '@/lib/types/database'

export type SelectedWorkout = WorkoutSessionWithSets & { name?: string }

export type WorkoutHistoryMode = 'history' | 'recent'

export function formatWorkoutDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function getDeleteCandidateLabel(session: WorkoutSession | null): string {
  if (!session) return 'this workout'

  const sessionName = session.name?.trim()
  if (sessionName) return sessionName

  return `workout from ${formatWorkoutDate(session.date)}`
}

export function removeSessionById(sessions: WorkoutSession[], sessionId: string): WorkoutSession[] {
  return sessions.filter((session) => session.id !== sessionId)
}

export function getLastWorkoutDate(sessions: WorkoutSession[]): Date | null {
  if (sessions.length === 0) return null
  return new Date(sessions[0].date)
}

export function getTimeSinceLastWorkout(
  lastWorkoutDate: Date | null,
  now = new Date(),
): string | null {
  if (!lastWorkoutDate) return null

  const diff = now.getTime() - lastWorkoutDate.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}
