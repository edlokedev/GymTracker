import { buildSearchParams, readApiData } from '@/lib/api'
import type {
  ExerciseCategory,
  ExerciseFacetCatalog,
  ExerciseLibraryFilters,
  ExerciseSearchResult,
  FavoriteExercisesResult,
  RecentExercisesResult,
  SuggestedExercisesResult,
  ToggleFavoriteResult,
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

export function suggestedExercisesToApiSearchParams(options: {
  exerciseId?: string
  muscle?: string
  limit: number
}): URLSearchParams {
  return buildSearchParams({
    exerciseId: options.exerciseId,
    muscle: options.muscle,
    limit: options.limit,
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

export async function fetchFavoriteExercises(): Promise<FavoriteExercisesResult> {
  const response = await fetch('/api/exercise-favorites')
  return await readApiData<FavoriteExercisesResult>(
    response,
    `Failed to fetch favorite exercises: ${response.status}`,
    {
      fallbackData: {
        items: [],
        exerciseIds: [],
      },
    },
  )
}

export async function toggleFavoriteExercise(
  exerciseId: string,
  isCurrentlyFavorite: boolean,
): Promise<ToggleFavoriteResult> {
  const method = isCurrentlyFavorite ? 'DELETE' : 'POST'
  const url = isCurrentlyFavorite
    ? `/api/exercise-favorites?${buildSearchParams({ exerciseId }).toString()}`
    : '/api/exercise-favorites'
  const response = await fetch(url, {
    method,
    headers: isCurrentlyFavorite ? undefined : { 'Content-Type': 'application/json' },
    body: isCurrentlyFavorite ? undefined : JSON.stringify({ exerciseId }),
  })

  return await readApiData<ToggleFavoriteResult>(
    response,
    `Failed to toggle favorite exercise: ${response.status}`,
    {
      fallbackData: {
        exerciseId,
        isFavorite: !isCurrentlyFavorite,
      },
    },
  )
}

export async function fetchRecentExercises(limit = 10): Promise<RecentExercisesResult> {
  const response = await fetch(`/api/exercises/recent?${buildSearchParams({ limit }).toString()}`)
  return await readApiData<RecentExercisesResult>(
    response,
    `Failed to fetch recent exercises: ${response.status}`,
    {
      fallbackData: {
        items: [],
      },
    },
  )
}

export async function fetchSuggestedExercises(options: {
  exerciseId?: string
  muscle?: string
  limit?: number
}): Promise<SuggestedExercisesResult> {
  const params = suggestedExercisesToApiSearchParams({
    exerciseId: options.exerciseId,
    muscle: options.muscle,
    limit: options.limit ?? 10,
  })
  const response = await fetch(`/api/exercises/suggested?${params.toString()}`)

  return await readApiData<SuggestedExercisesResult>(
    response,
    `Failed to fetch suggested exercises: ${response.status}`,
    {
      fallbackData: {
        items: [],
      },
    },
  )
}
