import { createServerFileRoute } from '@tanstack/react-start/server'
import dayjs from 'dayjs'
import { privateMethod } from '../lib/api/define-private-route'
import { badRequest } from '../lib/api/errors'
import { getProgressData } from '../lib/supabase/queries/progress'

export const ServerRoute = createServerFileRoute('/api/progress').methods({
  GET: privateMethod(async ({ user, supabase, url }) => {
    const searchParams = url.searchParams
    const exerciseIds = searchParams.get('exercises')?.split(',').filter(Boolean) || []
    const startDate =
      searchParams.get('startDate') || dayjs().subtract(90, 'day').format('YYYY-MM-DD')
    const endDate = searchParams.get('endDate') || dayjs().format('YYYY-MM-DD')
    const metric = (searchParams.get('metric') as 'weight' | 'reps' | 'volume') || 'volume'
    const limit = parseInt(searchParams.get('limit') || '1000')

    if (dayjs(startDate).isAfter(dayjs(endDate))) {
      badRequest('Start date cannot be after end date')
    }

    const progressData = await getProgressData(supabase, {
      userId: user.id,
      exerciseIds: exerciseIds.length > 0 ? exerciseIds : undefined,
      startDate,
      endDate,
      metric,
      limit,
    })

    return {
      progress: progressData,
      totalExercises: progressData.length,
      dateRange: { start: startDate, end: endDate },
    }
  }),
})
