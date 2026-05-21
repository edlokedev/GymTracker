import type { ExerciseWithParsedFields } from '@/lib/types/database'
import { formatExerciseName } from '@/lib/utils/text'

interface SelectedExercisePanelProps {
  exercise: ExerciseWithParsedFields
  onChange: () => void
  onClear?: () => void
}

export function SelectedExercisePanel({ exercise, onChange, onClear }: SelectedExercisePanelProps) {
  return (
    <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow-sm dark:border-blue-700 dark:from-blue-900/20 dark:to-indigo-900/20">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            {formatExerciseName(exercise.name)}
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {exercise.category_name} &bull; {exercise.equipment || 'No equipment'}
          </p>
          {exercise.primary_muscles.length > 0 && (
            <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
              Primary: {exercise.primary_muscles.join(', ')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onChange}
            className="min-h-11 rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
          >
            Change
          </button>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="min-h-11 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-800 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function EmptyExerciseSelector({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-300 p-4 transition-colors hover:border-blue-400 dark:border-gray-600 dark:hover:border-blue-500">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-11 w-full items-center justify-center gap-2 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Select an exercise
      </button>
    </div>
  )
}
