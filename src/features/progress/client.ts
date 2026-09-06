import { queryOptions } from '@tanstack/react-query'
import { buildSearchParams, readApiData } from '@/lib/api'
import { queryKeys } from '@/lib/api/query-keys'
import type { ProgressFilters, ProgressResponse } from '@/lib/types/progress'

export function progressFiltersToApiSearchParams(filters: ProgressFilters): URLSearchParams {
  return buildSearchParams({
    startDate: filters.dateRange.start,
    endDate: filters.dateRange.end,
    metric: filters.metric,
    exercises: filters.exerciseIds.length > 0 ? filters.exerciseIds.join(',') : undefined,
  })
}

export async function fetchProgressData(
  filters: ProgressFilters,
): Promise<ProgressResponse['data']> {
  const params = progressFiltersToApiSearchParams(filters)
  const response = await fetch(`/api/progress?${params.toString()}`)
  return readApiData<ProgressResponse['data']>(response, 'Failed to fetch progress data')
}

/**
 * Query options for the progress analytics payload, keyed by the full filter
 * set so a filter flip is a distinct cache entry — TanStack Query then
 * guarantees last-request-wins, retiring the hand-rolled fetch-into-setState
 * loop in the old useProgressDashboard (issue #0016).
 */
export function progressDataOptions(filters: ProgressFilters) {
  return queryOptions({
    queryKey: queryKeys.progress.data({
      startDate: filters.dateRange.start,
      endDate: filters.dateRange.end,
      metric: filters.metric,
      exerciseIds: filters.exerciseIds,
    }),
    queryFn: () => fetchProgressData(filters),
  })
}
