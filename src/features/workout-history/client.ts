import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
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
 * Infinite-query options for the workout-sessions list (ADR-0007, Phase 2).
 * Keyed by `{ limit, locationName }` via `queryKeys.workoutSessions.list` — the
 * offset is intentionally excluded (it is the page param), so a filter change
 * produces a distinct cache entry. Every loaded page lives in that one entry:
 * a stale "load more" for an old filter lands in the old entry, and an
 * invalidation refetches all loaded pages together, so pages never overlap.
 */
export function workoutHistoryListOptions({
  limit,
  locationName,
}: {
  limit: number
  locationName?: string
}) {
  return infiniteQueryOptions({
    queryKey: queryKeys.workoutSessions.list({ limit, locationName }),
    queryFn: ({ pageParam }) => fetchWorkoutHistoryPage({ limit, offset: pageParam, locationName }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.reduce((count, page) => count + page.data.length, 0) : undefined,
  })
}

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
