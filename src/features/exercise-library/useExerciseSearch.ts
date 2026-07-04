import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import { exerciseFacetsOptions, exerciseSearchOptions } from './client'
import type { ExerciseLibraryFilters } from './model'

/**
 * Catalog search + facets via TanStack Query (ADR-0007, Phase 3).
 *
 * Replaces the hand-rolled offset/append pagination and the mount facet fetch
 * that used to live in the `useExerciseLibrary` god-hook:
 *   - search  → `useInfiniteQuery(exerciseSearchOptions(filters))`; pages are
 *     flattened into a single `exercises` list, and Query's request identity
 *     guarantees last-request-wins on rapid filter flips (no manual race token).
 *   - facets  → `useQuery(exerciseFacetsOptions())` with `staleTime: Infinity`
 *     (replaces the deleted `src/lib/api/cache.ts` TTL cache).
 *
 * The favourites-only view is NOT handled here — it is a pure client-side slice
 * over the favourites query (ADR-0005), composed by the façade. Callers pass a
 * non-favourites filter object; when the favourites filter is active the façade
 * simply doesn't consume this hook's list.
 */
export function useExerciseSearch(
  filters: ExerciseLibraryFilters,
  enabled: boolean,
  pageSize?: number,
) {
  const searchQuery = useInfiniteQuery({
    ...exerciseSearchOptions(filters, pageSize),
    enabled,
  })

  const facetsQuery = useQuery({ ...exerciseFacetsOptions(), enabled })

  const exercises: ExerciseWithParsedFields[] = useMemo(
    () => searchQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [searchQuery.data],
  )

  const lastPage = searchQuery.data?.pages.at(-1)
  const total = lastPage?.total ?? 0
  const facets = facetsQuery.data

  return {
    exercises,
    total,
    // `isLoading` is the initial page load; `isLoadingMore` is a subsequent
    // page fetch — matching the two flags the old hook exposed.
    isLoading: searchQuery.isPending && enabled,
    isLoadingMore: searchQuery.isFetchingNextPage,
    hasMore: searchQuery.hasNextPage,
    categories: facets?.categories ?? [],
    equipmentTypes: facets?.equipmentTypes ?? [],
    muscleGroups: facets?.muscleGroups ?? [],
    fetchNextPage: searchQuery.fetchNextPage,
    refetch: searchQuery.refetch,
  }
}
