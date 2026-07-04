import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { buildSearchParams, readApiData } from '@/lib/api'
import { EXERCISE_IMAGE_BUCKET } from '@/lib/api/custom-exercise-input'
import { queryKeys } from '@/lib/api/query-keys'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import type { CustomExercisePayload } from './custom-exercise'
import type {
  ExerciseCategory,
  ExerciseFacetCatalog,
  ExerciseLibraryFilters,
  ExerciseSearchResult,
  FavoriteExercisesResult,
  HistoricalExerciseSet,
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
  // Static facet endpoints (categories, equipment, muscles). De-dup and reuse
  // across navigations is now handled by TanStack Query (staleTime: Infinity on
  // the facets query — see exerciseFacetsOptions) rather than a hand-rolled
  // cache, so this is a plain fetch (ADR-0007, Phase 3 retired src/lib/api/cache.ts).
  const response = await fetch(url)
  return readApiData<T>(response, `Failed to fetch ${url}`, {
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

export async function fetchExerciseHistory(
  exerciseId: string,
  limit = 50,
): Promise<HistoricalExerciseSet[]> {
  const params = buildSearchParams({ action: 'history', exerciseId, limit })
  const response = await fetch(`/api/workout-sets?${params.toString()}`)
  return await readApiData<HistoricalExerciseSet[]>(
    response,
    `Failed to fetch exercise history: ${response.status}`,
    { fallbackData: [] },
  )
}

// ----------------------------------------------------------------------------
// TanStack Query option factories (ADR-0007, Phase 3). The imperative fetchers
// above remain the transport; these wrap them with cache keys + policies so the
// feature hooks are thin useQuery/useInfiniteQuery/useMutation wrappers. Keys
// come only from queryKeys factories (single source: src/lib/api/query-keys).
// ----------------------------------------------------------------------------

const SEARCH_PAGE_SIZE = 20

/** Stable, serialisable filter object for the search query key. */
export function searchFilterKey(filters: ExerciseLibraryFilters) {
  return {
    query: filters.query.trim(),
    categories: uniqueValues(filters.categoryIds),
    equipment: uniqueValues(filters.equipment),
    muscleGroups: uniqueValues(filters.muscleGroups),
  }
}

/**
 * Infinite search over the exercise catalog. Replaces the hand-rolled
 * offset/append pagination in the old useExerciseLibrary — each page is a
 * distinct offset and TanStack Query merges them, guaranteeing last-request-wins
 * on filter flips. `favourites` is intentionally NOT a param here: that filter
 * is a pure client-side view over the favourites query (ADR-0005).
 */
export function exerciseSearchOptions(
  filters: ExerciseLibraryFilters,
  pageSize: number = SEARCH_PAGE_SIZE,
) {
  return infiniteQueryOptions({
    queryKey: queryKeys.exercises.search(searchFilterKey(filters)),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      searchExerciseLibrary(filters, { limit: pageSize, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.reduce((sum, page) => sum + page.items.length, 0) : undefined,
  })
}

/** Static catalog facets — never change outside a reseed, so cache forever. */
export function exerciseFacetsOptions() {
  return queryOptions({
    queryKey: queryKeys.exercises.facets(),
    queryFn: fetchExerciseFacetCatalog,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function favoriteExercisesOptions() {
  return queryOptions({
    queryKey: queryKeys.exercises.favourites(),
    queryFn: fetchFavoriteExercises,
  })
}

export function recentExercisesOptions(limit = 10) {
  return queryOptions({
    queryKey: queryKeys.exercises.recent(),
    queryFn: () => fetchRecentExercises(limit),
  })
}

export function suggestedExercisesOptions(options: {
  exerciseId?: string
  muscle?: string
  limit?: number
}) {
  return queryOptions({
    queryKey: [...queryKeys.exercises.suggestions(), options] as const,
    queryFn: () => fetchSuggestedExercises(options),
  })
}

export function exerciseHistoryOptions(exerciseId: string, limit = 50) {
  return queryOptions({
    queryKey: queryKeys.workoutSets.history(exerciseId),
    queryFn: () => fetchExerciseHistory(exerciseId, limit),
    enabled: Boolean(exerciseId),
  })
}

// ----------------------------------------------------------------------------
// Custom exercises (ADR-0004). Authenticated create/edit/archive + listing the
// caller's own custom exercise ids (so the UI can show edit affordances without
// the public catalog leaking creator ids), plus image upload to the public
// `exercise-images` bucket under the user's own folder.
// ----------------------------------------------------------------------------

export async function fetchMyCustomExerciseIds(): Promise<string[]> {
  const response = await fetch('/api/exercises/custom')
  const data = await readApiData<{ items: ExerciseWithParsedFields[]; exerciseIds: string[] }>(
    response,
    `Failed to fetch custom exercises: ${response.status}`,
    { fallbackData: { items: [], exerciseIds: [] } },
  )
  return data.exerciseIds
}

export async function createCustomExercise(
  payload: CustomExercisePayload,
): Promise<ExerciseWithParsedFields> {
  const response = await fetch('/api/exercises/custom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return await readApiData<ExerciseWithParsedFields>(
    response,
    `Failed to create exercise: ${response.status}`,
  )
}

export async function updateCustomExercise(
  id: string,
  payload: CustomExercisePayload,
): Promise<ExerciseWithParsedFields> {
  const params = buildSearchParams({ id })
  const response = await fetch(`/api/exercises/custom?${params.toString()}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return await readApiData<ExerciseWithParsedFields>(
    response,
    `Failed to update exercise: ${response.status}`,
  )
}

export async function archiveCustomExercise(
  id: string,
): Promise<{ exerciseId: string; archived: true }> {
  const params = buildSearchParams({ id })
  const response = await fetch(`/api/exercises/custom?${params.toString()}`, { method: 'DELETE' })
  return await readApiData<{ exerciseId: string; archived: true }>(
    response,
    `Failed to archive exercise: ${response.status}`,
    { fallbackData: { exerciseId: id, archived: true } },
  )
}

const SANITIZE_FILENAME = /[^a-zA-Z0-9._-]/g

// Upload an exercise image/GIF to the user's own folder and return its public
// URL. The folder's second segment is a fresh uuid (storage RLS only scopes on
// the leading uid segment), so we don't need the server-generated exercise id.
export async function uploadCustomExerciseImage(file: File, userId: string): Promise<string> {
  const supabase = await getSupabaseBrowserClient()
  const safeName = file.name.replace(SANITIZE_FILENAME, '_')
  const path = `${userId}/${crypto.randomUUID()}/${safeName}`

  const { error } = await supabase.storage
    .from(EXERCISE_IMAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw new Error(`Failed to upload image: ${error.message}`)

  const { data } = supabase.storage.from(EXERCISE_IMAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
