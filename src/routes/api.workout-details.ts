import { createServerFileRoute } from '@tanstack/react-start/server'
import { workoutDetailsQueries } from '../lib/supabase/queries/workout-details'
import { mergeHeaders } from '../lib/supabase/response'
import { getAuthenticatedUser } from '../lib/supabase/server'
import type { WorkoutDetailResponse } from '../lib/types/calendar'

// Aggregate route: returns every workout session the authenticated user has on
// a given date, each with its sets and computed totals. Identity comes from
// the Supabase session — no `userId` is accepted from the request.

function unauthorizedResponse(responseHeaders?: Headers) {
  return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
    status: 401,
    headers: mergeHeaders(responseHeaders, { 'Content-Type': 'application/json' }),
  })
}

export const ServerRoute = createServerFileRoute('/api/workout-details').methods({
  GET: async ({ request }: { request: Request }) => {
    const { user, supabase, responseHeaders } = await getAuthenticatedUser(request)
    if (!user) return unauthorizedResponse(responseHeaders)

    const url = new URL(request.url)
    const date = url.searchParams.get('date')

    if (!date) {
      return new Response(JSON.stringify({ success: false, error: 'date is required' }), {
        status: 400,
        headers: mergeHeaders(responseHeaders, {
          'Content-Type': 'application/json',
        }),
      })
    }

    try {
      const detailedSessions = await workoutDetailsQueries.getByDate(supabase, date)

      const response: WorkoutDetailResponse = {
        success: true,
        data: detailedSessions,
      }

      return new Response(JSON.stringify(response), {
        headers: mergeHeaders(responseHeaders, {
          'Content-Type': 'application/json',
        }),
      })
    } catch (error) {
      console.error('Get workout details error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to get workout details',
          data: [],
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
