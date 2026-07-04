import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type ActiveExerciseFilterType,
  buildActiveFilterChips,
  type ExerciseCategory,
  type ExerciseLibraryFilters,
  type ExerciseLibrarySearch,
  emptyExerciseLibrarySearch,
  filtersFromRouteSearch,
  getActiveFilterCount,
  routeSearchFromFilters,
  routeSearchKey,
  toggleFilterValue,
  uniqueValues,
} from './model'

interface UseExerciseFiltersOptions {
  initialSearch?: ExerciseLibrarySearch
  routeSearch?: ExerciseLibrarySearch
  onRouteSearchChange?: (search: ExerciseLibrarySearch) => void
}

type FilterUpdates = Partial<ExerciseLibraryFilters>

function initialFilters(options: UseExerciseFiltersOptions): ExerciseLibraryFilters {
  return filtersFromRouteSearch(
    options.routeSearch || options.initialSearch || emptyExerciseLibrarySearch,
  )
}

/**
 * Filter state + URL round-trip for the exercise library (extracted from the
 * old god-hook, behaviour-identical). Owns the `ExerciseLibraryFilters` object
 * that drives the search query key, plus the deep-link/route sync:
 *
 *   - `applyFilters` normalises and stores the next filters; when `syncRoute` is
 *     set it pushes them to the route via `onRouteSearchChange`, first stamping
 *     `lastAppliedRouteKey` so the resulting `routeSearch` prop change is a
 *     no-op (avoids a self-inflicted double-apply).
 *   - an incoming `routeSearch` prop that differs from what we just pushed
 *     (e.g. back/forward navigation, deep link) re-derives the filters.
 *
 * This hook holds no server state — server reads live in the query hooks. It
 * only decides *what* to search for.
 */
export function useExerciseFilters(options: UseExerciseFiltersOptions) {
  const { routeSearch, onRouteSearchChange } = options
  const lastAppliedRouteKey = useRef<string | null>(null)
  const [filters, setFilters] = useState<ExerciseLibraryFilters>(() => initialFilters(options))
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const applyFilters = useCallback(
    (nextFilters: ExerciseLibraryFilters, syncRoute = true) => {
      const normalized: ExerciseLibraryFilters = {
        categoryIds: uniqueValues(nextFilters.categoryIds),
        equipment: uniqueValues(nextFilters.equipment),
        muscleGroups: uniqueValues(nextFilters.muscleGroups),
        query: nextFilters.query,
        favourites: nextFilters.favourites,
      }
      setFilters(normalized)

      if (syncRoute && onRouteSearchChange) {
        const nextRouteSearch = routeSearchFromFilters(normalized)
        lastAppliedRouteKey.current = routeSearchKey(nextRouteSearch)
        onRouteSearchChange(nextRouteSearch)
      }
    },
    [onRouteSearchChange],
  )

  const updateFilters = useCallback(
    (updates: FilterUpdates) => applyFilters({ ...filtersRef.current, ...updates }),
    [applyFilters],
  )

  // Re-derive filters when the route search changes underneath us, skipping the
  // change we ourselves just pushed (matched by key).
  useEffect(() => {
    if (!routeSearch) return
    const nextKey = routeSearchKey(routeSearch)
    if (lastAppliedRouteKey.current === nextKey) {
      lastAppliedRouteKey.current = null
      return
    }
    applyFilters(filtersFromRouteSearch(routeSearch), false)
  }, [routeSearch, applyFilters])

  const resetFilters = useCallback(
    () =>
      applyFilters({
        categoryIds: [],
        equipment: [],
        muscleGroups: [],
        query: '',
      }),
    [applyFilters],
  )

  const removeFilter = useCallback(
    (type: ActiveExerciseFilterType, value?: string) => {
      if (type === 'category' && value) {
        return updateFilters({
          categoryIds: filtersRef.current.categoryIds.filter((id) => id !== value),
        })
      }
      if (type === 'equipment' && value) {
        return updateFilters({
          equipment: filtersRef.current.equipment.filter((eq) => eq !== value),
        })
      }
      if (type === 'muscle' && value) {
        return updateFilters({
          muscleGroups: filtersRef.current.muscleGroups.filter((m) => m !== value),
        })
      }
      if (type === 'query') return updateFilters({ query: '' })
      if (type === 'favourites') return updateFilters({ favourites: false })
    },
    [updateFilters],
  )

  const activeFilterCount = useMemo(() => getActiveFilterCount(filters), [filters])

  const buildChips = useCallback(
    (categories: ExerciseCategory[]) => {
      const labelById = new Map(categories.map((c) => [c.id, c.name]))
      return {
        categoryLabelById: labelById,
        activeFilterChips: buildActiveFilterChips(filters, labelById),
      }
    },
    [filters],
  )

  return {
    filters,
    filtersRef,
    activeFilterCount,
    buildChips,
    applyFilters,
    updateFilters,
    resetFilters,
    removeFilter,
    setQuery: (query: string) => updateFilters({ query }),
    toggleCategory: (categoryId: string) =>
      updateFilters({ categoryIds: toggleFilterValue(filtersRef.current.categoryIds, categoryId) }),
    toggleEquipment: (equipment: string) =>
      updateFilters({ equipment: toggleFilterValue(filtersRef.current.equipment, equipment) }),
    toggleMuscleGroup: (muscle: string) =>
      updateFilters({ muscleGroups: toggleFilterValue(filtersRef.current.muscleGroups, muscle) }),
    toggleFavouritesFilter: () => updateFilters({ favourites: !filtersRef.current.favourites }),
  }
}
