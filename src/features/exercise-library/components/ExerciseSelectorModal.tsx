import { useEffect, useRef, useState } from 'react'
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
  total: number
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  onClose: () => void
  onQueryChange: (query: string) => void
  onCategoryChange: (categoryId: string) => void
  onEquipmentChange: (equipment: string) => void
  onSelectExercise: (exercise: ExerciseWithParsedFields) => void
  onLoadMore: () => void
}

export default function ExerciseSelectorModal({
  isOpen,
  query,
  selectedCategory,
  selectedEquipment,
  categories,
  equipmentTypes,
  exercises,
  total,
  isLoading,
  isLoadingMore,
  hasMore,
  onClose,
  onQueryChange,
  onCategoryChange,
  onEquipmentChange,
  onSelectExercise,
  onLoadMore,
}: ExerciseSelectorModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [lockedHeight, setLockedHeight] = useState<number>()

  // Reset the locked height each time the modal closes so a fresh open re-fits.
  useEffect(() => {
    if (!isOpen) setLockedHeight(undefined)
  }, [isOpen])

  // Once results first render, pin the modal's height so later searches
  // (including empty results) never resize it while it stays open.
  useEffect(() => {
    if (
      isOpen &&
      lockedHeight === undefined &&
      !isLoading &&
      exercises.length > 0 &&
      dialogRef.current
    ) {
      setLockedHeight(dialogRef.current.getBoundingClientRect().height)
    }
  }, [isOpen, isLoading, exercises.length, lockedHeight])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="flex max-h-[94dvh] w-full max-w-2xl flex-col rounded-t-2xl border-gray-200 border-t bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800 sm:max-h-[85vh] sm:rounded-xl sm:border"
        style={lockedHeight ? { height: `${lockedHeight}px` } : undefined}
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
          total={total}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onSelectExercise={onSelectExercise}
          onLoadMore={onLoadMore}
        />
      </div>
    </div>
  )
}

function ExerciseSelectorModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="border-gray-200 border-b p-3 dark:border-gray-700 sm:p-6">
      <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-gray-300 dark:bg-gray-600 sm:hidden" />
      <div className="flex items-center justify-between">
        <h2
          id="exercise-selector-title"
          className="text-lg font-semibold text-gray-900 dark:text-white sm:text-xl"
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
    <div className="space-y-3 border-gray-200 border-b p-3 dark:border-gray-700 sm:space-y-4 sm:p-6">
      <div>
        <label className="sr-only mb-1 text-sm font-medium text-gray-700 dark:text-gray-300 sm:not-sr-only sm:block">
          Search
        </label>
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by name or muscle group..."
          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 sm:text-base"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
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
      <label className="sr-only mb-1 text-sm font-medium text-gray-700 dark:text-gray-300 sm:not-sr-only sm:block">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-base"
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
  total,
  isLoading,
  isLoadingMore,
  hasMore,
  onSelectExercise,
  onLoadMore,
}: Pick<
  ExerciseSelectorModalProps,
  | 'exercises'
  | 'total'
  | 'isLoading'
  | 'isLoadingMore'
  | 'hasMore'
  | 'onSelectExercise'
  | 'onLoadMore'
>) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore()
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore])

  return (
    <ScrollArea className="flex-1 overflow-y-auto p-3 pb-[max(env(safe-area-inset-bottom),1rem)] sm:p-6">
      {isLoading && exercises.length === 0 ? (
        <div className="flex h-full min-h-[280px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-blue-600 border-b-2" />
        </div>
      ) : exercises.length > 0 ? (
        <div
          className={`space-y-2 transition-opacity duration-150 sm:space-y-3 ${isLoading ? 'pointer-events-none opacity-40' : 'opacity-100'}`}
        >
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isLoading
              ? 'Searching…'
              : total > exercises.length
                ? `Showing ${exercises.length} of ${total}`
                : `${total} exercise${total !== 1 ? 's' : ''}`}
          </p>
          {exercises.map((exercise) => (
            <ExerciseSelectorListItem
              key={exercise.id}
              exercise={exercise}
              onSelectExercise={onSelectExercise}
            />
          ))}
          <div ref={sentinelRef} className="h-2" />
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-blue-600 border-b-2" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-full min-h-[280px] items-center justify-center text-center text-gray-500 dark:text-gray-400">
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
      className="group min-h-14 w-full rounded-xl border border-gray-200 bg-white p-3 text-left transition-all duration-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600 dark:hover:bg-gray-700 sm:min-h-16 sm:p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <ExerciseMediaFrame
          exercise={exercise}
          alt={formatExerciseName(exercise.name)}
          frameClassName="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-700 dark:via-gray-600 dark:to-gray-500 sm:h-16 sm:w-16"
          imageClassName="absolute inset-0 z-10 h-full w-full object-cover"
          iconClassName="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-gray-900 text-sm transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 sm:text-base">
            {formatExerciseName(exercise.name)}
          </h3>
          <p className="text-gray-600 text-xs dark:text-gray-400 sm:text-sm">
            {exercise.category_name} &bull; {exercise.equipment || 'No equipment'}
          </p>
          {exercise.primary_muscles.length > 0 && (
            <p className="mt-0.5 truncate text-gray-500 text-xs dark:text-gray-500 sm:mt-1 sm:text-sm">
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
