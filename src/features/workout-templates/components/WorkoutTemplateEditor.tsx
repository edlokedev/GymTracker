import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { ArrowDownIcon, ArrowLeftIcon, ArrowUpIcon, SaveIcon } from '@/components/ui/ActionIcons'
import { InlineError } from '@/components/ui/InlineError'
import { TrashButton } from '@/components/ui/TrashButton'
import ExerciseSelector from '@/features/exercise-library/components/ExerciseSelector'
import { queryKeys } from '@/lib/api/query-keys'
import type { ExerciseWithParsedFields, WorkoutTemplateWithExercises } from '@/lib/types/database'
import { formatExerciseName } from '@/lib/utils/text'
import {
  createWorkoutTemplate,
  updateWorkoutTemplate,
  type WorkoutTemplateExerciseWriteInput,
  workoutTemplateDetailOptions,
} from '../client'

interface TemplateEditorExercise {
  exercise: ExerciseWithParsedFields
  targetSets: number
  notes: string
}

interface WorkoutTemplateEditorProps {
  templateId?: string
}

export function WorkoutTemplateEditor({ templateId }: WorkoutTemplateEditorProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = Boolean(templateId)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState<TemplateEditorExercise[]>([])
  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithParsedFields | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Detail load → query (ADR-0007, Phase 4). Local editor state is seeded from
  // the query on arrival; the in-flight edits (name/notes/exercises) stay local
  // — the query owns the server read, not the draft.
  const detailQuery = useQuery({
    ...workoutTemplateDetailOptions(templateId ?? ''),
    enabled: Boolean(templateId),
  })

  // Seed the editor draft from the query data when it arrives. `detailQuery.data`
  // identity only changes on a fresh load/refetch, so this doesn't stomp edits on
  // unrelated re-renders.
  useEffect(() => {
    const template = detailQuery.data
    if (!template) return
    setName(template.name)
    setNotes(template.notes ?? '')
    setExercises(mapTemplateToEditorExercises(template))
  }, [detailQuery.data])

  const isLoading = Boolean(templateId) && detailQuery.isPending
  const loadError = detailQuery.error
    ? detailQuery.error instanceof Error
      ? detailQuery.error.message
      : 'Failed to load saved workout'
    : null

  const canSave = useMemo(() => name.trim().length > 0 && exercises.length > 0, [exercises, name])

  const addExercise = (exercise: ExerciseWithParsedFields) => {
    setSelectedExercise(null)
    // Compute the next value first, then set state, then run the effect (surface
    // a duplicate error) — no setState called from inside a state updater
    // (issue #0011; StrictMode double-invokes updaters, so effects there fire
    // twice).
    const isDuplicate = exercises.some((item) => item.exercise.id === exercise.id)
    if (isDuplicate) {
      setError('This exercise is already in this saved workout.')
      return
    }
    setError(null)
    setExercises((current) => [...current, { exercise, targetSets: 3, notes: '' }])
  }

  const moveExercise = (index: number, direction: -1 | 1) => {
    setExercises((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(nextIndex, 0, item)
      return next
    })
  }

  // Create/update → mutation (ADR-0007, Phase 4). On success, invalidate the
  // whole templates subtree (list + this detail) so re-reads reflect the write,
  // then navigate back. Invalidation just re-reads the API result — it does NOT
  // fix the lib-layer transactionless delete-then-insert (#0004), which stays
  // its own issue.
  const saveMutation = useMutation({
    mutationFn: (input: {
      name: string
      notes?: string
      exercises: WorkoutTemplateExerciseWriteInput[]
    }) => (templateId ? updateWorkoutTemplate(templateId, input) : createWorkoutTemplate(input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workoutTemplates.all })
      navigate({ to: '/workouts' })
    },
  })

  const save = async () => {
    if (!canSave) {
      setError('Name and at least one exercise are required.')
      return
    }

    const input = {
      name: name.trim(),
      notes: notes.trim() || undefined,
      exercises: exercises.map<WorkoutTemplateExerciseWriteInput>((item) => ({
        exerciseId: item.exercise.id,
        targetSets: item.targetSets,
        notes: item.notes.trim() || undefined,
      })),
    }

    setError(null)
    try {
      await saveMutation.mutateAsync(input)
    } catch (saveError) {
      console.error('Failed to save workout:', saveError)
    }
  }

  const isSaving = saveMutation.isPending
  const saveError = saveMutation.error
    ? saveMutation.error instanceof Error
      ? saveMutation.error.message
      : 'Failed to save workout'
    : null
  // Local validation error (`error`) plus the load/save errors surfaced by the
  // query/mutation. Validation and save share the same banner as before.
  const displayError = error ?? saveError ?? loadError

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="h-80 animate-pulse rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-bold text-2xl text-gray-900 dark:text-white">
              {isEditing ? 'Edit Workout' : 'New Workout'}
            </h1>
            <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">
              Build reusable workout structure, not logged performance.
            </p>
          </div>
          <Link
            to="/workouts"
            className="motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 text-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Workouts
          </Link>
        </div>

        <InlineError message={displayError} className="mb-4" />

        <div className="space-y-4">
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Name
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Push Day"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300">
                  Notes
                </span>
                <input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Optional"
                />
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-lg dark:text-white">Exercises</h2>
              <span className="text-gray-500 text-sm dark:text-gray-400">
                {exercises.length} selected
              </span>
            </div>

            {exercises.length === 0 ? (
              <div className="mb-4 rounded-lg border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
                <p className="font-medium text-gray-900 dark:text-white">No exercises yet</p>
                <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">
                  Add exercises in the order you want to train.
                </p>
              </div>
            ) : (
              <div className="mb-4 divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
                {exercises.map((item, index) => (
                  <EditorExerciseRow
                    key={item.exercise.id}
                    item={item}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === exercises.length - 1}
                    onMove={moveExercise}
                    onRemove={() =>
                      setExercises((current) =>
                        current.filter((exercise) => exercise.exercise.id !== item.exercise.id),
                      )
                    }
                    onChange={(patch) =>
                      setExercises((current) =>
                        current.map((exercise) =>
                          exercise.exercise.id === item.exercise.id
                            ? { ...exercise, ...patch }
                            : exercise,
                        ),
                      )
                    }
                  />
                ))}
              </div>
            )}

            <ExerciseSelector onSelectExercise={addExercise} selectedExercise={selectedExercise} />
          </section>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Link
              to="/workouts"
              className="motion-press inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 text-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={save}
              disabled={isSaving || !canSave}
              className="motion-press inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SaveIcon className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Workout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EditorExerciseRow({
  item,
  index,
  isFirst,
  isLast,
  onMove,
  onRemove,
  onChange,
}: {
  item: TemplateEditorExercise
  index: number
  isFirst: boolean
  isLast: boolean
  onMove: (index: number, direction: -1 | 1) => void
  onRemove: () => void
  onChange: (patch: Partial<TemplateEditorExercise>) => void
}) {
  return (
    <div className="grid gap-3 p-3 sm:grid-cols-[1fr_7rem_1fr_auto] sm:items-center">
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white">
          {formatExerciseName(item.exercise.name)}
        </p>
        <p className="truncate text-gray-500 text-sm dark:text-gray-400">
          {item.exercise.category_name} · {item.exercise.equipment || 'No equipment'}
        </p>
      </div>
      <label className="block">
        <span className="mb-1 block text-gray-500 text-xs dark:text-gray-400">Target sets</span>
        <input
          type="number"
          min={1}
          max={20}
          value={item.targetSets}
          onChange={(event) =>
            onChange({ targetSets: Math.max(1, Number.parseInt(event.target.value || '1', 10)) })
          }
          className="min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-gray-500 text-xs dark:text-gray-400">Notes</span>
        <input
          value={item.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          className="min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          placeholder="Optional"
        />
      </label>
      <div className="flex gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() => onMove(index, -1)}
          disabled={isFirst}
          aria-label={`Move ${formatExerciseName(item.exercise.name)} up`}
          title="Move up"
          className="motion-press inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <ArrowUpIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => onMove(index, 1)}
          disabled={isLast}
          aria-label={`Move ${formatExerciseName(item.exercise.name)} down`}
          title="Move down"
          className="motion-press inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <ArrowDownIcon className="h-5 w-5" />
        </button>
        <TrashButton
          label={`Remove ${formatExerciseName(item.exercise.name)}`}
          onClick={onRemove}
          className="min-h-10 min-w-10"
        />
      </div>
    </div>
  )
}

function mapTemplateToEditorExercises(
  template: WorkoutTemplateWithExercises,
): TemplateEditorExercise[] {
  return [...template.exercises]
    .sort((a, b) => a.templateExercise.position - b.templateExercise.position)
    .map((item) => ({
      exercise: item.exercise,
      targetSets: item.templateExercise.target_sets ?? 3,
      notes: item.templateExercise.notes ?? '',
    }))
}
