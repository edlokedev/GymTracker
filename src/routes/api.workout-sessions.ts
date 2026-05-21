import { createServerFileRoute } from '@tanstack/react-start/server'
import { workoutSessionQueries } from '../lib/supabase/queries/workout-sessions'
import { mergeHeaders } from '../lib/supabase/response'
import { getAuthenticatedUser } from '../lib/supabase/server'
import type { WorkoutSessionInput } from '../lib/types/database'

// Private workout session CRUD. Identity is derived from the Supabase session
// on the request — `userId` is NEVER read from query string or body. RLS
// enforces ownership at the database layer.

function unauthorizedResponse(responseHeaders?: Headers) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: mergeHeaders(responseHeaders, { 'Content-Type': 'application/json' }),
  })
}

export const ServerRoute = createServerFileRoute('/api/workout-sessions').methods({
  GET: async ({ request }: { request: Request }) => {
    const { user, supabase, responseHeaders } = await getAuthenticatedUser(request)
    if (!user) return unauthorizedResponse(responseHeaders)

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)

    try {
      const result = await workoutSessionQueries.list(supabase, limit, offset)
      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: mergeHeaders(responseHeaders, {
          'Content-Type': 'application/json',
        }),
      })
    } catch (error) {
      console.error('Get user workout sessions error:', error)
      return new Response(JSON.stringify({ error: 'Failed to get workout sessions' }), {
        status: 500,
        headers: mergeHeaders(responseHeaders, {
          'Content-Type': 'application/json',
        }),
      })
    }
  },

  POST: async ({ request }: { request: Request }) => {
    const { user, supabase, responseHeaders } = await getAuthenticatedUser(request)
    if (!user) return unauthorizedResponse(responseHeaders)

    try {
      // Accept the legacy WorkoutSessionInput shape but ignore any user_id the
      // client tried to send. Identity is always taken from the Supabase JWT.
      const body = (await request.json()) as Partial<WorkoutSessionInput>
      const { user_id: _ignored, ...input } = body
      void _ignored

      const session = await workoutSessionQueries.create(supabase, user.id, input)

      return new Response(JSON.stringify({ success: true, data: session }), {
        headers: mergeHeaders(responseHeaders, {
          'Content-Type': 'application/json',
        }),
      })
    } catch (error) {
      console.error('Create workout session error:', error)
      return new Response(JSON.stringify({ error: 'Failed to create workout session' }), {
        status: 500,
        headers: mergeHeaders(responseHeaders, {
          'Content-Type': 'application/json',
        }),
      })
    }
  },

  PATCH: async ({ request }: { request: Request }) => {
    const { user, supabase, responseHeaders } = await getAuthenticatedUser(request)
    if (!user) return unauthorizedResponse(responseHeaders)

    try {
      const url = new URL(request.url)
      const sessionId = url.searchParams.get('id')
      const action = url.searchParams.get('action')

      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Session ID is required' }), {
          status: 400,
          headers: mergeHeaders(responseHeaders, {
            'Content-Type': 'application/json',
          }),
        })
      }

      if (action === 'complete') {
        const session = await workoutSessionQueries.complete(supabase, sessionId)
        if (!session) {
          return new Response(
            JSON.stringify({
              error: 'Session not found or already completed',
            }),
            {
              status: 404,
              headers: mergeHeaders(responseHeaders, {
                'Content-Type': 'application/json',
              }),
            },
          )
        }
        return new Response(JSON.stringify({ success: true, data: session }), {
          headers: mergeHeaders(responseHeaders, {
            'Content-Type': 'application/json',
          }),
        })
      }

      // Regular update. Discard any user_id from the body.
      const body = (await request.json()) as Partial<WorkoutSessionInput>
      const { user_id: _ignored, ...updates } = body
      void _ignored

      const session = await workoutSessionQueries.update(supabase, sessionId, updates)
      if (!session) {
        return new Response(JSON.stringify({ error: 'Session not found' }), {
          status: 404,
          headers: mergeHeaders(responseHeaders, {
            'Content-Type': 'application/json',
          }),
        })
      }
      return new Response(JSON.stringify({ success: true, data: session }), {
        headers: mergeHeaders(responseHeaders, {
          'Content-Type': 'application/json',
        }),
      })
    } catch (error) {
      console.error('Update workout session error:', error)
      return new Response(JSON.stringify({ error: 'Failed to update workout session' }), {
        status: 500,
        headers: mergeHeaders(responseHeaders, {
          'Content-Type': 'application/json',
        }),
      })
    }
  },
})
