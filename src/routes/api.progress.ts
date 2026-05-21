import { createServerFileRoute } from '@tanstack/react-start/server'
import dayjs from 'dayjs'
import { getProgressData } from '../lib/supabase/queries/progress'
import { mergeHeaders } from '../lib/supabase/response'
import { getAuthenticatedUser } from '../lib/supabase/server'
import type { ProgressResponse } from '../lib/types/progress'

const JSON_HEADER = { 'Content-Type': 'application/json' }

export const ServerRoute = createServerFileRoute('/api/progress').methods({
  GET: async ({ request }: { request: Request }) => {
    const { user, supabase, responseHeaders } = await getAuthenticatedUser(request)
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      const url = new URL(request.url)
      const searchParams = url.searchParams

      const exerciseIds = searchParams.get('exercises')?.split(',').filter(Boolean) || []
      const startDate =
        searchParams.get('startDate') || dayjs().subtract(90, 'day').format('YYYY-MM-DD')
      const endDate = searchParams.get('endDate') || dayjs().format('YYYY-MM-DD')
      const metric = (searchParams.get('metric') as 'weight' | 'reps' | 'volume') || 'volume'
      const limit = parseInt(searchParams.get('limit') || '1000')

      if (dayjs(startDate).isAfter(dayjs(endDate))) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Start date cannot be after end date',
          }),
          { status: 400, headers: mergeHeaders(responseHeaders, JSON_HEADER) },
        )
      }

      const progressData = await getProgressData(supabase, {
        userId: user.id,
        exerciseIds: exerciseIds.length > 0 ? exerciseIds : undefined,
        startDate,
        endDate,
        metric,
        limit,
      })

      const response: ProgressResponse = {
        success: true,
        data: {
          progress: progressData,
          totalExercises: progressData.length,
          dateRange: {
            start: startDate,
            end: endDate,
          },
        },
      }

      return new Response(JSON.stringify(response), {
        headers: mergeHeaders(responseHeaders, JSON_HEADER),
      })
    } catch (error: any) {
      console.error('Progress API error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch progress data',
          details: error?.message,
        }),
        { status: 500, headers: mergeHeaders(responseHeaders, JSON_HEADER) },
      )
    }
  },
})
