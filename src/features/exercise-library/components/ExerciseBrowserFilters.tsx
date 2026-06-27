import type { ReactNode } from 'react'
import { ScrollArea } from '@/components/ui/ScrollArea'
import type { ActiveExerciseFilterChip } from '../model'
import ExerciseFacetFilter, { type ExerciseFacetOption } from './ExerciseFacetFilter'

interface ExerciseBrowserFiltersProps {
  query: string
  activeFilterCount: number
  activeFilterChips: ActiveExerciseFilterChip[]
  categoryOptions: ExerciseFacetOption[]
  equipmentOptions: ExerciseFacetOption[]
  muscleOptions: ExerciseFacetOption[]
  selectedCategoryIds: string[]
  selectedEquipment: string[]
  selectedMuscleGroups: string[]
  favouritesCount: number
  isFavouritesActive: boolean
  onQueryChange: (query: string) => void
  onToggleCategory: (value: string) => void
  onToggleEquipment: (value: string) => void
  onToggleMuscleGroup: (value: string) => void
  onToggleFavourites: () => void
  onRemoveFilter: (chip: ActiveExerciseFilterChip) => void
  onResetFilters: () => void
}

export function ExerciseBrowserFilters(props: ExerciseBrowserFiltersProps) {
  return (
    <div className="space-y-5">
      <ExerciseSearchField query={props.query} onQueryChange={props.onQueryChange} />
      <ActiveFilterSummary
        activeFilterCount={props.activeFilterCount}
        activeFilterChips={props.activeFilterChips}
        onRemoveFilter={props.onRemoveFilter}
        onResetFilters={props.onResetFilters}
      />
      <FavouritesToggle
        favouritesCount={props.favouritesCount}
        isActive={props.isFavouritesActive}
        onToggle={props.onToggleFavourites}
      />
      <ExerciseFacetSections {...props} />
    </div>
  )
}

export function ExerciseBrowserHeader({
  activeFilterCount,
  onToggleFilters,
}: {
  activeFilterCount: number
  onToggleFilters: () => void
}) {
  return (
    <div className="mb-4 sm:mb-6 lg:mb-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl lg:text-3xl dark:text-white">
            Exercise Library
          </h1>
          <p className="mt-1 text-sm text-gray-600 sm:mt-2 sm:text-base dark:text-gray-400">
            Browse exercises by category, muscle group, and equipment
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleFilters}
          className="flex-shrink-0 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 p-3 text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-blue-600 hover:shadow-xl active:scale-95 md:hidden"
          aria-label="Toggle filters"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"
            />
          </svg>
          {activeFilterCount > 0 && (
            <span className="absolute -mt-5 ml-4 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-xs font-bold text-gray-900">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

export function MobileFilterDrawer({
  isOpen,
  onToggle,
  children,
}: {
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
}) {
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onToggle} />
      <div
        className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-50 mx-auto max-h-[calc(100dvh-5rem)] max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl md:hidden dark:bg-gray-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-filter-title"
      >
        <div className="flex justify-center py-3">
          <div className="h-1 w-12 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>
        <div className="flex items-center justify-between border-gray-200 border-b px-5 pb-4 dark:border-gray-700">
          <h3
            id="exercise-filter-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            Filters
          </h3>
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close filters"
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
        <ScrollArea className="max-h-[calc(100dvh-12rem)] overflow-y-auto p-5">
          {children}
        </ScrollArea>
      </div>
    </>
  )
}

export function DesktopFilterSidebar({
  activeFilterCount,
  children,
}: {
  activeFilterCount: number
  children: ReactNode
}) {
  return (
    <aside className="hidden md:block md:w-76 md:flex-shrink-0">
      <div className="sticky top-6 flex max-h-[calc(100vh-3rem)] flex-col rounded-lg border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/20">
        <div className="flex items-center justify-between border-gray-200 border-b px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Filters</h2>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
              {activeFilterCount}
            </span>
          )}
        </div>
        <ScrollArea className="min-h-0 flex-1 overflow-y-auto p-4">{children}</ScrollArea>
      </div>
    </aside>
  )
}

function ExerciseSearchField({
  query,
  onQueryChange,
}: {
  query: string
  onQueryChange: (query: string) => void
}) {
  return (
    <div className="space-y-2">
      <label
        className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400"
        htmlFor="exercise-search"
      >
        Search exercises
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg
            className="h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          id="exercise-search"
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by name or muscle..."
          className="w-full rounded-md border border-gray-300 bg-white py-2.5 pr-3 pl-9 text-sm text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-white dark:placeholder-slate-500"
        />
      </div>
    </div>
  )
}

