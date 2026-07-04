import { queryOptions } from '@tanstack/react-query'
import { buildSearchParams, readApiData, readApiSuccess } from '@/lib/api'
import { queryKeys } from '@/lib/api/query-keys'
import type { WorkoutSessionWithSets } from '@/lib/types/calendar'
import type { PaginatedResult, WorkoutSession } from '@/lib/types/database'
import { getLocalCalendarDate } from '@/lib/utils/calendar'
import type { SelectedWorkout } from './model'

async function fetchWorkoutHistoryPage({
  limit,
  offset,
  locationName,
}: {
  limit: number
  offset?: number
  locationName?: string
}): Promise<PaginatedResult<WorkoutSession>> {
  const params = buildSearchParams({ limit, offset, location_name: locationName })
  const response = await fetch(`/api/workout-sessions?${params.toString()}`)
  return readApiData<PaginatedResult<WorkoutSession>>(
    response,
    `Failed to load workout history: ${response.status}`,
  )
}

/**
 * Query options for the FIRST page of the workout-sessions list (ADR-0007,
 * Phase 2). Keyed by `{ limit, locationName }` via `queryKeys.workoutSessions.list`
 * — the offset is intentionally excluded so a filter change produces a distinct
 * cache entry and TanStack Query guarantees last-request-wins, retiring the
 * hand-rolled stale-response race in the old `loadSessions` (audit finding: the
 * only race guard `prefillRequestRef` lived in one place; history had none).
 *
 * Subsequent pages ("load more") are fetched imperatively via
 * `fetchWorkoutHistoryPage` and appended in the hook — they extend, not replace,
 * the rendered list, so they are not a race site.
 */
export function workoutHistoryListOptions({
  limit,
  locationName,
}: {
  limit: number
  locationName?: string
}) {
  return queryOptions({
    queryKey: queryKeys.workoutSessions.list({ limit, locationName }),
    queryFn: () => fetchWorkoutHistoryPage({ limit, offset: 0, locationName }),
  })
}

export { fetchWorkoutHistoryPage as loadWorkoutHistoryPage }

/**
 * Query options for a single session's detail (ADR-0007, Phase 2), keyed
 * `['workout-sessions','detail',sessionId]`.
 *
 * The detail endpoint returns every session on `session.date`; this selects the
 * one whose id matches. If the requested id is absent it returns `null` — the
 * old `loadWorkoutDetailsForSession` fell back to `workouts[0]`, so a caller
 * asking for session X could silently be handed session Y (audit bug). The
 * unchecked `as SelectedWorkout` cast is also dropped.
 */
export function workoutDetailOptions(session: WorkoutSession) {
  return queryOptions({
    queryKey: queryKeys.workoutSessions.detail(session.id),
    queryFn: async (): Promise<SelectedWorkout | null> => {
      const params = buildSearchParams({ date: session.date })
      const response = await fetch(`/api/workout-details?${params.toString()}`)
      const workouts = await readApiData<WorkoutSessionWithSets[]>(
        response,
        `Failed to load workout details: ${response.status}`,
        { fallbackData: [] },
      )

      const match = workouts.find((workout) => workout.id === session.id)
      return match ? (match as SelectedWorkout) : null
    },
  })
}

export async function duplicateWorkoutHistorySession(sessionId: string): Promise<WorkoutSession> {
  const params = buildSearchParams({
    action: 'duplicate',
    duplicateId: sessionId,
  })
  const response = await fetch(`/api/workout-sessions?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: getLocalCalendarDate() }),
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
