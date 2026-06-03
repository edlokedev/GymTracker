import { buildSearchParams, readApiData, readApiSuccess } from '@/lib/api'
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
