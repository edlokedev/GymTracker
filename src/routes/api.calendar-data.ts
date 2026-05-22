import { createServerFileRoute } from '@tanstack/react-start/server'
import { mergeHeaders } from '../lib/api/cookies'
import { getCalendarAggregate, resolveCalendarRange } from '../lib/supabase/queries/calendar'
import { getAuthenticatedUser } from '../lib/supabase/server'
import type { CalendarDataResponse } from '../lib/types/calendar'

const JSON_HEADER = { 'Content-Type': 'application/json' }

export const ServerRoute = createServerFileRoute('/api/calendar-data').methods({
  GET: async ({ request }: { request: Request }) => {
    const { user, supabase, responseHeaders } = await getAuthenticatedUser(request)
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(request.url)
    const startDateParam = url.searchParams.get('start')
    const endDateParam = url.searchParams.get('end')

    try {
      const dateRange = resolveCalendarRange(startDateParam, endDateParam)
      const aggregate = await getCalendarAggregate(supabase, user.id, dateRange)

      const response: CalendarDataResponse = {
        success: true,
        data: aggregate.data,
        summary: aggregate.summary,
        dateRange: aggregate.dateRange,
      }

      return new Response(JSON.stringify(response), {
        headers: mergeHeaders(responseHeaders, JSON_HEADER),
      })
    } catch (error) {
      console.error('Get calendar data error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to get calendar data',
          data: [],
          summary: {
            totalWorkouts: 0,
            totalVolume: 0,
            averageWorkoutsPerWeek: 0,
            longestStreak: 0,
            currentStreak: 0,
            lastWorkoutDate: null,
            workoutsThisMonth: 0,
          },
          dateRange: {
            start: new Date().toISOString(),
            end: new Date().toISOString(),
          },
        }),
        { status: 500, headers: mergeHeaders(responseHeaders, JSON_HEADER) },
      )
    }
  },
})
