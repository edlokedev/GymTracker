import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { queryKeys } from '@/lib/api/query-keys'
import { favoriteExercisesOptions, toggleFavoriteExercise } from './client'
import { type FavoriteExercisesResult, favoriteIdsFromResult } from './model'

/**
 * Favourite exercises query + optimistic toggle mutation (ADR-0007, Phase 3).
 *
 * Replaces the god-hook's hand-rolled optimistic state machine and the
 * `reflectFavouritesIfActive` mirror-ref patch-ups: the favourites list lives in
 * the `['exercises','favourites']` cache, and the toggle mutation does the
 * optimistic flip in `onMutate`, rolls back in `onError`, and re-reads the
 * server list in `onSettled`. Any consumer of the favourites view re-renders
 * automatically from the cache — no manual list synchronisation.
 *
 * Favourites stay a client-side filter (ADR-0005): the whole favourites list is
 * fetched here and the favourites-only browse view is rendered from it directly,
 * never from the search API.
 */
export function useFavoriteExercises(enabled: boolean) {
  const queryClient = useQueryClient()
  const favouritesKey = queryKeys.exercises.favourites()

  const favoritesQuery = useQuery({ ...favoriteExercisesOptions(), enabled })

  // Mirrors the old `togglingFavoriteId` — the single exercise whose toggle is
  // in flight, used by the UI to disable stars during the round-trip.
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(null)

  const toggleMutation = useMutation({
    mutationFn: ({ exerciseId, wasFavorite }: { exerciseId: string; wasFavorite: boolean }) =>
      toggleFavoriteExercise(exerciseId, wasFavorite),
    onMutate: async ({ exerciseId, wasFavorite }) => {
      setTogglingFavoriteId(exerciseId)
      await queryClient.cancelQueries({ queryKey: favouritesKey })
      const previous = queryClient.getQueryData<FavoriteExercisesResult>(favouritesKey)

      // Optimistically flip: only removals can be reflected against the
      // in-memory list (an add's full exercise row isn't known until the
      // server round-trip and the onSettled refetch). This matches the old
      // hand-rolled toggle, which optimistically dropped a removed favourite
      // and deferred adds to the refetch.
      if (previous) {
        queryClient.setQueryData<FavoriteExercisesResult>(favouritesKey, {
          items: wasFavorite
            ? previous.items.filter((item) => item.id !== exerciseId)
            : previous.items,
          exerciseIds: wasFavorite
            ? previous.exerciseIds.filter((id) => id !== exerciseId)
            : Array.from(new Set([...previous.exerciseIds, exerciseId])),
        })
      }

      return { previous }
    },
    onError: (_error, _variables, context) => {
      // Roll back to the snapshot taken before the optimistic update.
      if (context?.previous) {
        queryClient.setQueryData(favouritesKey, context.previous)
      }
    },
    onSettled: () => {
      setTogglingFavoriteId(null)
      void queryClient.invalidateQueries({ queryKey: favouritesKey })
    },
  })

  const favorites = favoritesQuery.data ?? { items: [], exerciseIds: [] }
  const favoriteExerciseIds = useMemo(() => favoriteIdsFromResult(favorites), [favorites])
  const favoriteExerciseIdSet = useMemo(() => new Set(favoriteExerciseIds), [favoriteExerciseIds])

  return {
    favoriteExercises: favorites.items,
    favoriteExerciseIds,
    favoriteExerciseIdSet,
    togglingFavoriteId,
    isLoadingFavorites: favoritesQuery.isPending && enabled,
    // Fire-and-forget from the caller's perspective (parity with the old hook,
    // which caught internally): the error path is handled by the mutation's
    // onError rollback, so the returned promise never rejects — callers `void`
    // it without needing their own catch.
    toggleFavorite: (exerciseId: string) => {
      const wasFavorite = favoriteExerciseIds.includes(exerciseId)
      return toggleMutation.mutateAsync({ exerciseId, wasFavorite }).catch(() => {})
    },
    refetchFavorites: favoritesQuery.refetch,
  }
}
