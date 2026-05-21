import { buildSearchParams, readApiData, readApiSuccess } from '@/lib/api'
import type { WorkoutSession } from '@/lib/types/database'

export async function duplicateWorkoutDetail(workoutId: string): Promise<WorkoutSession> {
  const params = buildSearchParams({
    action: 'duplicate',
    duplicateId: workoutId,
  })
  const response = await fetch(`/api/workout-sessions?${params.toString()}`, {
    method: 'POST',
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
