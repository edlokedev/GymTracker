import { createFileRoute } from '@tanstack/react-router'
import ExerciseBrowser, {
  type ExerciseLibrarySearch,
} from '@/features/exercise-library/components/ExerciseBrowser'
import { emptyExerciseLibrarySearch } from '@/features/exercise-library/model'

export const Route = createFileRoute('/exercises')({
  validateSearch: (search: Record<string, unknown>): ExerciseLibrarySearch => ({
    category_id: normalizeSearchArray(search.category_id),
    equipment: normalizeSearchArray(search.equipment),
    muscle_group: normalizeSearchArray(search.muscle_group),
    query: typeof search.query === 'string' ? search.query : '',
    favourites: search.favourites === 'true' || search.favourites === true,
  }),
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
