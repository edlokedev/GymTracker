import type { ExerciseWithParsedFields } from '@/lib/types/database'
import { toTitleCase } from '@/lib/utils/text'

export interface ExerciseCategory {
  id: string
  name: string
  description?: string
  exercise_count: number
}

export interface ExerciseLibrarySearch {
  category_id?: string[]
  equipment?: string[]
  muscle_group?: string[]
  query?: string
  favourites?: boolean
}

export interface ExerciseLibraryFilters {
  categoryIds: string[]
  equipment: string[]
  muscleGroups: string[]
  query: string
  favourites?: boolean
}

// Inner payload returned by /api/exercises/search inside the envelope's
// `data` field. The exercise array is `items` (not `data`) so consumers
// don't end up with `result.data.data`. `hasMore` is computed server-side
// from offset + items.length < total, so it's always present.
export interface ExerciseSearchResult {
  items: ExerciseWithParsedFields[]
  total: number
  page: number
  totalPages: number
  hasMore: boolean
}

export interface ExerciseFacetCatalog {
  categories: ExerciseCategory[]
  equipmentTypes: string[]
  muscleGroups: string[]
}

export interface FavoriteExercisesResult {
  items: ExerciseWithParsedFields[]
  exerciseIds: string[]
}

export interface ToggleFavoriteResult {
  exerciseId: string
  isFavorite: boolean
}

export interface RecentExerciseItem {
  exercise: ExerciseWithParsedFields
  lastUsedAt: string
  useCount: number
}

export interface RecentExercisesResult {
  items: RecentExerciseItem[]
}

export interface SuggestedExerciseItem {
  exercise: ExerciseWithParsedFields
  score: number
  reasons: string[]
}

export interface SuggestedExercisesResult {
  items: SuggestedExerciseItem[]
}

export interface ExerciseQuickPickLists {
  favorites: ExerciseWithParsedFields[]
  recent: RecentExerciseItem[]
  suggested: SuggestedExerciseItem[]
}

export type ActiveExerciseFilterType = 'category' | 'equipment' | 'muscle' | 'query' | 'favourites'

export interface ActiveExerciseFilterChip {
  type: ActiveExerciseFilterType
  prefix: string
  label: string
  value?: string
}

export const emptyExerciseLibrarySearch: ExerciseLibrarySearch = {
  category_id: [],
  equipment: [],
  muscle_group: [],
  query: '',
}

export function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

export function favoriteIdsFromResult(result: FavoriteExercisesResult): string[] {
  return uniqueValues(
    result.exerciseIds.length > 0 ? result.exerciseIds : result.items.map((item) => item.id),
  )
}

export function buildExerciseQuickPickLists({
  favorites,
  recent,
  suggested,
}: ExerciseQuickPickLists): ExerciseQuickPickLists {
  return {
    favorites,
    recent,
    suggested,
  }
}

export function filtersFromRouteSearch(search: ExerciseLibrarySearch): ExerciseLibraryFilters {
  return {
    categoryIds: uniqueValues(search.category_id ?? []),
    equipment: uniqueValues(search.equipment ?? []),
    muscleGroups: uniqueValues(search.muscle_group ?? []),
    query: search.query || '',
    favourites: search.favourites === true ? true : undefined,
  }
}

export function routeSearchFromFilters(filters: ExerciseLibraryFilters): ExerciseLibrarySearch {
  return {
    category_id: uniqueValues(filters.categoryIds),
    equipment: uniqueValues(filters.equipment),
    muscle_group: uniqueValues(filters.muscleGroups),
    query: filters.query.trim(),
    favourites: filters.favourites === true ? true : undefined,
  }
}

export function routeSearchKey(search: ExerciseLibrarySearch): string {
  return JSON.stringify({
    category_id: uniqueValues(search.category_id ?? []).sort(),
    equipment: uniqueValues(search.equipment ?? []).sort(),
    muscle_group: uniqueValues(search.muscle_group ?? []).sort(),
    query: search.query || '',
    favourites: search.favourites === true,
  })
}

export function routeSearchToNavigateSearch(search: ExerciseLibrarySearch): ExerciseLibrarySearch {
  return {
    category_id:
      search.category_id && search.category_id.length > 0 ? search.category_id : undefined,
    equipment: search.equipment && search.equipment.length > 0 ? search.equipment : undefined,
    muscle_group:
      search.muscle_group && search.muscle_group.length > 0 ? search.muscle_group : undefined,
    query: search.query || undefined,
    favourites: search.favourites === true ? true : undefined,
  }
}

export function toggleFilterValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

export function getActiveFilterCount(filters: ExerciseLibraryFilters): number {
  return (
    filters.categoryIds.length +
    filters.equipment.length +
    filters.muscleGroups.length +
    (filters.query.trim() ? 1 : 0) +
    (filters.favourites === true ? 1 : 0)
  )
}

export function buildActiveFilterChips(
  filters: ExerciseLibraryFilters,
  categoryLabelById: Map<string, string>,
): ActiveExerciseFilterChip[] {
  const chips: ActiveExerciseFilterChip[] = []

  if (filters.favourites === true) {
    chips.push({
      type: 'favourites',
      prefix: 'Show',
      label: 'Favourites',
    })
  }

  if (filters.query.trim()) {
    chips.push({
      type: 'query',
      prefix: 'Search',
      label: filters.query.trim(),
    })
  }

  filters.categoryIds.forEach((categoryId) => {
    chips.push({
      type: 'category',
      prefix: 'Category',
      label: categoryLabelById.get(categoryId) || categoryId,
      value: categoryId,
    })
  })

  filters.muscleGroups.forEach((muscle) => {
    chips.push({
      type: 'muscle',
      prefix: 'Muscle',
      label: toTitleCase(muscle),
      value: muscle,
    })
  })

  filters.equipment.forEach((equipment) => {
    chips.push({
      type: 'equipment',
      prefix: 'Equipment',
      label: toTitleCase(equipment),
      value: equipment,
    })
  })

  return chips
}
