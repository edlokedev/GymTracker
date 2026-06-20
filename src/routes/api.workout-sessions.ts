import { createServerFileRoute } from '@tanstack/react-start/server'
import { type PrivateHandlerContext, privateMethod } from '../lib/api/define-private-route'
import { badRequest, notFound } from '../lib/api/errors'
import { workoutSessionQueries } from '../lib/supabase/queries/workout-sessions'
import { workoutTemplateQueries } from '../lib/supabase/queries/workout-templates'
import type { WorkoutSessionInput } from '../lib/types/database'
import { isValidCalendarDate } from '../lib/utils/calendar'

// Reject a `date` field that is present but not a real `YYYY-MM-DD` calendar day.
// Runtime guard — route handlers run unparsed; the zod contract is test-only.
function assertValidDate(date: unknown): void {
  if (
    date !== undefined &&
    date !== null &&
    (typeof date !== 'string' || !isValidCalendarDate(date))
  )
    badRequest('date must be a valid YYYY-MM-DD date')
}

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
  const locationName = url.searchParams.get('location_name') ?? undefined
  return workoutSessionQueries.list(supabase, limit, offset, locationName)
}

export const createWorkoutSession = async ({ user, supabase, request }: PrivateHandlerContext) => {
  const url = new URL(request.url)
  const action = url.searchParams.get('action')

  if (action === 'duplicate') {
    const duplicateId = url.searchParams.get('duplicateId')?.trim()
    if (!duplicateId) badRequest('duplicateId is required')

    // Body is optional ({ date }); tolerate an empty/absent body.
    const body = (await request.json().catch(() => ({}))) as { date?: string }
    assertValidDate(body.date)

    const session = await workoutSessionQueries.duplicate(
      supabase,
      user.id,
      duplicateId as string,
      body.date,
    )
    if (!session) notFound('Session not found')
    return session
  }
  if (action === 'startFromTemplate') {
    const body = (await request.json()) as { templateId?: string; date?: string }
    const templateId = body.templateId?.trim()
    if (!templateId) badRequest('templateId is required')
    assertValidDate(body.date)

    const result = await workoutTemplateQueries.startFromTemplate(
      supabase,
      user.id,
      templateId,
      body.date,
    )
    if (!result) notFound('Template not found')
    return result
  }
  if (action) badRequest('Unsupported workout session action')

  // Accept the session input shape but ignore any user_id the client sent.
  // Identity is always taken from the Supabase JWT.
  const rawBody = (await request.json()) as Partial<WorkoutSessionInput>
  const { user_id: _ignored, ...input } = rawBody
  void _ignored
  assertValidDate(input.date)
  if (input.location_name !== undefined && input.location_name !== null) {
    const trimmed = input.location_name.trim()
    if (trimmed.length > 100) badRequest('location_name must be 100 characters or fewer')
    input.location_name = trimmed === '' ? undefined : trimmed
  }
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

  const rawBody = (await request.json()) as Partial<WorkoutSessionInput>
  const { user_id: _ignored, ...updates } = rawBody
  void _ignored
  assertValidDate(updates.date)

  if (updates.location_name !== undefined && updates.location_name !== null) {
    const trimmed = updates.location_name.trim()
    if (trimmed.length > 100) badRequest('location_name must be 100 characters or fewer')
    updates.location_name = trimmed === '' ? null : trimmed
  }

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
