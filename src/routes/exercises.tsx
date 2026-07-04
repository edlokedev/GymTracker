import { createFileRoute } from '@tanstack/react-router'
import { exerciseFacetsOptions, exerciseSearchOptions } from '@/features/exercise-library/client'
import ExerciseBrowser, {
  type ExerciseLibrarySearch,
} from '@/features/exercise-library/components/ExerciseBrowser'
import {
  emptyExerciseLibrarySearch,
  filtersFromRouteSearch,
} from '@/features/exercise-library/model'

export const Route = createFileRoute('/exercises')({
  validateSearch: (search: Record<string, unknown>): ExerciseLibrarySearch => ({
    category_id: normalizeSearchArray(search.category_id),
    equipment: normalizeSearchArray(search.equipment),
    muscle_group: normalizeSearchArray(search.muscle_group),
    query: typeof search.query === 'string' ? search.query : '',
    favourites: search.favourites === 'true' || search.favourites === true,
  }),
  loaderDeps: ({ search }) => ({ search }),
  // Loader prefetches the PUBLIC catalog data the first paint needs: the static
  // facet catalog and the first search page for the incoming filters. Both hit
  // publicMethod routes (/api/exercise-categories|equipment-types|muscle-groups,
  // /api/exercises/search), so SSR has the data with no user — allowed pre-P13
  // (ADR-0007). Private slices (favourites/recents/suggestions) stay client-fetch
  // until P13. Favourites filter is a client-side view (ADR-0005), so the loader
  // always prefetches the base search regardless of the favourites flag.
  loader: async ({ context: { queryClient }, deps: { search } }) => {
    await Promise.all([
      queryClient.ensureQueryData(exerciseFacetsOptions()),
      queryClient.ensureInfiniteQueryData(exerciseSearchOptions(filtersFromRouteSearch(search))),
    ])
  },
  component: ExercisesPage,
})

function ExercisesPage() {
  const search = Route.useSearch()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ExerciseBrowser initialFilters={search || emptyExerciseLibrarySearch} />
    </div>
  )
}

function normalizeSearchArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  }

  return typeof value === 'string' && value.length > 0 ? [value] : []
}
