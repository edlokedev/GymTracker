import { ScrollArea } from '@/components/ui/ScrollArea'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import { formatExerciseName } from '@/lib/utils/text'
import type { ExerciseCategory } from '../model'
import ExerciseMediaFrame from './ExerciseMediaFrame'

interface ExerciseSelectorModalProps {
  isOpen: boolean
  query: string
  selectedCategory: string
  selectedEquipment: string
  categories: ExerciseCategory[]
  equipmentTypes: string[]
  exercises: ExerciseWithParsedFields[]
  isLoading: boolean
  onClose: () => void
  onQueryChange: (query: string) => void
  onCategoryChange: (categoryId: string) => void
  onEquipmentChange: (equipment: string) => void
  onSelectExercise: (exercise: ExerciseWithParsedFields) => void
}

export default function ExerciseSelectorModal({
  isOpen,
  query,
  selectedCategory,
  selectedEquipment,
  categories,
  equipmentTypes,
  exercises,
  isLoading,
  onClose,
  onQueryChange,
  onCategoryChange,
  onEquipmentChange,
  onSelectExercise,
}: ExerciseSelectorModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88dvh] w-full max-w-2xl flex-col rounded-t-2xl border-gray-200 border-t bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800 sm:max-h-[85vh] sm:rounded-xl sm:border"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-selector-title"
        onClick={(event) => event.stopPropagation()}
      >
        <ExerciseSelectorModalHeader onClose={onClose} />
        <ExerciseSelectorFilters
          query={query}
          selectedCategory={selectedCategory}
          selectedEquipment={selectedEquipment}
          categories={categories}
          equipmentTypes={equipmentTypes}
          onQueryChange={onQueryChange}
          onCategoryChange={onCategoryChange}
          onEquipmentChange={onEquipmentChange}
        />
        <ExerciseSelectorList
          exercises={exercises}
          isLoading={isLoading}
          onSelectExercise={onSelectExercise}
        />
      </div>
    </div>
  )
}

function ExerciseSelectorModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="border-gray-200 border-b p-4 dark:border-gray-700 sm:p-6">
      <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gray-300 dark:bg-gray-600 sm:hidden" />
      <div className="flex items-center justify-between">
        <h2
          id="exercise-selector-title"
          className="text-xl font-semibold text-gray-900 dark:text-white"
        >
          Select Exercise
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          aria-label="Close exercise selector"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

function ExerciseSelectorFilters({
  query,
  selectedCategory,
  selectedEquipment,
  categories,
  equipmentTypes,
  onQueryChange,
  onCategoryChange,
  onEquipmentChange,
}: Pick<
  ExerciseSelectorModalProps,
  | 'query'
  | 'selectedCategory'
  | 'selectedEquipment'
  | 'categories'
  | 'equipmentTypes'
  | 'onQueryChange'
  | 'onCategoryChange'
  | 'onEquipmentChange'
>) {
  return (
    <div className="space-y-4 border-gray-200 border-b p-4 dark:border-gray-700 sm:p-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Search
        </label>
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by name or muscle group..."
          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SelectorSelect
          label="Category"
          value={selectedCategory}
          emptyLabel="All Categories"
          options={categories.map((category) => ({
            value: category.id,
            label: category.name,
          }))}
          onChange={onCategoryChange}
        />
        <SelectorSelect
          label="Equipment"
          value={selectedEquipment}
          emptyLabel="All Equipment"
          options={equipmentTypes.map((equipment) => ({
            value: equipment,
            label: equipment,
          }))}
          onChange={onEquipmentChange}
        />
      </div>
    </div>
  )
}

function SelectorSelect({
  label,
  value,
  emptyLabel,
  options,
  onChange,
}: {
  label: string
  value: string
  emptyLabel: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function ExerciseSelectorList({
  exercises,
  isLoading,
  onSelectExercise,
}: Pick<ExerciseSelectorModalProps, 'exercises' | 'isLoading' | 'onSelectExercise'>) {
  return (
    <ScrollArea className="flex-1 overflow-y-auto p-4 pb-[max(env(safe-area-inset-bottom),1rem)] sm:p-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-blue-600 border-b-2" />
        </div>
      ) : exercises.length > 0 ? (
        <div className="space-y-3">
          {exercises.map((exercise) => (
            <ExerciseSelectorListItem
              key={exercise.id}
              exercise={exercise}
              onSelectExercise={onSelectExercise}
            />
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          No exercises found. Try adjusting your search criteria.
        </div>
      )}
    </ScrollArea>
  )
}

function ExerciseSelectorListItem({
  exercise,
  onSelectExercise,
}: {
  exercise: ExerciseWithParsedFields
  onSelectExercise: (exercise: ExerciseWithParsedFields) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelectExercise(exercise)}
      className="group min-h-16 w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition-all duration-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600 dark:hover:bg-gray-700"
    >
      <div className="flex items-center justify-between gap-3">
        <ExerciseMediaFrame
          exercise={exercise}
          alt={formatExerciseName(exercise.name)}
          frameClassName="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-700 dark:via-gray-600 dark:to-gray-500"
          imageClassName="absolute inset-0 z-10 h-full w-full object-cover"
          iconClassName="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-gray-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
            {formatExerciseName(exercise.name)}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {exercise.category_name} &bull; {exercise.equipment || 'No equipment'}
          </p>
          {exercise.primary_muscles.length > 0 && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              {exercise.primary_muscles.join(', ')}
            </p>
          )}
        </div>
        <svg
          className="h-5 w-5 flex-shrink-0 text-gray-400 transition-colors group-hover:text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}
