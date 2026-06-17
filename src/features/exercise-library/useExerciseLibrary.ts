import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import {
  fetchExerciseFacetCatalog,
  fetchFavoriteExercises,
  fetchRecentExercises,
  fetchSuggestedExercises,
  searchExerciseLibrary,
  toggleFavoriteExercise,
} from './client'
import {
  type ActiveExerciseFilterType,
  buildActiveFilterChips,
  buildExerciseQuickPickLists,
  type ExerciseCategory,
  type ExerciseLibraryFilters,
  type ExerciseLibrarySearch,
  type ExerciseSearchResult,
  emptyExerciseLibrarySearch,
  favoriteIdsFromResult,
  filtersFromRouteSearch,
  getActiveFilterCount,
  type RecentExerciseItem,
  routeSearchFromFilters,
  routeSearchKey,
  type SuggestedExerciseItem,
  toggleFilterValue,
  uniqueValues,
} from './model'

interface UseExerciseLibraryOptions {
  initialSearch?: ExerciseLibrarySearch
  routeSearch?: ExerciseLibrarySearch
  onRouteSearchChange?: (search: ExerciseLibrarySearch) => void
  pageSize?: number
  // When false, the hook holds off its mount fetches (facet catalog, favorites,
  // recent, initial search) until this flips true. Lets the exercise picker
  // defer the whole catalog load until the user signals intent (P1). Defaults
  // to true so the dedicated /exercises browser keeps loading eagerly.
  enabled?: boolean
}

interface ExerciseLibraryState {
  isLoading: boolean
  isLoadingMore: boolean
  filters: ExerciseLibraryFilters
  exercises: ExerciseWithParsedFields[]
  categories: ExerciseCategory[]
  equipmentTypes: string[]
  muscleGroups: string[]
  currentPage: number
  totalPages: number
  total: number
  hasMore: boolean
  isLoadingQuickPicks: boolean
  favoriteExerciseIds: string[]
  favoriteExercises: ExerciseWithParsedFields[]
  recentExercises: RecentExerciseItem[]
  suggestedExercises: SuggestedExerciseItem[]
  togglingFavoriteId: string | null
}

type FilterUpdates = Partial<ExerciseLibraryFilters>

function initialFiltersFromOptions(options: UseExerciseLibraryOptions): ExerciseLibraryFilters {
  return filtersFromRouteSearch(
    options.routeSearch || options.initialSearch || emptyExerciseLibrarySearch,
  )
}

function toSearchResultState(
  result: ExerciseSearchResult,
  _pageSize: number,
): Pick<ExerciseLibraryState, 'currentPage' | 'totalPages' | 'total' | 'hasMore'> {
  return {
    currentPage: result.page,
    totalPages: result.totalPages,
    total: result.total,
    hasMore: result.hasMore,
  }
}

