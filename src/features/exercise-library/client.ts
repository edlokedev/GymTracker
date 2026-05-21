import { buildSearchParams, readApiData, readApiResult } from '@/lib/api'
import type {
  ExerciseCategory,
  ExerciseFacetCatalog,
  ExerciseLibraryFilters,
  ExerciseSearchResult,
} from './model'
import { uniqueValues } from './model'

export function filtersToApiSearchParams(
  filters: ExerciseLibraryFilters,
  options: { limit: number; offset: number },
): URLSearchParams {
  return buildSearchParams({
    category_id: uniqueValues(filters.categoryIds),
    equipment: uniqueValues(filters.equipment),
    muscle_group: uniqueValues(filters.muscleGroups),
    query: filters.query.trim(),
    limit: options.limit,
    offset: options.offset,
  })
}

async function fetchJsonData<T>(url: string, fallback: T): Promise<T> {
  const response = await fetch(url)
  return readApiData(response, `Failed to fetch ${url}`, {
    fallbackData: fallback,
  })
}

export async function fetchExerciseFacetCatalog(): Promise<ExerciseFacetCatalog> {
  const [categories, equipmentTypes, muscleGroups] = await Promise.all([
    fetchJsonData<ExerciseCategory[]>('/api/exercise-categories', []),
    fetchJsonData<string[]>('/api/equipment-types', []),
    fetchJsonData<string[]>('/api/muscle-groups', []),
  ])

  return { categories, equipmentTypes, muscleGroups }
}

export async function searchExerciseLibrary(
  filters: ExerciseLibraryFilters,
  options: { limit: number; offset: number },
): Promise<ExerciseSearchResult> {
  const params = filtersToApiSearchParams(filters, options)
  const response = await fetch(`/api/exercises/search?${params.toString()}`)
  const result = (await readApiResult(
    response,
    `Failed to search exercises: ${response.status}`,
  )) as ExerciseSearchResult
  const data = result.data || []

  return {
    ...result,
    data,
    hasMore:
      typeof result.hasMore === 'boolean'
        ? result.hasMore
        : result.page < result.totalPages || data.length >= options.limit,
  }
}
