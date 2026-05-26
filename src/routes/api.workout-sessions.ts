import { createServerFileRoute } from '@tanstack/react-start/server'
import { type PrivateHandlerContext, privateMethod } from '../lib/api/define-private-route'
import { badRequest, notFound } from '../lib/api/errors'
import { workoutSessionQueries } from '../lib/supabase/queries/workout-sessions'
import type { WorkoutSessionInput } from '../lib/types/database'

// Private workout-session CRUD. Identity is derived from the Supabase session
// on the request — `userId` is NEVER read from query string or body. RLS
// enforces ownership at the database layer.
//
// With ?id=… GET returns a single session. With ?id=…&includeDetails=true the
// response is a WorkoutWithDetails (sets grouped by exercise). Without id it
// returns a paginated list.

export const getWorkoutSessions = async ({ supabase, url }: PrivateHandlerContext) => {
  const sessionId = url.searchParams.get('id')
  const includeDetails = url.searchParams.get('includeDetails') === 'true'

  if (sessionId) {
    const data = includeDetails
      ? await workoutSessionQueries.getWithDetails(supabase, sessionId)
      : await workoutSessionQueries.getById(supabase, sessionId)
    if (!data) notFound('Session not found')
    return data
  }

  const limit = parseInt(url.searchParams.get('limit') || '20', 10)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)
  return workoutSessionQueries.list(supabase, limit, offset)
}

export const createWorkoutSession = async ({ user, supabase, request }: PrivateHandlerContext) => {
  const url = new URL(request.url)
  const action = url.searchParams.get('action')

  if (action === 'duplicate') {
    const duplicateId = url.searchParams.get('duplicateId')?.trim()
    if (!duplicateId) badRequest('duplicateId is required')

    const session = await workoutSessionQueries.duplicate(supabase, user.id, duplicateId)
    if (!session) notFound('Session not found')
    return session
  }
  if (action) badRequest('Unsupported workout session action')

  // Accept the legacy WorkoutSessionInput shape but ignore any user_id the
  // client tried to send. Identity is always taken from the Supabase JWT.
  const body = (await request.json()) as Partial<WorkoutSessionInput>
  const { user_id: _ignored, ...input } = body
  void _ignored
  return workoutSessionQueries.create(supabase, user.id, input)
}

export const patchWorkoutSession = async ({ supabase, request, url }: PrivateHandlerContext) => {
  const sessionId = url.searchParams.get('id')
  const action = url.searchParams.get('action')
  if (!sessionId) badRequest('Session ID is required')

  if (action === 'complete') {
    const session = await workoutSessionQueries.complete(supabase, sessionId as string)
    if (!session) notFound('Session not found or already completed')
    return session
  }

  const body = (await request.json()) as Partial<WorkoutSessionInput>
  const { user_id: _ignored, ...updates } = body
  void _ignored

  const session = await workoutSessionQueries.update(supabase, sessionId as string, updates)
  if (!session) notFound('Session not found')
  return session
}

export const deleteWorkoutSession = async ({ supabase, url }: PrivateHandlerContext) => {
  const sessionId = url.searchParams.get('id')
  if (!sessionId) badRequest('Session ID is required')

  const ok = await workoutSessionQueries.delete(supabase, sessionId as string)
  if (!ok) notFound('Session not found')
  return {}
}

export const ServerRoute = createServerFileRoute('/api/workout-sessions').methods({
  GET: privateMethod(getWorkoutSessions),
  POST: privateMethod(createWorkoutSession),
  PATCH: privateMethod(patchWorkoutSession),
  DELETE: privateMethod(deleteWorkoutSession),
})
