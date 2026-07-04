import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { queryKeys } from '@/lib/api/query-keys'
import { recentExercisesOptions, suggestedExercisesOptions } from './client'
import type { SuggestedExerciseItem } from './model'

/**
 * Recents + suggestions quick-pick lists (ADR-0007, Phase 3).
 *
 * Recents are a straight `useQuery(['exercises','recent'])`. Suggestions are
 * parameterised by the anchor exercise/muscle, so the hook keeps the current
 * suggestion params in local state and drives a `useQuery(['exercises',
 * 'suggestions', params])` — `loadSuggestedExercises`/`clearSuggestedExercises`
 * just set/clear those params, preserving the old imperative API the selector
 * calls.
 */
export function useExerciseQuickPicks(enabled: boolean) {
  const queryClient = useQueryClient()
  const [suggestionParams, setSuggestionParams] = useState<{
    exerciseId?: string
    muscle?: string
    limit?: number
  } | null>(null)

  const recentQuery = useQuery({ ...recentExercisesOptions(10), enabled })

  const suggestedQuery = useQuery({
    ...suggestedExercisesOptions(suggestionParams ?? {}),
    enabled: enabled && suggestionParams !== null,
  })

  const loadSuggestedExercises = useCallback(
    async (options: { exerciseId?: string; muscle?: string; limit?: number }) => {
      setSuggestionParams(options)
      // Return the settled data so callers that await it (parity with the old
      // imperative loader) see the fetched list.
      await queryClient.ensureQueryData(suggestedExercisesOptions(options))
    },
    [queryClient],
  )

  const clearSuggestedExercises = useCallback(() => {
    setSuggestionParams(null)
  }, [])

  const suggestedExercises: SuggestedExerciseItem[] =
    suggestionParams === null ? [] : (suggestedQuery.data?.items ?? [])

  return {
    recentExercises: recentQuery.data?.items ?? [],
    suggestedExercises,
    isLoadingQuickPicks: recentQuery.isPending && enabled,
    loadSuggestedExercises,
    clearSuggestedExercises,
    invalidateRecents: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.exercises.recent() }),
  }
}