export function useExerciseLibrary(options: UseExerciseLibraryOptions = {}) {
  const pageSize = options.pageSize ?? 20
  const enabled = options.enabled ?? true
  const routeSearch = options.routeSearch
  const onRouteSearchChange = options.onRouteSearchChange
  const lastAppliedRouteKey = useRef<string | null>(null)
  const filtersRef = useRef<ExerciseLibraryFilters>(initialFiltersFromOptions(options))
  const exercisesRef = useRef<ExerciseWithParsedFields[]>([])

  const [state, setState] = useState<ExerciseLibraryState>({
    isLoading: false,
    isLoadingMore: false,
    filters: filtersRef.current,
    exercises: [],
    categories: [],
    equipmentTypes: [],
    muscleGroups: [],
    currentPage: 1,
    totalPages: 1,
    total: 0,
    hasMore: false,
    isLoadingQuickPicks: false,
    favoriteExerciseIds: [],
    favoriteExercises: [],
    recentExercises: [],
    suggestedExercises: [],
    togglingFavoriteId: null,
  })

  const runSearch = useCallback(
    async (
      filters: ExerciseLibraryFilters,
      options?: {
        append?: boolean
        offset?: number
      },
    ) => {
      const append = options?.append ?? false
      const offset = options?.offset ?? 0

      setState((prev) => ({
        ...prev,
        isLoading: !append,
        isLoadingMore: append,
      }))

      try {
        const result = await searchExerciseLibrary(filters, {
          limit: pageSize,
          offset,
        })
        const nextExercises = append ? [...exercisesRef.current, ...result.items] : result.items
        exercisesRef.current = nextExercises

        setState((prev) => ({
          ...prev,
          exercises: nextExercises,
          ...toSearchResultState(result, pageSize),
          isLoading: false,
          isLoadingMore: false,
        }))
      } catch (error) {
        console.error('Exercise search failed:', error)
        if (!append) exercisesRef.current = []

        setState((prev) => ({
          ...prev,
          exercises: append ? prev.exercises : [],
          isLoading: false,
          isLoadingMore: false,
        }))
      }
    },
    [pageSize],
  )

  useEffect(() => {
    if (!enabled) return
    let isMounted = true

    async function loadCatalogSupport() {
      try {
        const [catalog, favorites, recent] = await Promise.all([
          fetchExerciseFacetCatalog(),
          fetchFavoriteExercises().catch(() => ({ items: [], exerciseIds: [] })),
          fetchRecentExercises(10).catch(() => ({ items: [] })),
        ])
        if (!isMounted) return

        setState((prev) => ({
          ...prev,
          categories: catalog.categories,
          equipmentTypes: catalog.equipmentTypes,
          muscleGroups: catalog.muscleGroups,
          favoriteExerciseIds: favoriteIdsFromResult(favorites),
          favoriteExercises: favorites.items,
          recentExercises: recent.items,
          isLoadingQuickPicks: false,
        }))
      } catch (error) {
        console.error('Failed to load exercise catalog support:', error)
        if (!isMounted) return

        setState((prev) => ({
          ...prev,
          isLoadingQuickPicks: false,
        }))
      }
    }

    setState((prev) => ({
      ...prev,
      isLoadingQuickPicks: true,
    }))
    loadCatalogSupport()

    return () => {
      isMounted = false
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    if (!routeSearch) {
      runSearch(filtersRef.current)
      return
    }

    const nextUrlKey = routeSearchKey(routeSearch)
    if (lastAppliedRouteKey.current === nextUrlKey) {
      lastAppliedRouteKey.current = null
      return
    }

    const nextFilters = filtersFromRouteSearch(routeSearch)
    filtersRef.current = nextFilters
    setState((prev) => ({
      ...prev,
      filters: nextFilters,
    }))
    runSearch(nextFilters)
  }, [routeSearch, runSearch, enabled])

  const applyFilters = useCallback(
    async (nextFilters: ExerciseLibraryFilters, syncRoute = true) => {
      const normalizedFilters: ExerciseLibraryFilters = {
        categoryIds: uniqueValues(nextFilters.categoryIds),
        equipment: uniqueValues(nextFilters.equipment),
        muscleGroups: uniqueValues(nextFilters.muscleGroups),
        query: nextFilters.query,
      }
      filtersRef.current = normalizedFilters

      setState((prev) => ({
        ...prev,
        filters: normalizedFilters,
        hasMore: false,
        currentPage: 1,
      }))

      await runSearch(normalizedFilters)

      if (syncRoute && onRouteSearchChange) {
        const nextRouteSearch = routeSearchFromFilters(normalizedFilters)
        lastAppliedRouteKey.current = routeSearchKey(nextRouteSearch)
        onRouteSearchChange(nextRouteSearch)
      }
    },
    [onRouteSearchChange, runSearch],
  )

  const updateFilters = useCallback(
    (updates: FilterUpdates) => {
      const nextFilters = {
        ...filtersRef.current,
        ...updates,
      }

      return applyFilters(nextFilters)
    },
    [applyFilters],
  )

  const resetFilters = useCallback(() => {
    return applyFilters({
      categoryIds: [],
      equipment: [],
      muscleGroups: [],
      query: '',
    })
  }, [applyFilters])

  const removeFilter = useCallback(
    (type: ActiveExerciseFilterType, value?: string) => {
      if (type === 'category' && value) {
        return updateFilters({
          categoryIds: filtersRef.current.categoryIds.filter((categoryId) => categoryId !== value),
        })
      }

      if (type === 'equipment' && value) {
        return updateFilters({
          equipment: filtersRef.current.equipment.filter((equipment) => equipment !== value),
        })
      }

      if (type === 'muscle' && value) {
        return updateFilters({
          muscleGroups: filtersRef.current.muscleGroups.filter((muscle) => muscle !== value),
        })
      }

      if (type === 'query') {
        return updateFilters({ query: '' })
      }

      return Promise.resolve()
    },
    [updateFilters],
  )

  const loadMore = useCallback(async () => {
    if (state.isLoadingMore || !state.hasMore) return

    await runSearch(filtersRef.current, {
      append: true,
      offset: exercisesRef.current.length,
    })
  }, [runSearch, state.hasMore, state.isLoadingMore])

  const refreshQuickPicks = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isLoadingQuickPicks: true,
    }))

    try {
      const [favorites, recent] = await Promise.all([
        fetchFavoriteExercises(),
        fetchRecentExercises(10),
      ])

      setState((prev) => ({
        ...prev,
        favoriteExerciseIds: favoriteIdsFromResult(favorites),
        favoriteExercises: favorites.items,
        recentExercises: recent.items,
        isLoadingQuickPicks: false,
      }))
    } catch (error) {
      console.error('Failed to refresh exercise quick picks:', error)
      setState((prev) => ({
        ...prev,
        isLoadingQuickPicks: false,
      }))
    }
  }, [])

  const toggleFavorite = useCallback(
    async (exerciseId: string) => {
      const wasFavorite = state.favoriteExerciseIds.includes(exerciseId)

      setState((prev) => ({
        ...prev,
        togglingFavoriteId: exerciseId,
        favoriteExerciseIds: wasFavorite
          ? prev.favoriteExerciseIds.filter((id) => id !== exerciseId)
          : uniqueValues([...prev.favoriteExerciseIds, exerciseId]),
      }))

      try {
        const result = await toggleFavoriteExercise(exerciseId, wasFavorite)
        const favorites = await fetchFavoriteExercises()

        setState((prev) => ({
          ...prev,
          favoriteExerciseIds: favoriteIdsFromResult(favorites),
          favoriteExercises: favorites.items,
          togglingFavoriteId:
            prev.togglingFavoriteId === result.exerciseId ? null : prev.togglingFavoriteId,
        }))
      } catch (error) {
        console.error('Failed to toggle favorite exercise:', error)
        setState((prev) => ({
          ...prev,
          favoriteExerciseIds: wasFavorite
            ? uniqueValues([...prev.favoriteExerciseIds, exerciseId])
            : prev.favoriteExerciseIds.filter((id) => id !== exerciseId),
          togglingFavoriteId: null,
        }))
      }
    },
    [state.favoriteExerciseIds],
  )

  const loadSuggestedExercises = useCallback(
    async (options: { exerciseId?: string; muscle?: string; limit?: number }) => {
      try {
        const result = await fetchSuggestedExercises(options)
        setState((prev) => ({
          ...prev,
          suggestedExercises: result.items,
        }))
      } catch (error) {
        console.error('Failed to load suggested exercises:', error)
        setState((prev) => ({
          ...prev,
          suggestedExercises: [],
        }))
      }
    },
    [],
  )

  const clearSuggestedExercises = useCallback(() => {
    setState((prev) => ({
      ...prev,
      suggestedExercises: [],
    }))
  }, [])

  const categoryLabelById = useMemo(
    () => new Map(state.categories.map((category) => [category.id, category.name])),
    [state.categories],
  )

  const activeFilterCount = useMemo(() => getActiveFilterCount(state.filters), [state.filters])
  const activeFilterChips = useMemo(
    () => buildActiveFilterChips(state.filters, categoryLabelById),
    [categoryLabelById, state.filters],
  )
  const favoriteExerciseIdSet = useMemo(
    () => new Set(state.favoriteExerciseIds),
    [state.favoriteExerciseIds],
  )
  const quickPickLists = useMemo(
    () =>
      buildExerciseQuickPickLists({
        favorites: state.favoriteExercises,
        recent: state.recentExercises,
        suggested: state.suggestedExercises,
      }),
    [state.favoriteExercises, state.recentExercises, state.suggestedExercises],
  )

  return {
    ...state,
    categoryLabelById,
    favoriteExerciseIdSet,
    activeFilterCount,
    activeFilterChips,
    quickPickLists,
    actions: {
      applyFilters,
      updateFilters,
      setQuery: (query: string) => updateFilters({ query }),
      toggleCategory: (categoryId: string) =>
        updateFilters({
          categoryIds: toggleFilterValue(filtersRef.current.categoryIds, categoryId),
        }),
      toggleEquipment: (equipment: string) =>
        updateFilters({
          equipment: toggleFilterValue(filtersRef.current.equipment, equipment),
        }),
      toggleMuscleGroup: (muscle: string) =>
        updateFilters({
          muscleGroups: toggleFilterValue(filtersRef.current.muscleGroups, muscle),
        }),
      removeFilter,
      resetFilters,
      loadMore,
      toggleFavorite,
      refreshQuickPicks,
      loadSuggestedExercises,
      clearSuggestedExercises,
      refresh: () => runSearch(filtersRef.current),
    },
  }
}
