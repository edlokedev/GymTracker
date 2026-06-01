import { createServerFileRoute } from '@tanstack/react-start/server'
import dayjs from 'dayjs'
import { type PrivateHandlerContext, privateMethod } from '../lib/api/define-private-route'
import { badRequest } from '../lib/api/errors'
import { getProgressData } from '../lib/supabase/queries/progress'
import type { ProgressMetric } from '../lib/types/progress'

const PROGRESS_METRICS: ProgressMetric[] = [
  'weight',
  'reps',
  'volume',
  'duration',
  'distance',
  'speed',
]

function parseMetric(value: string | null): ProgressMetric {
  if (!value) return 'volume'
  if (PROGRESS_METRICS.includes(value as ProgressMetric)) return value as ProgressMetric
  badRequest('Invalid progress metric')
}

export const getProgress = async ({ user, supabase, url }: PrivateHandlerContext) => {
  const searchParams = url.searchParams
  const exerciseIds = searchParams.get('exercises')?.split(',').filter(Boolean) || []
  const startDate =
    searchParams.get('startDate') || dayjs().subtract(90, 'day').format('YYYY-MM-DD')
  const endDate = searchParams.get('endDate') || dayjs().format('YYYY-MM-DD')
  const metric = parseMetric(searchParams.get('metric'))
  const limit = parseInt(searchParams.get('limit') || '1000', 10)

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
}

export const ServerRoute = createServerFileRoute('/api/progress').methods({
  GET: privateMethod(getProgress),
})
