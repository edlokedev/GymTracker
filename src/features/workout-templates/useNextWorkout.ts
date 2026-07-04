import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { nextWorkoutOptions } from './client'

export function useNextWorkout({ enabled = true }: { enabled?: boolean } = {}) {
  // Next-workout recommendation — a thin useQuery (ADR-0007, Phase 4). The
  // factory selects the recommendation out of the envelope, so `data` is already
  // `NextWorkoutRecommendation | null`.
  const query = useQuery({
    ...nextWorkoutOptions(),
    enabled,
  })

  const refresh = useCallback(async () => {
    await query.refetch()
  }, [query])

  return {
    recommendation: query.data ?? null,
    isLoading: query.isPending && enabled,
    error: query.error ? 'Failed to load next workout' : null,
    refresh,
  }
}