function ActiveFilterSummary({
  activeFilterCount,
  activeFilterChips,
  onRemoveFilter,
  onResetFilters,
}: {
  activeFilterCount: number
  activeFilterChips: ActiveExerciseFilterChip[]
  onRemoveFilter: (chip: ActiveExerciseFilterChip) => void
  onResetFilters: () => void
}) {
  if (activeFilterCount === 0) return null

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3 shadow-sm dark:border-blue-400/15 dark:bg-blue-500/10">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            Applied
          </span>
          <p className="mt-0.5 text-xs text-blue-700/70 dark:text-blue-200/65">
            {activeFilterCount} active {activeFilterCount === 1 ? 'filter' : 'filters'}
          </p>
        </div>
        <button
          type="button"
          onClick={onResetFilters}
          className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50 dark:border-blue-400/25 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950/70"
        >
          Clear
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {activeFilterChips.map((chip) => (
          <FilterChip
            key={`${chip.type}-${chip.value || chip.label}`}
            chip={chip}
            onRemove={() => onRemoveFilter(chip)}
          />
        ))}
      </div>
    </div>
  )
}

function FavouritesToggle({
  favouritesCount,
  isActive,
  onToggle,
}: {
  favouritesCount: number
  isActive: boolean
  onToggle: () => void
}) {
  // Full static class strings per branch (no template-literal composition) per
  // the Gymmie "static class strings only" styling rule.
  const buttonClassName = isActive
    ? 'flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold shadow-sm transition-colors border-blue-500 bg-blue-600 text-white hover:bg-blue-700 dark:border-blue-400 dark:bg-blue-600 dark:hover:bg-blue-500'
    : 'flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold shadow-sm transition-colors border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:bg-slate-900'

  const badgeClassName = isActive
    ? 'rounded-full px-2 py-0.5 text-xs font-bold bg-white/20 text-white'
    : 'rounded-full px-2 py-0.5 text-xs font-bold bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'

  return (
    <button type="button" onClick={onToggle} aria-pressed={isActive} className={buttonClassName}>
      <span className="flex items-center gap-2">
        <svg
          className="h-4 w-4 flex-shrink-0"
          fill={isActive ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
        Favourites only
      </span>
      <span className={badgeClassName}>{favouritesCount}</span>
    </button>
  )
}

function ExerciseFacetSections({
  categoryOptions,
  equipmentOptions,
  muscleOptions,
  selectedCategoryIds,
  selectedEquipment,
  selectedMuscleGroups,
  onToggleCategory,
  onToggleEquipment,
  onToggleMuscleGroup,
}: ExerciseBrowserFiltersProps) {
  return (
    <div className="space-y-5 divide-y divide-gray-200 dark:divide-slate-800/80">
      <div>
        <ExerciseFacetFilter
          title="Category"
          options={categoryOptions}
          selectedValues={selectedCategoryIds}
          onToggle={onToggleCategory}
        />
      </div>
      <div className="pt-5">
        <ExerciseFacetFilter
          title="Muscle Group"
          options={muscleOptions}
          selectedValues={selectedMuscleGroups}
          onToggle={onToggleMuscleGroup}
        />
      </div>
      <div className="pt-5">
        <ExerciseFacetFilter
          title="Equipment"
          options={equipmentOptions}
          selectedValues={selectedEquipment}
          onToggle={onToggleEquipment}
        />
      </div>
    </div>
  )
}

function FilterChip({ chip, onRemove }: { chip: ActiveExerciseFilterChip; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="group inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-800 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-blue-400/20 dark:bg-slate-950/60 dark:text-blue-100 dark:hover:bg-blue-950/60"
      aria-label={`Remove ${chip.prefix} filter ${chip.label}`}
    >
      <span className="text-blue-500 dark:text-blue-300/80">{chip.prefix}</span>
      <span className="h-1 w-1 rounded-full bg-blue-300 dark:bg-blue-400/60" aria-hidden="true" />
      <span className="truncate">{chip.label}</span>
      <svg
        className="h-3.5 w-3.5 flex-shrink-0 rounded-full text-blue-400 transition-colors group-hover:bg-blue-100 group-hover:text-blue-700 dark:text-blue-300/80 dark:group-hover:bg-blue-900/70 dark:group-hover:text-blue-100"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  )
}
