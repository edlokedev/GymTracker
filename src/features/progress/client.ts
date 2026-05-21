import { buildSearchParams, readApiResult } from '@/lib/api'
import type { ProgressFilters, ProgressResponse } from '@/lib/types/progress'

export function progressFiltersToApiSearchParams(
  userId: string,
  filters: ProgressFilters,
): URLSearchParams {
  return buildSearchParams({
    userId,
    startDate: filters.dateRange.start,
    endDate: filters.dateRange.end,
    metric: filters.metric,
    exercises: filters.exerciseIds.length > 0 ? filters.exerciseIds.join(',') : undefined,
  })
}

export async function fetchProgressData(
  userId: string,
  filters: ProgressFilters,
): Promise<ProgressResponse['data']> {
  const params = progressFiltersToApiSearchParams(userId, filters)
  const response = await fetch(`/api/progress?${params.toString()}`)
  const result = (await readApiResult<ProgressResponse['data']>(
    response,
    'Failed to fetch progress data',
  )) as ProgressResponse

  if (!result.data) {
    throw new Error(result.error || 'Failed to fetch progress data')
  }

  return result.data
}
