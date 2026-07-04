import { useCallback, useMemo } from 'react'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import { buildExerciseQuickPickLists, type ExerciseLibrarySearch } from './model'
import { useExerciseFilters } from './useExerciseFilters'
import { useExerciseQuickPicks } from './useExerciseQuickPicks'
import { useExerciseSearch } from './useExerciseSearch'
import { useFavoriteExercises } from './useFavoriteExercises'

interface UseExerciseLibraryOptions {
  initialSearch?: ExerciseLibrarySearch
  routeSearch?: ExerciseLibrarySearch
  onRouteSearchChange?: (search: ExerciseLibrarySearch) => void
  pageSize?: number
  // When false, the hook holds off its queries until this flips true. Lets the
  // exercise picker defer the whole catalog load until the user signals intent
  // (P1). Defaults to true so the dedicated /exercises browser loads eagerly.
  enabled?: boolean
}

/**
 * Composition façade over the four focused hooks the old ~530-line god-hook was
 * split into (ADR-0007, Phase 3): `useExerciseFilters` (filter state + URL
 * sync), `useExerciseSearch` (infinite catalog search + facets),
 * `useFavoriteExercises` (favourites query + optimistic toggle), and
 * `useExerciseQuickPicks` (recents + suggestions).
 *
 * It exists only to keep the two callers (`ExerciseBrowser`, `ExerciseSelector`)
 * and their tests unchanged — the flat state fields + `actions.*` public
 * contract is identical to the pre-migration hook. New code should prefer the
 * focused hooks directly.
 *
 * The favourites-only filter stays client-side (ADR-0005): when active, the
 * rendered list IS the favourites list (from the favourites query), the search
 * query is disabled so `/api/exercises/search` is never hit, and `total`/
 * `hasMore` reflect the in-memory favourites — no separate mirror ref, because
 * the favourites cache is the single source.
 */
export function useExerciseLibrary(options: UseExerciseLibraryOptions = {}) {
  const enabled = options.enabled ?? true
  const pageSize = options.pageSize ?? 20

  const filters = useExerciseFilters(options)
  const favouritesActive = filters.filters.favourites === true

  // Search is disabled while the favourites-only view is active — that view is
  // served entirely from the favourites cache (ADR-0005), so we never pay a
  // catalog search for it.
  const search = useExerciseSearch(filters.filters, enabled && !favouritesActive, pageSize)
  const favorites = useFavoriteExercises(enabled)
  const quickPicks = useExerciseQuickPicks(enabled)

  const { categoryLabelById, activeFilterChips } = filters.buildChips(search.categories)

  // Favourites-only: render the favourites list; otherwise the search results.
  const exercises: ExerciseWithParsedFields[] = favouritesActive
    ? favorites.favoriteExercises
    : search.exercises
  const total = favouritesActive ? favorites.favoriteExercises.length : search.total
  const hasMore = favouritesActive ? false : search.hasMore

  const loadMore = useCallback(async () => {
    if (favouritesActive || search.isLoadingMore || !search.hasMore) return
    await search.fetchNextPage()
  }, [favouritesActive, search])

  const quickPickLists = useMemo(
    () =>
      buildExerciseQuickPickLists({
        favorites: favorites.favoriteExercises,
        recent: quickPicks.recentExercises,
        suggested: quickPicks.suggestedExercises,
      }),
    [favorites.favoriteExercises, quickPicks.recentExercises, quickPicks.suggestedExercises],
  )

  return {
    // Search / catalog
    exercises,
    total,
    hasMore,
    isLoading: search.isLoading,
    isLoadingMore: search.isLoadingMore,
    categories: search.categories,
    equipmentTypes: search.equipmentTypes,
    muscleGroups: search.muscleGroups,
    // Filters
    filters: filters.filters,
    activeFilterCount: filters.activeFilterCount,
    activeFilterChips,
    categoryLabelById,
    // Favourites
    favoriteExercises: favorites.favoriteExercises,
    favoriteExerciseIds: favorites.favoriteExerciseIds,
    favoriteExerciseIdSet: favorites.favoriteExerciseIdSet,
    togglingFavoriteId: favorites.togglingFavoriteId,
    // Quick picks
    recentExercises: quickPicks.recentExercises,
    suggestedExercises: quickPicks.suggestedExercises,
    isLoadingQuickPicks: quickPicks.isLoadingQuickPicks,
    quickPickLists,
    actions: {
      applyFilters: filters.applyFilters,
      updateFilters: filters.updateFilters,
      setQuery: filters.setQuery,
      toggleCategory: filters.toggleCategory,
      toggleEquipment: filters.toggleEquipment,
      toggleMuscleGroup: filters.toggleMuscleGroup,
      toggleFavouritesFilter: filters.toggleFavouritesFilter,
      removeFilter: filters.removeFilter,
      resetFilters: filters.resetFilters,
      loadMore,
      toggleFavorite: favorites.toggleFavorite,
      loadSuggestedExercises: quickPicks.loadSuggestedExercises,
      clearSuggestedExercises: quickPicks.clearSuggestedExercises,
      // Re-read catalog + favourites (used after custom-exercise create/edit/
      // archive). Favourites refetch keeps the favourites-only view fresh.
      refresh: async () => {
        await Promise.all([search.refetch(), favorites.refetchFavorites()])
      },
      refreshQuickPicks: async () => {
        await Promise.all([favorites.refetchFavorites(), quickPicks.invalidateRecents()])
      },
    },
  }
}
