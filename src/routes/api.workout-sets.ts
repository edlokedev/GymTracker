import { createServerFileRoute } from '@tanstack/react-start/server'
import { type PrivateHandlerContext, privateMethod } from '../lib/api/define-private-route'
import { badRequest, notFound } from '../lib/api/errors'
import { workoutSetQueries } from '../lib/supabase/queries/workout-sets'
import type { WorkoutSetInput } from '../lib/types/database'

// Private workout-set CRUD. Identity comes from the Supabase session; row
// visibility is enforced transitively by RLS via the parent workout_session.
// Postgres signals (PGRST116/23503/42501) are raised as NotFoundError by
// assertPostgresOk inside the query module — see ADR-0002.

export const getWorkoutSets = async ({ supabase, url }: PrivateHandlerContext) => {
  const workoutId = url.searchParams.get('workoutId')
  const setId = url.searchParams.get('id')

  if (setId) {
    const set = await workoutSetQueries.getById(supabase, setId)
    if (!set) notFound('Workout set not found')
    return set
  }
  if (workoutId) {
    return workoutSetQueries.listByWorkoutId(supabase, workoutId)
  }
  badRequest('Either workoutId or id parameter is required')
}

export const createWorkoutSet = async ({ supabase, request }: PrivateHandlerContext) => {
  const data = (await request.json()) as WorkoutSetInput
  if (!data.workout_id || !data.exercise_id || !data.set_order) {
    badRequest('Missing required fields: workout_id, exercise_id, and set_order are required')
  }
  return workoutSetQueries.create(supabase, data)
}

export const updateWorkoutSet = async ({ supabase, request, url }: PrivateHandlerContext) => {
  const setId = url.searchParams.get('id')
  if (!setId) badRequest('Set ID is required')

  const data = (await request.json()) as Partial<WorkoutSetInput>
  const updated = await workoutSetQueries.update(supabase, setId as string, data)
  if (!updated) notFound('Workout set not found')
  return updated
}

export const deleteWorkoutSet = async ({ supabase, url }: PrivateHandlerContext) => {
  const setId = url.searchParams.get('id')
  const workoutId = url.searchParams.get('workoutId')
  const exerciseId = url.searchParams.get('exerciseId')

  // Two delete modes:
  //   * ?id=...                       — delete a single set
  //   * ?workoutId=...&exerciseId=... — remove every set for that
  //     exercise from the workout (used by the UI's "Remove Exercise"
  //     button so the session can shed a whole row without iterating).
  if (workoutId && exerciseId) {
    const deleted = await workoutSetQueries.deleteByExercise(supabase, workoutId, exerciseId)
    return { deleted }
  }

  if (!setId) badRequest('Set ID (or workoutId+exerciseId) is required')

  const ok = await workoutSetQueries.delete(supabase, setId as string)
  if (!ok) notFound('Workout set not found')
  return {}
}

export const ServerRoute = createServerFileRoute('/api/workout-sets').methods({
  GET: privateMethod(getWorkoutSets),
  POST: privateMethod(createWorkoutSet),
  PUT: privateMethod(updateWorkoutSet),
  DELETE: privateMethod(deleteWorkoutSet),
})
