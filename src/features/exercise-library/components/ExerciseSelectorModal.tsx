import { type KeyboardEvent, type MutableRefObject, useEffect, useRef, useState } from 'react'
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
  isLoadingRecent?: boolean
  isLoadingFavorites?: boolean
  onClose: () => void
  onQueryChange: (query: string) => void
  onCategoryChange: (categoryId: string) => void
  onEquipmentChange: (equipment: string) => void
  onSelectExercise: (exercise: ExerciseWithParsedFields) => void
  onToggleFavorite?: (exercise: ExerciseWithParsedFields) => void
  onLoadMore: () => void
  onAddCustomExercise?: () => void
}

type PickerTabId = 'search' | 'recent' | 'favorites'

// User-facing dialect is "Favourites"; code identifiers stay favorite*.
const PICKER_TABS: Array<{ id: PickerTabId; label: string }> = [
  { id: 'search', label: 'Search' },
  { id: 'recent', label: 'Recent' },
  { id: 'favorites', label: 'Favourites' },
]

type PickerTabRefs = MutableRefObject<Record<PickerTabId, HTMLButtonElement | null>>

const PANEL_SCROLL_CLASS =
  'min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(env(safe-area-inset-bottom),1rem)] sm:p-6'

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
  isLoadingRecent = false,
  isLoadingFavorites = false,
  onClose,
  onQueryChange,
  onCategoryChange,
  onEquipmentChange,
  onSelectExercise,
  onToggleFavorite,
  onLoadMore,
  onAddCustomExercise,
}: ExerciseSelectorModalProps) {
  const [activeTab, setActiveTab] = useState<PickerTabId>('search')
  const tabRefs = useRef<Record<PickerTabId, HTMLButtonElement | null>>({
    search: null,
    recent: null,
    favorites: null,
  })

  // Reset to Search on each closed→open transition, never mid-session.
  useEffect(() => {
    if (isOpen) setActiveTab('search')
  }, [isOpen])

  if (!isOpen) return null

  const jumpToSearchTab = () => {
    setActiveTab('search')
    tabRefs.current.search?.focus()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex h-[94dvh] w-full max-w-2xl flex-col rounded-t-2xl border-gray-200 border-t bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800 sm:h-[min(85vh,44rem)] sm:rounded-xl sm:border"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-selector-title"
        onClick={(event) => event.stopPropagation()}
      >
        <ExerciseSelectorModalHeader onClose={onClose} onAddCustomExercise={onAddCustomExercise} />
        <PickerTabBar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          tabRefs={tabRefs}
          recentBadge={isLoadingRecent ? undefined : recentlyUsedExercises.length}
          favoriteBadge={isLoadingFavorites ? undefined : favoriteExercises.length}
        />
        <SearchPanel
          active={activeTab === 'search'}
          query={query}
          selectedCategory={selectedCategory}
          selectedEquipment={selectedEquipment}
          categories={categories}
          equipmentTypes={equipmentTypes}
          exercises={exercises}
          total={total}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          suggestedExercises={suggestedExercises}
          favoriteExerciseIds={favoriteExerciseIds}
          onQueryChange={onQueryChange}
          onCategoryChange={onCategoryChange}
          onEquipmentChange={onEquipmentChange}
          onSelectExercise={onSelectExercise}
          onToggleFavorite={onToggleFavorite}
          onLoadMore={onLoadMore}
        />
        <RecentPanel
          active={activeTab === 'recent'}
          items={recentlyUsedExercises}
          isLoading={isLoadingRecent}
          favoriteExerciseIds={favoriteExerciseIds}
          onSelectExercise={onSelectExercise}
          onToggleFavorite={onToggleFavorite}
        />
        <FavoritesPanel
          active={activeTab === 'favorites'}
          favoriteExercises={favoriteExercises}
          isLoading={isLoadingFavorites}
          favoriteExerciseIds={favoriteExerciseIds}
          onSelectExercise={onSelectExercise}
          onToggleFavorite={onToggleFavorite}
          onJumpToSearch={jumpToSearchTab}
        />
      </div>
    </div>
  )
}

