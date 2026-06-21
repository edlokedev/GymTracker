import { useEffect, useRef, useState } from 'react'
import { ScrollArea } from '@/components/ui/ScrollArea'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import { formatExerciseName } from '@/lib/utils/text'
import type { ExerciseCategory } from '../model'
import { FavoriteStarButton } from './ExerciseCard'
import ExerciseMediaFrame from './ExerciseMediaFrame'
import type { RecentExerciseQuickPick, SuggestedExerciseQuickPick } from './ExerciseSelector'

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
  favoriteExercises: ExerciseWithParsedFields[]
  favoriteExerciseIds: string[]
  recentlyUsedExercises: RecentExerciseQuickPick[]
  suggestedExercises: SuggestedExerciseQuickPick[]
  onClose: () => void
  onQueryChange: (query: string) => void
  onCategoryChange: (categoryId: string) => void
  onEquipmentChange: (equipment: string) => void
  onSelectExercise: (exercise: ExerciseWithParsedFields) => void
  onToggleFavorite?: (exercise: ExerciseWithParsedFields) => void
  onLoadMore: () => void
  onAddCustomExercise?: () => void
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
  favoriteExercises,
  favoriteExerciseIds,
  recentlyUsedExercises,
  suggestedExercises,
  onClose,
  onQueryChange,
  onCategoryChange,
  onEquipmentChange,
  onSelectExercise,
  onToggleFavorite,
  onLoadMore,
  onAddCustomExercise,
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
        <ExerciseSelectorModalHeader onClose={onClose} onAddCustomExercise={onAddCustomExercise} />
        <ExerciseQuickSections
          favoriteExercises={favoriteExercises}
          favoriteExerciseIds={favoriteExerciseIds}
          recentlyUsedExercises={recentlyUsedExercises}
          suggestedExercises={suggestedExercises}
          onSelectExercise={onSelectExercise}
          onToggleFavorite={onToggleFavorite}
        />
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
          favoriteExerciseIds={favoriteExerciseIds}
          onToggleFavorite={onToggleFavorite}
          onLoadMore={onLoadMore}
        />
      </div>
    </div>
  )
}

