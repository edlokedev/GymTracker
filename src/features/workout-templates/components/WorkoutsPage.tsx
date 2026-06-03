import { Link, useNavigate } from '@tanstack/react-router'
import { ArchiveIcon, EditIcon, PlayIcon, PlusIcon } from '@/components/ui/ActionIcons'
import { InlineError } from '@/components/ui/InlineError'
import type { WorkoutTemplateWithExercises } from '@/lib/types/database'
import { useWorkoutTemplates } from '../useWorkoutTemplates'

export function WorkoutsPage() {
  const navigate = useNavigate()
  const templates = useWorkoutTemplates()

  const startSavedWorkout = (templateId: string) => {
    navigate({ to: '/workout', search: { templateId } })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-bold text-2xl text-gray-900 dark:text-white">Workouts</h1>
            <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">
              Saved workouts you can start or adjust before training.
            </p>
          </div>
          <Link
            to="/workouts/new"
            className="motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-sm text-white shadow-sm hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4" />
            New Workout
          </Link>
        </div>

        <InlineError message={templates.error} className="mb-4" />

        {templates.isLoading ? (
          <WorkoutsSkeleton />
        ) : templates.templates.length === 0 ? (
          <EmptyWorkouts />
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {templates.templates.map((template) => (
                <SavedWorkoutRow
                  key={template.id}
                  template={template}
                  isArchiving={templates.archivingId === template.id}
                  onStart={() => startSavedWorkout(template.id)}
                  onArchive={() => void templates.actions.archive(template.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function WorkoutsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-24 animate-pulse rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
        />
      ))}
    </div>
  )
}

function EmptyWorkouts() {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-800">
      <h2 className="font-semibold text-gray-900 text-lg dark:text-white">No saved workouts</h2>
      <p className="mx-auto mt-2 max-w-md text-gray-600 text-sm dark:text-gray-400">
        Save a completed workout or build one here.
      </p>
      <Link
        to="/workouts/new"
        className="motion-press mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-sm text-white hover:bg-blue-700"
      >
        <PlusIcon className="h-4 w-4" />
        New Workout
      </Link>
    </div>
  )
}

function SavedWorkoutRow({
  template,
  isArchiving,
  onStart,
  onArchive,
}: {
  template: WorkoutTemplateWithExercises
  isArchiving: boolean
  onStart: () => void
  onArchive: () => void
}) {
  const exerciseCount = template.exercises.length
  const targetSets = template.exercises.reduce(
    (total, item) => total + (item.templateExercise.target_sets ?? 0),
    0,
  )
  const lastUsed = template.last_used_at
    ? new Date(template.last_used_at).toLocaleDateString()
    : 'Never used'

  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate font-semibold text-gray-900 text-lg dark:text-white">
            {template.name}
          </h2>
          <span className="rounded bg-gray-100 px-2 py-1 font-medium text-gray-600 text-xs dark:bg-gray-700 dark:text-gray-300">
            Saved workout
          </span>
        </div>
        {template.notes && (
          <p className="mt-1 line-clamp-2 text-gray-600 text-sm dark:text-gray-400">
            {template.notes}
          </p>
        )}
        <p className="mt-2 text-gray-500 text-sm dark:text-gray-400">
          {exerciseCount} exercises · {targetSets || 'No'} target sets · {lastUsed}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onStart}
          aria-label={`Start ${template.name}`}
          title="Start"
          className="motion-press inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          <PlayIcon className="h-5 w-5" />
        </button>
        <Link
          to="/workouts/$templateId/edit"
          params={{ templateId: template.id }}
          aria-label={`Edit ${template.name}`}
          title="Edit"
          className="motion-press inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <EditIcon className="h-5 w-5" />
        </Link>
        <button
          type="button"
          onClick={onArchive}
          disabled={isArchiving}
          aria-label={`Archive ${template.name}`}
          title={isArchiving ? 'Archiving' : 'Archive'}
          className="motion-press inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
        >
          <ArchiveIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