function PickerTabBar({
  activeTab,
  onSelectTab,
  tabRefs,
  recentBadge,
  favoriteBadge,
}: {
  activeTab: PickerTabId
  onSelectTab: (tab: PickerTabId) => void
  tabRefs: PickerTabRefs
  // undefined = hide the badge (still loading); counts are visible item counts.
  recentBadge?: number
  favoriteBadge?: number
}) {
  // Roving tabindex with automatic activation: arrows/Home/End move focus and
  // select in one step.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = PICKER_TABS.findIndex((tab) => tab.id === activeTab)
    let nextIndex: number | null = null
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % PICKER_TABS.length
    else if (event.key === 'ArrowLeft')
      nextIndex = (currentIndex - 1 + PICKER_TABS.length) % PICKER_TABS.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = PICKER_TABS.length - 1
    if (nextIndex === null) return

    event.preventDefault()
    const next = PICKER_TABS[nextIndex]
    onSelectTab(next.id)
    tabRefs.current[next.id]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="Exercise picker sections"
      onKeyDown={handleKeyDown}
      className="grid shrink-0 grid-cols-3 gap-1 border-gray-200 border-b px-3 py-2 dark:border-gray-700 sm:px-5"
    >
      {PICKER_TABS.map((tab) => {
        const isActive = tab.id === activeTab
        const badge =
          tab.id === 'recent' ? recentBadge : tab.id === 'favorites' ? favoriteBadge : undefined

        return (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[tab.id] = element
            }}
            type="button"
            role="tab"
            id={`exercise-picker-tab-${tab.id}`}
            aria-controls={`exercise-picker-panel-${tab.id}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSelectTab(tab.id)}
            className={`flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isActive
                ? 'bg-blue-600 font-semibold text-white'
                : 'font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <span className="truncate">{tab.label}</span>
            {badge !== undefined && badge > 0 && (
              <span
                className={`inline-flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                  isActive
                    ? 'bg-white/25 text-white'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function PickerTabPanel({
  id,
  active,
  children,
}: {
  id: PickerTabId
  active: boolean
  children: React.ReactNode
}) {
  // Inactive panels stay mounted (per-tab scroll position survives switches)
  // but leave layout and the a11y tree via hidden + inert.
  return (
    <div
      role="tabpanel"
      id={`exercise-picker-panel-${id}`}
      aria-labelledby={`exercise-picker-tab-${id}`}
      hidden={!active}
      inert={!active}
      className={`min-h-0 flex-1 flex-col ${active ? 'flex' : 'hidden'}`}
    >
      {children}
    </div>
  )
}

function SearchPanel({
  active,
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
  suggestedExercises,
  favoriteExerciseIds,
  onQueryChange,
  onCategoryChange,
  onEquipmentChange,
  onSelectExercise,
  onToggleFavorite,
  onLoadMore,
}: Pick<
  ExerciseSelectorModalProps,
  | 'query'
  | 'selectedCategory'
  | 'selectedEquipment'
  | 'categories'
  | 'equipmentTypes'
  | 'exercises'
  | 'total'
  | 'isLoading'
  | 'isLoadingMore'
  | 'hasMore'
  | 'suggestedExercises'
  | 'favoriteExerciseIds'
  | 'onQueryChange'
  | 'onCategoryChange'
  | 'onEquipmentChange'
  | 'onSelectExercise'
  | 'onToggleFavorite'
  | 'onLoadMore'
> & { active: boolean }) {
  // Suggested only surfaces on a "blank" search: nonempty suggestions, no
  // query text, no category/equipment filter. Capped at 3, no show-more.
  const showSuggested =
    suggestedExercises.length > 0 && query.trim() === '' && !selectedCategory && !selectedEquipment

  return (
    <PickerTabPanel id="search" active={active}>
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
      <ScrollArea className={PANEL_SCROLL_CLASS}>
        {showSuggested && (
          <section aria-label="Suggested" className="mb-3 space-y-2 sm:mb-4 sm:space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Suggested
            </h3>
            {suggestedExercises.slice(0, 3).map((item, index) => (
              <ExerciseSelectorListItem
                key={item.exercise.id}
                exercise={item.exercise}
                rank={index + 1}
                meta={item.reasons?.slice(0, 2).join(' + ')}
                isFavorite={favoriteExerciseIds.includes(item.exercise.id)}
                onSelectExercise={onSelectExercise}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </section>
        )}
        <ExerciseResultsList
          active={active}
          exercises={exercises}
          total={total}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          favoriteExerciseIds={favoriteExerciseIds}
          onSelectExercise={onSelectExercise}
          onToggleFavorite={onToggleFavorite}
          onLoadMore={onLoadMore}
        />
      </ScrollArea>
    </PickerTabPanel>
  )
}

function RecentPanel({
  active,
  items,
  isLoading,
  favoriteExerciseIds,
  onSelectExercise,
  onToggleFavorite,
}: {
  active: boolean
  items: RecentExerciseQuickPick[]
  isLoading: boolean
  favoriteExerciseIds: string[]
  onSelectExercise: (exercise: ExerciseWithParsedFields) => void
  onToggleFavorite?: (exercise: ExerciseWithParsedFields) => void
}) {
  return (
    <PickerTabPanel id="recent" active={active}>
      <ScrollArea className={PANEL_SCROLL_CLASS}>
        {isLoading && items.length === 0 ? (
          <PanelLoading label="Loading recent exercises…" />
        ) : items.length > 0 ? (
          <div className="space-y-2 sm:space-y-3">
            {items.map((item) => (
              <ExerciseSelectorListItem
                key={item.exercise.id}
                exercise={item.exercise}
                meta={
                  item.useCount && item.useCount > 1
                    ? `Used ${item.useCount} times`
                    : item.lastUsedAt
                      ? 'Used recently'
                      : undefined
                }
                isFavorite={favoriteExerciseIds.includes(item.exercise.id)}
                onSelectExercise={onSelectExercise}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        ) : (
          <PanelEmpty>No recent exercises yet — exercises you log will appear here.</PanelEmpty>
        )}
      </ScrollArea>
    </PickerTabPanel>
  )
}

function FavoritesPanel({
  active,
  favoriteExercises,
  isLoading,
  favoriteExerciseIds,
  onSelectExercise,
  onToggleFavorite,
  onJumpToSearch,
}: {
  active: boolean
  favoriteExercises: ExerciseWithParsedFields[]
  isLoading: boolean
  favoriteExerciseIds: string[]
  onSelectExercise: (exercise: ExerciseWithParsedFields) => void
  onToggleFavorite?: (exercise: ExerciseWithParsedFields) => void
  onJumpToSearch: () => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const emptyCtaRef = useRef<HTMLButtonElement>(null)
  const pendingFocusIndexRef = useRef<number | null>(null)
  const favoriteCount = favoriteExercises.length

  // Unstarring removes the row; keyboard focus follows to the row that takes
  // its place (or the empty-state Search CTA once the list is empty). The
  // pending index survives until a focus target actually exists, so a refetch
  // that briefly re-renders the loading state doesn't drop focus.
  useEffect(() => {
    const index = pendingFocusIndexRef.current
    if (index === null) return
    if (!active) {
      pendingFocusIndexRef.current = null
      return
    }
    // A refetch can re-render the loading state between unstar and settle;
    // hold the pending index until there is something to focus.
    if (isLoading) return

    if (favoriteCount > 0) {
      const stars = listRef.current?.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')
      if (!stars || stars.length === 0) return
      stars[Math.min(index, stars.length - 1)]?.focus()
    } else {
      emptyCtaRef.current?.focus()
    }
    pendingFocusIndexRef.current = null
  }, [favoriteCount, isLoading, active])

  const handleToggleFavorite = onToggleFavorite
    ? (exercise: ExerciseWithParsedFields, index: number) => {
        pendingFocusIndexRef.current = index
        onToggleFavorite(exercise)
      }
    : undefined

  return (
    <PickerTabPanel id="favorites" active={active}>
      <ScrollArea className={PANEL_SCROLL_CLASS}>
        {isLoading && favoriteExercises.length === 0 ? (
          <PanelLoading label="Loading favourites…" />
        ) : favoriteExercises.length > 0 ? (
          <div ref={listRef} className="space-y-2 sm:space-y-3">
            {favoriteExercises.map((exercise, index) => (
              <ExerciseSelectorListItem
                key={exercise.id}
                exercise={exercise}
                isFavorite={favoriteExerciseIds.includes(exercise.id)}
                onSelectExercise={onSelectExercise}
                onToggleFavorite={
                  handleToggleFavorite
                    ? (toggled) => handleToggleFavorite(toggled, index)
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <PanelEmpty>
            <p>No favourites yet — tap the star on any exercise.</p>
            <button
              ref={emptyCtaRef}
              type="button"
              onClick={onJumpToSearch}
              className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Browse exercises
            </button>
          </PanelEmpty>
        )}
      </ScrollArea>
    </PickerTabPanel>
  )
}

function PanelLoading({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
      <div className="h-8 w-8 animate-spin rounded-full border-blue-600 border-b-2" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

function PanelEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
      {children}
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
    <div className="shrink-0 border-gray-200 border-b p-3 dark:border-gray-700 sm:p-6">
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
    <div className="grid shrink-0 gap-2 border-gray-200 border-b p-3 dark:border-gray-700 sm:px-5 sm:py-3">
      <div>
        <label className="sr-only">Search</label>
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by name or muscle group..."
          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 sm:text-base"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
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
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className="min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-base"
    >
      <option value="">{emptyLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function ExerciseResultsList({
  active,
  exercises,
  total,
  isLoading,
  isLoadingMore,
  hasMore,
  favoriteExerciseIds,
  onSelectExercise,
  onToggleFavorite,
  onLoadMore,
}: Pick<
  ExerciseSelectorModalProps,
  | 'exercises'
  | 'total'
  | 'isLoading'
  | 'isLoadingMore'
  | 'hasMore'
  | 'favoriteExerciseIds'
  | 'onSelectExercise'
  | 'onToggleFavorite'
  | 'onLoadMore'
> & { active: boolean }) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Infinite-scroll sentinel only observes while the Search tab is active.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || !active) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore()
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, active, onLoadMore])

  if (isLoading && exercises.length === 0) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-blue-600 border-b-2" />
      </div>
    )
  }

  if (exercises.length === 0) {
    return <PanelEmpty>No exercises found. Try adjusting your search criteria.</PanelEmpty>
  }

  return (
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
  )
}

function ExerciseSelectorListItem({
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
    <div className="group flex min-h-14 w-full items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 transition-all duration-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600 dark:hover:bg-gray-700 sm:min-h-16 sm:p-4">
      <button
        type="button"
        onClick={() => onSelectExercise(exercise)}
        className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
      >
        {rank !== undefined && (
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 text-xs font-semibold dark:bg-gray-700 dark:text-gray-300">
            {rank}
          </span>
        )}
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
          {meta ? (
            <p className="mt-0.5 truncate text-gray-500 text-xs dark:text-gray-500 sm:mt-1 sm:text-sm">
              {meta}
            </p>
          ) : (
            exercise.primary_muscles.length > 0 && (
              <p className="mt-0.5 truncate text-gray-500 text-xs dark:text-gray-500 sm:mt-1 sm:text-sm">
                {exercise.primary_muscles.join(', ')}
              </p>
            )
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