function ExerciseQuickSections({
  favoriteExercises,
  favoriteExerciseIds,
  recentlyUsedExercises,
  suggestedExercises,
  onSelectExercise,
  onToggleFavorite,
}: Pick<
  ExerciseSelectorModalProps,
  | 'favoriteExercises'
  | 'favoriteExerciseIds'
  | 'recentlyUsedExercises'
  | 'suggestedExercises'
  | 'onSelectExercise'
  | 'onToggleFavorite'
>) {
  const hasQuickSections =
    favoriteExercises.length > 0 ||
    recentlyUsedExercises.length > 0 ||
    suggestedExercises.length > 0
  const quickPickCount =
    favoriteExercises.length + recentlyUsedExercises.length + suggestedExercises.length
  const [isCompactViewport, setIsCompactViewport] = useState(getIsCompactViewport)
  const [isCollapsed, setIsCollapsed] = useState(getIsCompactViewport)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const query = window.matchMedia('(max-width: 639px)')
    const updateViewport = () => setIsCompactViewport(query.matches)

    updateViewport()
    query.addEventListener('change', updateViewport)
    return () => query.removeEventListener('change', updateViewport)
  }, [])

  if (!hasQuickSections) return null

  const shouldHideSections = isCompactViewport && isCollapsed

  return (
    <div className="space-y-2 border-gray-200 border-b px-3 py-2.5 dark:border-gray-700 sm:px-5 sm:py-3">
      {isCompactViewport && (
        <button
          type="button"
          onClick={() => setIsCollapsed((value) => !value)}
          aria-expanded={!isCollapsed}
          className="flex min-h-11 w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 text-left text-gray-900 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-200 dark:hover:bg-gray-900/45 sm:hidden"
        >
          <span>
            <span className="block font-semibold text-sm">Quick picks</span>
            <span className="block text-gray-500 text-xs dark:text-gray-400">
              {quickPickCount} saved, recent, or suggested
            </span>
          </span>
          <ChevronIcon
            className={`h-5 w-5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
          />
        </button>
      )}
      {!shouldHideSections && (
        <>
          {favoriteExercises.length > 0 && (
            <QuickExerciseSection
              title="Favorites"
              items={favoriteExercises.map((exercise) => ({ exercise }))}
              favoriteExerciseIds={favoriteExerciseIds}
              onSelectExercise={onSelectExercise}
              onToggleFavorite={onToggleFavorite}
            />
          )}
          {recentlyUsedExercises.length > 0 && (
            <QuickExerciseSection
              title="Recently Used"
              items={recentlyUsedExercises.map((item) => ({
                exercise: item.exercise,
                meta:
                  item.useCount && item.useCount > 1
                    ? `Used ${item.useCount} times`
                    : item.lastUsedAt
                      ? 'Used recently'
                      : undefined,
              }))}
              favoriteExerciseIds={favoriteExerciseIds}
              onSelectExercise={onSelectExercise}
              onToggleFavorite={onToggleFavorite}
            />
          )}
          {suggestedExercises.length > 0 && (
            <QuickExerciseSection
              title="Suggested"
              items={suggestedExercises.map((item, index) => ({
                exercise: item.exercise,
                rank: index + 1,
                meta: item.reasons?.slice(0, 2).join(' + '),
              }))}
              favoriteExerciseIds={favoriteExerciseIds}
              onSelectExercise={onSelectExercise}
              onToggleFavorite={onToggleFavorite}
            />
          )}
        </>
      )}
    </div>
  )
}

function getIsCompactViewport() {
  return typeof window !== 'undefined' && window.matchMedia?.('(max-width: 639px)').matches
}

function QuickExerciseSection({
  title,
  items,
  favoriteExerciseIds,
  onSelectExercise,
  onToggleFavorite,
}: {
  title: string
  items: Array<{ exercise: ExerciseWithParsedFields; rank?: number; meta?: string }>
  favoriteExerciseIds: string[]
  onSelectExercise: (exercise: ExerciseWithParsedFields) => void
  onToggleFavorite?: (exercise: ExerciseWithParsedFields) => void
}) {
  const collapsedCount = 3
  const [isExpanded, setIsExpanded] = useState(false)
  const hiddenCount = Math.max(items.length - collapsedCount, 0)
  const visibleItems = isExpanded ? items : items.slice(0, collapsedCount)

  return (
    <section
      className="grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center"
      aria-label={title}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </h3>
      <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((item) => (
          <ExerciseQuickSectionItem
            key={item.exercise.id}
            exercise={item.exercise}
            rank={item.rank}
            meta={item.meta}
            isFavorite={favoriteExerciseIds.includes(item.exercise.id)}
            onSelectExercise={onSelectExercise}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded((value) => !value)}
            aria-expanded={isExpanded}
            className="flex h-12 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-gray-600 text-sm font-medium transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {isExpanded ? 'Show less' : `Show ${hiddenCount} more`}
          </button>
        )}
      </div>
    </section>
  )
}

function ExerciseQuickSectionItem({
  exercise,
  rank,
  meta,
  isFavorite,
  onSelectExercise,
  onToggleFavorite,
}: {
  exercise: ExerciseWithParsedFields
  rank?: number
  meta?: string
  isFavorite: boolean
  onSelectExercise: (exercise: ExerciseWithParsedFields) => void
  onToggleFavorite?: (exercise: ExerciseWithParsedFields) => void
}) {
  const exerciseTitle = formatExerciseName(exercise.name)

  return (
    <div className="flex h-12 min-w-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 dark:border-gray-700 dark:bg-gray-800">
      <button
        type="button"
        onClick={() => onSelectExercise(exercise)}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-1 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-gray-700"
      >
        {rank && (
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 text-xs font-semibold dark:bg-gray-700 dark:text-gray-300">
            {rank}
          </span>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {exerciseTitle}
          </div>
          <div className="truncate text-gray-500 text-xs dark:text-gray-400">
            {meta || exercise.equipment || exercise.category_name}
          </div>
        </div>
      </button>
      {onToggleFavorite && (
        <FavoriteStarButton
          exerciseTitle={exerciseTitle}
          isFavorite={isFavorite}
          onClick={() => onToggleFavorite(exercise)}
          className="flex-shrink-0 border-transparent bg-transparent shadow-none"
        />
      )}
    </div>
  )
}

function ExerciseSelectorModalHeader({
  onClose,
  onAddCustomExercise,
}: {
  onClose: () => void
  onAddCustomExercise?: () => void
}) {
  return (
    <div className="border-gray-200 border-b p-3 dark:border-gray-700 sm:p-6">
      <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-gray-300 dark:bg-gray-600 sm:hidden" />
      <div className="flex items-center justify-between gap-2">
        <h2
          id="exercise-selector-title"
          className="text-lg font-semibold text-gray-900 dark:text-white sm:text-xl"
        >
          Select Exercise
        </h2>
        <div className="flex items-center gap-2">
          {onAddCustomExercise && (
            <button
              type="button"
              onClick={onAddCustomExercise}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-blue-500 px-3 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/30 cursor-pointer"
            >
              <span aria-hidden>+</span> Add
            </button>
          )}
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
    </div>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
    </svg>
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
    <div className="grid gap-2 border-gray-200 border-b p-3 dark:border-gray-700 sm:grid-cols-[minmax(14rem,1.6fr)_minmax(10rem,1fr)_minmax(10rem,1fr)] sm:px-5 sm:py-3">
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
  favoriteExerciseIds,
  onToggleFavorite,
  onLoadMore,
}: Pick<
  ExerciseSelectorModalProps,
  | 'exercises'
  | 'total'
  | 'isLoading'
  | 'isLoadingMore'
  | 'hasMore'
  | 'onSelectExercise'
  | 'favoriteExerciseIds'
  | 'onToggleFavorite'
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
              isFavorite={favoriteExerciseIds.includes(exercise.id)}
              onSelectExercise={onSelectExercise}
              onToggleFavorite={onToggleFavorite}
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
  isFavorite,
  onSelectExercise,
  onToggleFavorite,
}: {
  exercise: ExerciseWithParsedFields
  isFavorite: boolean
  onSelectExercise: (exercise: ExerciseWithParsedFields) => void
  onToggleFavorite?: (exercise: ExerciseWithParsedFields) => void
}) {
  const exerciseTitle = formatExerciseName(exercise.name)

  return (
    <div className="group flex min-h-14 w-full items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 transition-all duration-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600 dark:hover:bg-gray-700 sm:min-h-16 sm:p-4">
      <button
        type="button"
        onClick={() => onSelectExercise(exercise)}
        className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
      >
        <ExerciseMediaFrame
          exercise={exercise}
          alt={exerciseTitle}
          frameClassName="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-700 dark:via-gray-600 dark:to-gray-500 sm:h-16 sm:w-16"
          imageClassName="absolute inset-0 z-10 h-full w-full object-cover"
          iconClassName="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-gray-900 text-sm transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 sm:text-base">
            {exerciseTitle}
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
      </button>
      {onToggleFavorite && (
        <FavoriteStarButton
          exerciseTitle={exerciseTitle}
          isFavorite={isFavorite}
          onClick={() => onToggleFavorite(exercise)}
          className="flex-shrink-0"
        />
      )}
    </div>
  )
}
