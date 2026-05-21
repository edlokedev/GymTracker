import { buildSearchParams, readApiData, readApiSuccess } from '@/lib/api'
import type {
  WorkoutSession,
  WorkoutSessionInput,
  WorkoutSet,
  WorkoutSetInput,
  WorkoutWithDetails,
} from '@/lib/types/database'

export async function loadWorkoutSessionDetails(sessionId: string): Promise<WorkoutWithDetails> {
  const params = buildSearchParams({ id: sessionId, includeDetails: true })
  const response = await fetch(`/api/workout-sessions?${params.toString()}`)
  return readApiData(response, `Failed to load session data: ${response.status}`)
}

export async function createWorkoutSession(data: WorkoutSessionInput): Promise<WorkoutSession> {
  const response = await fetch('/api/workout-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  return readApiData(response, `Failed to create session: ${response.status}`)
}

export async function updateWorkoutSession(
  id: string,
  data: Partial<WorkoutSessionInput>,
): Promise<WorkoutSession> {
  const response = await fetch(`/api/workout-sessions?id=${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  return readApiData(response, `Failed to update session: ${response.status}`)
}

export async function completeWorkoutSession(id: string): Promise<WorkoutSession> {
  const response = await fetch(`/api/workout-sessions?id=${id}&action=complete`, {
    method: 'PATCH',
  })

  return readApiData(response, `Failed to complete session: ${response.status}`)
}

export async function deleteWorkoutSession(id: string): Promise<void> {
  const response = await fetch(`/api/workout-sessions?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })

  await readApiSuccess(response, 'Failed to delete workout')
}

export async function removeExerciseSets(workoutId: string, exerciseId: string): Promise<void> {
  const response = await fetch(
    `/api/workout-sets?${buildSearchParams({ workoutId, exerciseId }).toString()}`,
    {
      method: 'DELETE',
    },
  )

  await readApiSuccess(response, `Failed to remove exercise: ${response.status}`)
}

export async function createWorkoutSet(data: WorkoutSetInput): Promise<WorkoutSet> {
  const response = await fetch('/api/workout-sets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  return readApiData(response, `Failed to save set: ${response.status}`)
}

export async function updateWorkoutSet(id: string, data: WorkoutSetInput): Promise<WorkoutSet> {
  const response = await fetch(`/api/workout-sets?id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  return readApiData(response, `Failed to update set: ${response.status}`)
}

export async function deleteWorkoutSet(id: string): Promise<void> {
  const response = await fetch(`/api/workout-sets?id=${id}`, {
    method: 'DELETE',
  })

  await readApiSuccess(response, `Failed to delete set: ${response.status}`)
}
