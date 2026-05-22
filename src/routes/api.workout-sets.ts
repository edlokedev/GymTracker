import { createServerFileRoute } from '@tanstack/react-start/server'
import { workoutSetQueries } from '../lib/supabase/queries/workout-sets'
import { mergeHeaders } from '../lib/supabase/response'
import { getAuthenticatedUser } from '../lib/supabase/server'
import type { WorkoutSetInput } from '../lib/types/database'

// Private workout-set CRUD. Identity comes from the Supabase session; row
// visibility is enforced transitively by RLS via the parent workout_session.

function unauthorizedResponse(responseHeaders?: Headers) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: mergeHeaders(responseHeaders, { 'Content-Type': 'application/json' }),
  })
}

// Postgres error codes that map to "the caller can't see / doesn't have a
// parent session", which we surface as 404 to match the legacy behavior.
function isMissingParentError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: string }).code
  // 23503 = foreign_key_violation (parent workout doesn't exist),
  // 42501 = insufficient_privilege (RLS blocked the insert).
  return code === '23503' || code === '42501'
}

export const ServerRoute = createServerFileRoute('/api/workout-sets').methods({
  POST: async ({ request }: { request: Request }) => {
    const { user, supabase, responseHeaders } = await getAuthenticatedUser(request)
    if (!user) return unauthorizedResponse(responseHeaders)

    try {
      const data = (await request.json()) as WorkoutSetInput

      if (!data.workout_id || !data.exercise_id || !data.set_order) {
        return new Response(
          JSON.stringify({
            error: 'Missing required fields: workout_id, exercise_id, and set_order are required',
          }),
          {
            status: 400,
            headers: mergeHeaders(responseHeaders, {
              'Content-Type': 'application/json',
            }),
          },
        )
      }

      const workoutSet = await workoutSetQueries.create(supabase, data)

      return new Response(JSON.stringify({ success: true, data: workoutSet }), {
        headers: mergeHeaders(responseHeaders, {
          'Content-Type': 'application/json',
        }),
      })
    } catch (error: any) {
      if (isMissingParentError(error)) {
        return new Response(JSON.stringify({ error: 'Parent workout session not found' }), {
          status: 404,
          headers: mergeHeaders(responseHeaders, {
            'Content-Type': 'application/json',
          }),
        })
      }
      console.error('Create workout set error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to create workout set',
          details: error?.message,
        }),
        {
          status: 500,
          headers: mergeHeaders(responseHeaders, {
            'Content-Type': 'application/json',
          }),
        },
      )
    }
  },

  PUT: async ({ request }: { request: Request }) => {
    const { user, supabase, responseHeaders } = await getAuthenticatedUser(request)
    if (!user) return unauthorizedResponse(responseHeaders)

    try {
      const url = new URL(request.url)
      const setId = url.searchParams.get('id')

      if (!setId) {
        return new Response(JSON.stringify({ error: 'Set ID is required' }), {
          status: 400,
          headers: mergeHeaders(responseHeaders, {
            'Content-Type': 'application/json',
          }),
        })
      }

      const data = (await request.json()) as Partial<WorkoutSetInput>
      const updatedSet = await workoutSetQueries.update(supabase, setId, data)

      if (!updatedSet) {
        return new Response(JSON.stringify({ error: 'Workout set not found' }), {
          status: 404,
          headers: mergeHeaders(responseHeaders, {
            'Content-Type': 'application/json',
          }),
        })
      }

      return new Response(JSON.stringify({ success: true, data: updatedSet }), {
        headers: mergeHeaders(responseHeaders, {
          'Content-Type': 'application/json',
        }),
      })
    } catch (error: any) {
      console.error('Update workout set error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to update workout set',
          details: error?.message,
        }),
        {
          status: 500,
          headers: mergeHeaders(responseHeaders, {
            'Content-Type': 'application/json',
          }),
        },
      )
    }
  },

  DELETE: async ({ request }: { request: Request }) => {
    const { user, supabase, responseHeaders } = await getAuthenticatedUser(request)
    if (!user) return unauthorizedResponse(responseHeaders)

    try {
      const url = new URL(request.url)
      const setId = url.searchParams.get('id')
      const workoutId = url.searchParams.get('workoutId')
      const exerciseId = url.searchParams.get('exerciseId')

      // Two delete modes:
      //   * ?id=...                       — delete a single set
      //   * ?workoutId=...&exerciseId=... — remove every set for that
      //     exercise from the workout (used by the UI's "Remove Exercise"
      //     button so the session can shed a whole row without iterating).
      if (workoutId && exerciseId) {
        const removed = await workoutSetQueries.deleteByExercise(supabase, workoutId, exerciseId)
        return new Response(JSON.stringify({ success: true, deleted: removed }), {
          headers: mergeHeaders(responseHeaders, {
            'Content-Type': 'application/json',
          }),
        })
      }

      if (!setId) {
        return new Response(
          JSON.stringify({ error: 'Set ID (or workoutId+exerciseId) is required' }),
          {
            status: 400,
            headers: mergeHeaders(responseHeaders, {
              'Content-Type': 'application/json',
            }),
          },
        )
      }

      const ok = await workoutSetQueries.delete(supabase, setId)

      if (!ok) {
        return new Response(JSON.stringify({ error: 'Workout set not found' }), {
          status: 404,
          headers: mergeHeaders(responseHeaders, {
            'Content-Type': 'application/json',
          }),
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: mergeHeaders(responseHeaders, {
          'Content-Type': 'application/json',
        }),
      })
    } catch (error: any) {
      console.error('Delete workout set error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to delete workout set',
          details: error?.message,
        }),
        {
          status: 500,
          headers: mergeHeaders(responseHeaders, {
            'Content-Type': 'application/json',
          }),
        },
      )
    }
  },

  GET: async ({ request }: { request: Request }) => {
    const { user, supabase, responseHeaders } = await getAuthenticatedUser(request)
    if (!user) return unauthorizedResponse(responseHeaders)

    try {
      const url = new URL(request.url)
      const workoutId = url.searchParams.get('workoutId')
      const setId = url.searchParams.get('id')

      if (setId) {
        const workoutSet = await workoutSetQueries.getById(supabase, setId)
        if (!workoutSet) {
          return new Response(JSON.stringify({ error: 'Workout set not found' }), {
            status: 404,
            headers: mergeHeaders(responseHeaders, {
              'Content-Type': 'application/json',
            }),
          })
        }
        return new Response(JSON.stringify({ success: true, data: workoutSet }), {
          headers: mergeHeaders(responseHeaders, {
            'Content-Type': 'application/json',
          }),
        })
      }

      if (workoutId) {
        const sets = await workoutSetQueries.listByWorkoutId(supabase, workoutId)
        return new Response(JSON.stringify({ success: true, data: sets }), {
          headers: mergeHeaders(responseHeaders, {
            'Content-Type': 'application/json',
          }),
        })
      }

      return new Response(
        JSON.stringify({
          error: 'Either workoutId or id parameter is required',
        }),
        {
          status: 400,
          headers: mergeHeaders(responseHeaders, {
            'Content-Type': 'application/json',
          }),
        },
      )
    } catch (error: any) {
      console.error('Get workout sets error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to get workout sets',
          details: error?.message,
        }),
        {
          status: 500,
          headers: mergeHeaders(responseHeaders, {
            'Content-Type': 'application/json',
          }),
        },
      )
    }
  },
})
