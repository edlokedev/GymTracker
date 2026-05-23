import { buildSearchParams, readApiData } from '@/lib/api'
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
  // The envelope's `data` field carries the search payload directly. The
  // server is now the single source of truth for `hasMore`, so no client-side
  // fallback is needed.
  return await readApiData<ExerciseSearchResult>(
    response,
    `Failed to search exercises: ${response.status}`,
    {
      fallbackData: {
        items: [],
        total: 0,
        page: 1,
        totalPages: 1,
        hasMore: false,
      },
    },
  )
}
