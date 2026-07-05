import { queryOptions } from '@tanstack/react-query'
import { buildSearchParams, readApiData, readApiSuccess } from '@/lib/api'
import { queryKeys } from '@/lib/api/query-keys'
import type {
  StartFromTemplateResult,
  WorkoutSession,
  WorkoutSessionInput,
  WorkoutSet,
  WorkoutSetInput,
  WorkoutWithDetails,
} from '@/lib/types/database'
import { getLocalCalendarDate } from '@/lib/utils/calendar'

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

/**
 * Query options for the active-session bootstrap (ADR-0007, Phase 4), keyed
 * `['workout-sessions','detail',sessionId]`. The hook seeds its local in-flight
 * editing state from this query's data — Query owns the server read, local state
 * owns keystroke-level set entry (never in the cache).
 */
export function workoutSessionDetailOptions(sessionId: string) {
  return queryOptions({
    queryKey: queryKeys.workoutSessions.detail(sessionId),
    queryFn: () => loadWorkoutSessionDetails(sessionId),
  })
}

/**
 * Query options for an exercise's set history (ADR-0007, Phase 4), keyed
 * `['workout-sets','history',exerciseId]`. Used for last-performance prefill via
 * `queryClient.fetchQuery` — Query's per-key request identity + dedupe retires
 * the hand-rolled `prefillRequestRef` monotonic race token: a prefill result is
 * keyed by exercise id, so a session switch mid-flight can only ever resolve to
 * the correct last-performance for that exercise. `limit` is part of the key so
 * a 1-item prefill and a 15-item history view don't collide.
 */
export function workoutSetHistoryOptions(exerciseId: string, limit = 1) {
  return queryOptions({
    queryKey: [...queryKeys.workoutSets.history(exerciseId), limit] as const,
    queryFn: () => loadWorkoutSetHistory(exerciseId, limit),
  })
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
    // Send the client's local calendar day so the new session is dated "today"
    // for the user, not the UTC/Vercel day.
    body: JSON.stringify({ templateId, date: getLocalCalendarDate() }),
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

// "Change exercise": repoint every set logged for `fromExerciseId` in this
// workout to `toExerciseId`. Atomic + collision-checked server-side; returns
// the changed set ids. A 409 (target already in workout) surfaces as a thrown
// error from readApiData.
export async function changeExerciseSets(
  workoutId: string,
  fromExerciseId: string,
  toExerciseId: string,
): Promise<{ repointed: number; setIds: string[] }> {
  const response = await fetch(
    `/api/workout-sets?${buildSearchParams({ workoutId, fromExerciseId, toExerciseId }).toString()}`,
    {
      method: 'PATCH',
    },
  )

  return readApiData(response, `Failed to change exercise: ${response.status}`)
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
