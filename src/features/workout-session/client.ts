import { buildSearchParams, readApiData, readApiSuccess } from '@/lib/api'
import type {
  StartFromTemplateResult,
  WorkoutSession,
  WorkoutSessionInput,
  WorkoutSet,
  WorkoutSetInput,
  WorkoutWithDetails,
} from '@/lib/types/database'

export type WorkoutSessionWriteInput = Omit<WorkoutSessionInput, 'user_id'>

export interface WorkoutSetHistoryItem {
  id: string
  set_number: number
  reps: number
  weight: number
  duration_seconds?: number
  distance_km?: number
  incline?: number
  speed_kmh?: number
  session_date: string
  session_name: string | null
}

export async function loadWorkoutSessionDetails(sessionId: string): Promise<WorkoutWithDetails> {
  const params = buildSearchParams({ id: sessionId, includeDetails: true })
  const response = await fetch(`/api/workout-sessions?${params.toString()}`)
  return readApiData(response, `Failed to load session data: ${response.status}`)
}

export async function createWorkoutSession(
  data: WorkoutSessionWriteInput,
): Promise<WorkoutSession> {
  const response = await fetch('/api/workout-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  return readApiData(response, `Failed to create session: ${response.status}`)
}

export async function startWorkoutSessionFromTemplate(
  templateId: string,
): Promise<StartFromTemplateResult> {
  const params = buildSearchParams({ action: 'startFromTemplate' })
  const response = await fetch(`/api/workout-sessions?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId }),
  })

  return readApiData(response, `Failed to start template workout: ${response.status}`)
}

export async function updateWorkoutSession(
  id: string,
  data: Partial<WorkoutSessionWriteInput>,
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

export async function fetchLocationNames(): Promise<string[]> {
  const response = await fetch('/api/workout-locations')
  return readApiData(response, `Failed to load location names: ${response.status}`, {
    fallbackData: [],
  })
}

export async function loadWorkoutSetHistory(
  exerciseId: string,
  limit = 1,
): Promise<WorkoutSetHistoryItem[]> {
  const params = buildSearchParams({
    action: 'history',
    exerciseId,
    limit,
  })
  const response = await fetch(`/api/workout-sets?${params.toString()}`)

  return readApiData(response, `Failed to load set history: ${response.status}`, {
    fallbackData: [],
  })
}
