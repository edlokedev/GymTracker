import { useCallback, useEffect, useState } from 'react'
import type { NextWorkoutRecommendation } from '@/lib/types/database'
import { loadNextWorkout } from './client'

export function useNextWorkout({ enabled = true }: { enabled?: boolean } = {}) {
  const [recommendation, setRecommendation] = useState<NextWorkoutRecommendation | null>(null)
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setRecommendation(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const result = await loadNextWorkout()
      setRecommendation(result.recommendation)
    } catch (loadError) {
      console.error('Failed to load next workout:', loadError)
      setError('Failed to load next workout')
      setRecommendation(null)
    } finally {
      setIsLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { recommendation, isLoading, error, refresh }
}
