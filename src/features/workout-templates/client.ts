import { queryOptions } from '@tanstack/react-query'
import { buildSearchParams, readApiData, readApiSuccess } from '@/lib/api'
import { queryKeys } from '@/lib/api/query-keys'
import type {
  NextWorkoutResponse,
  StartFromTemplateResult,
  WorkoutTemplateWithExercises,
} from '@/lib/types/database'

export interface WorkoutTemplateExerciseWriteInput {
  exerciseId: string
  targetSets?: number
  notes?: string
}

export interface WorkoutTemplateWriteInput {
  name: string
  notes?: string
  exercises: WorkoutTemplateExerciseWriteInput[]
}

export async function loadWorkoutTemplates(): Promise<WorkoutTemplateWithExercises[]> {
  const response = await fetch('/api/workout-templates')
  return readApiData(response, `Failed to load workout templates: ${response.status}`, {
    fallbackData: [],
  })
}

export async function loadWorkoutTemplate(id: string): Promise<WorkoutTemplateWithExercises> {
  const params = buildSearchParams({ id })
  const response = await fetch(`/api/workout-templates?${params.toString()}`)
  return readApiData(response, `Failed to load saved workout: ${response.status}`)
}

export async function loadNextWorkout(): Promise<NextWorkoutResponse> {
  const response = await fetch('/api/next-workout')
  return readApiData(response, `Failed to load next workout: ${response.status}`)
}

/**
 * Query options for the saved-workouts list (ADR-0007, Phase 4), keyed
 * `['workout-templates','list']`. Replaces the imperative `loadWorkoutTemplates`
 * in `useWorkoutTemplates`; CRUD mutations invalidate `queryKeys.workoutTemplates.all`.
 */
export function workoutTemplatesListOptions() {
  return queryOptions({
    queryKey: queryKeys.workoutTemplates.list(),
    queryFn: loadWorkoutTemplates,
  })
}

/**
 * Query options for a single saved workout's detail (ADR-0007, Phase 4), keyed
 * `['workout-templates','detail',id]`.
 */
export function workoutTemplateDetailOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.workoutTemplates.detail(id),
    queryFn: () => loadWorkoutTemplate(id),
  })
}

/**
 * Query options for the next-workout recommendation (ADR-0007, Phase 4), keyed
 * `['workout-templates','next']`. Selects the recommendation out of the envelope
 * so consumers get `NextWorkoutRecommendation | null` directly.
 */
export function nextWorkoutOptions() {
  return queryOptions({
    queryKey: queryKeys.workoutTemplates.nextWorkout(),
    queryFn: async () => (await loadNextWorkout()).recommendation,
  })
}

export async function createWorkoutTemplate(
  input: WorkoutTemplateWriteInput,
): Promise<WorkoutTemplateWithExercises> {
  const response = await fetch('/api/workout-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  return readApiData(response, `Failed to create saved workout: ${response.status}`)
}

export async function createWorkoutTemplateFromSession({
  sourceSessionId,
  name,
}: {
  sourceSessionId: string
  name?: string
}): Promise<WorkoutTemplateWithExercises> {
  const response = await fetch('/api/workout-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceSessionId, name }),
  })

  return readApiData(response, `Failed to save workout: ${response.status}`)
}

export async function updateWorkoutTemplate(
  id: string,
  input: WorkoutTemplateWriteInput,
): Promise<WorkoutTemplateWithExercises> {
  const params = buildSearchParams({ id })
  const response = await fetch(`/api/workout-templates?${params.toString()}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  return readApiData(response, `Failed to update saved workout: ${response.status}`)
}

export async function startWorkoutFromTemplate(
  templateId: string,
): Promise<StartFromTemplateResult> {
  const params = buildSearchParams({ action: 'startFromTemplate' })
  const response = await fetch(`/api/workout-sessions?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId }),
  })

  return readApiData(response, `Failed to start saved workout: ${response.status}`)
}

export async function archiveWorkoutTemplate(templateId: string): Promise<void> {
  const params = buildSearchParams({ id: templateId })
  const response = await fetch(`/api/workout-templates?${params.toString()}`, {
    method: 'DELETE',
  })

  await readApiSuccess(response, 'Failed to archive saved workout')
}
