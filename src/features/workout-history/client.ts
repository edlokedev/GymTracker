import { buildSearchParams, readApiData, readApiSuccess } from '@/lib/api'
import type { WorkoutSessionWithSets } from '@/lib/types/calendar'
import type { PaginatedResult, WorkoutSession } from '@/lib/types/database'
import type { SelectedWorkout } from './model'

export async function loadWorkoutHistorySessions({
  userId,
  limit,
  offset,
}: {
  userId: string
  limit: number
  offset?: number
}): Promise<PaginatedResult<WorkoutSession>> {
  const params = buildSearchParams({ userId, limit, offset })
  const response = await fetch(`/api/workout-sessions?${params.toString()}`)
  return readApiData(response, `Failed to load workout history: ${response.status}`)
}

export async function loadWorkoutDetailsForSession({
  userId,
  session,
}: {
  userId: string
  session: WorkoutSession
}): Promise<SelectedWorkout | null> {
  const params = buildSearchParams({ userId, date: session.date })
  const response = await fetch(`/api/workout-details?${params.toString()}`)
  const workouts = await readApiData<WorkoutSessionWithSets[]>(
    response,
    `Failed to load workout details: ${response.status}`,
    { fallbackData: [] },
  )

  return (workouts.find((workout) => workout.id === session.id) ||
    workouts[0] ||
    null) as SelectedWorkout | null
}

export async function duplicateWorkoutHistorySession(sessionId: string): Promise<WorkoutSession> {
  const params = buildSearchParams({
    action: 'duplicate',
    duplicateId: sessionId,
  })
  const response = await fetch(`/api/workout-sessions?${params.toString()}`, {
    method: 'POST',
  })
  return readApiData(response, `Failed to duplicate workout: ${response.status}`)
}

export async function deleteWorkoutHistorySession(sessionId: string): Promise<void> {
  const params = buildSearchParams({ id: sessionId })
  const response = await fetch(`/api/workout-sessions?${params.toString()}`, {
    method: 'DELETE',
  })

  await readApiSuccess(response, 'Failed to delete workout')
}
