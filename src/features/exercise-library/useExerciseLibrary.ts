import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import { fetchExerciseFacetCatalog, searchExerciseLibrary } from './client'
import {
  type ActiveExerciseFilterType,
  buildActiveFilterChips,
  type ExerciseCategory,
  type ExerciseLibraryFilters,
  type ExerciseLibrarySearch,
  type ExerciseSearchResult,
  emptyExerciseLibrarySearch,
  filtersFromRouteSearch,
  getActiveFilterCount,
  routeSearchFromFilters,
  routeSearchKey,
  toggleFilterValue,
  uniqueValues,
} from './model'

interface UseExerciseLibraryOptions {
  initialSearch?: ExerciseLibrarySearch
  routeSearch?: ExerciseLibrarySearch
  onRouteSearchChange?: (search: ExerciseLibrarySearch) => void
  pageSize?: number
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
  hasMore: boolean
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
): Pick<ExerciseLibraryState, 'currentPage' | 'totalPages' | 'hasMore'> {
  return {
    currentPage: result.page,
    totalPages: result.totalPages,
    hasMore: result.hasMore,
  }
}

export function useExerciseLibrary(options: UseExerciseLibraryOptions = {}) {
  const pageSize = options.pageSize ?? 20
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
    hasMore: false,
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
    let isMounted = true

    async function loadFacets() {
      try {
        const catalog = await fetchExerciseFacetCatalog()
        if (!isMounted) return

        setState((prev) => ({
          ...prev,
          categories: catalog.categories,
          equipmentTypes: catalog.equipmentTypes,
          muscleGroups: catalog.muscleGroups,
        }))
      } catch (error) {
        console.error('Failed to load exercise facets:', error)
      }
    }

    loadFacets()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
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
  }, [routeSearch, runSearch])

  const applyFilters = useCallback(
    async (nextFilters: ExerciseLibraryFilters, syncRoute = true) => {
      const normalizedFilters: ExerciseLibraryFilters = {
        categoryIds: uniqueValues(nextFilters.categoryIds),
        equipment: uniqueValues(nextFilters.equipment),
        muscleGroups: uniqueValues(nextFilters.muscleGroups),
        query: nextFilters.query,
      }
      filtersRef.current = normalizedFilters
      exercisesRef.current = []

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

  const categoryLabelById = useMemo(
    () => new Map(state.categories.map((category) => [category.id, category.name])),
    [state.categories],
  )

  const activeFilterCount = useMemo(() => getActiveFilterCount(state.filters), [state.filters])
  const activeFilterChips = useMemo(
    () => buildActiveFilterChips(state.filters, categoryLabelById),
    [categoryLabelById, state.filters],
  )

  return {
    ...state,
    categoryLabelById,
    activeFilterCount,
    activeFilterChips,
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
      refresh: () => runSearch(filtersRef.current),
    },
  }
}
