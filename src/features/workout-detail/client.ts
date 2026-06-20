import { buildSearchParams, readApiData, readApiSuccess } from '@/lib/api'
import type { WorkoutSession } from '@/lib/types/database'
import { getLocalCalendarDate } from '@/lib/utils/calendar'

export async function updateWorkoutSessionLocation(
  id: string,
  locationName: string | null,
): Promise<WorkoutSession> {
  const response = await fetch(`/api/workout-sessions?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location_name: locationName }),
  })
  return readApiData(response, `Failed to update location: ${response.status}`)
}

export async function duplicateWorkoutDetail(workoutId: string): Promise<WorkoutSession> {
  const params = buildSearchParams({
    action: 'duplicate',
    duplicateId: workoutId,
  })
  const response = await fetch(`/api/workout-sessions?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: getLocalCalendarDate() }),
  })

  return readApiData(response, `Failed to duplicate workout: ${response.status}`)
}

export async function deleteWorkoutDetail(workoutId: string): Promise<void> {
  const params = buildSearchParams({ id: workoutId })
  const response = await fetch(`/api/workout-sessions?${params.toString()}`, {
    method: 'DELETE',
  })

  await readApiSuccess(response, 'Failed to delete workout')
}
