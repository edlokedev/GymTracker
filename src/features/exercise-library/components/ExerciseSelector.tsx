import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import { emptyExerciseLibrarySearch } from '../model'
import { useExerciseLibrary } from '../useExerciseLibrary'
import CustomExerciseForm from './CustomExerciseForm'
import ExerciseSelectorModal from './ExerciseSelectorModal'
import { EmptyExerciseSelector, SelectedExercisePanel } from './ExerciseSelectorPanel'

export interface RecentExerciseQuickPick {
  exercise: ExerciseWithParsedFields
  lastUsedAt?: string
  useCount?: number
}

export interface SuggestedExerciseQuickPick {
  exercise: ExerciseWithParsedFields
  score?: number
  reasons?: string[]
}

interface ExerciseSelectorProps {
  onSelectExercise: (exercise: ExerciseWithParsedFields) => void
  selectedExercise?: ExerciseWithParsedFields | null
  onClearExercise?: () => void
  className?: string
  favoriteExercises?: ExerciseWithParsedFields[]
  favoriteExerciseIds?: string[]
  recentlyUsedExercises?: RecentExerciseQuickPick[]
  suggestedExercises?: SuggestedExerciseQuickPick[]
  onToggleFavorite?: (exercise: ExerciseWithParsedFields) => void
  // Controlled-open trigger: increment this number to open the picker modal
  // programmatically (e.g. a per-exercise "Change exercise" action reusing this
  // single selector instance). Ignored while undefined or 0.
  requestOpenSignal?: number
  // Fired when the picker modal closes (selection or dismiss) so a caller
  // driving change-mode can reset its state.
  onPickerClose?: () => void
}

export default function ExerciseSelector({
  onSelectExercise,
  selectedExercise,
  onClearExercise,
  className = '',
  favoriteExercises = [],
  favoriteExerciseIds = [],
  recentlyUsedExercises = [],
  suggestedExercises = [],
  onToggleFavorite,
  requestOpenSignal,
  onPickerClose,
}: ExerciseSelectorProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [inputQuery, setInputQuery] = useState('')
  const queryDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const library = useExerciseLibrary({
    initialSearch: emptyExerciseLibrarySearch,
    enabled: shouldLoad,
  })

  // P1: begin loading the catalog only once the user signals intent to open the
  // picker (hover/focus/press), so the modal opens with data ready without
  // paying the load on every workout screen where the picker is never opened.
  const prefetchLibrary = useCallback(() => setShouldLoad(true), [])
  const openPicker = useCallback(() => {
    setShouldLoad(true)
    setIsOpen(true)
  }, [])

  // Controlled-open: a parent increments requestOpenSignal to open the picker
  // programmatically. Guarded on > 0 so the initial render doesn't auto-open.
  useEffect(() => {
    if (!requestOpenSignal) return
    openPicker()
  }, [requestOpenSignal, openPicker])

  const selectedCategory = library.filters.categoryIds[0] || ''
  const selectedEquipment = library.filters.equipment[0] || ''
  const effectiveFavoriteExercises =
    favoriteExercises.length > 0 ? favoriteExercises : library.quickPickLists.favorites
  const effectiveFavoriteExerciseIds =
    favoriteExerciseIds.length > 0 ? favoriteExerciseIds : library.favoriteExerciseIds
  const effectiveRecentlyUsedExercises =
    recentlyUsedExercises.length > 0 ? recentlyUsedExercises : library.quickPickLists.recent
  const effectiveSuggestedExercises =
    suggestedExercises.length > 0 ? suggestedExercises : library.quickPickLists.suggested
  const effectiveToggleFavorite =
    onToggleFavorite ??
    ((exercise: ExerciseWithParsedFields) => library.actions.toggleFavorite(exercise.id))
  const loadSuggestedExercises = library.actions.loadSuggestedExercises
  const clearSuggestedExercises = library.actions.clearSuggestedExercises

  // Sync display value when filter is reset externally
  useEffect(() => {
    setInputQuery(library.filters.query)
  }, [library.filters.query])

  useEffect(() => {
    if (!isOpen || effectiveSuggestedExercises.length > 0) return

    if (selectedExercise) {
      void loadSuggestedExercises({ exerciseId: selectedExercise.id, limit: 6 })
      return
    }

    void clearSuggestedExercises()
  }, [
    clearSuggestedExercises,
    effectiveSuggestedExercises.length,
    isOpen,
    loadSuggestedExercises,
    selectedExercise,
  ])

  const handleQueryChange = (query: string) => {
    setInputQuery(query)
    clearTimeout(queryDebounceRef.current)
    queryDebounceRef.current = setTimeout(() => {
      void library.actions.setQuery(query)
    }, 300)
  }

  const closePicker = () => {
    setIsOpen(false)
    onPickerClose?.()
  }

  const handleSelectExercise = (exercise: ExerciseWithParsedFields) => {
    onSelectExercise(exercise)
    closePicker()
  }

  const clearSelection = () => {
    clearTimeout(queryDebounceRef.current)
    onClearExercise?.()
    void library.actions.resetFilters()
  }

  return (
    <div className={`relative ${className}`}>
      {selectedExercise ? (
        <SelectedExercisePanel
          exercise={selectedExercise}
          onChange={openPicker}
          onPrefetch={prefetchLibrary}
          onClear={onClearExercise ? clearSelection : undefined}
        />
      ) : (
        <EmptyExerciseSelector onOpen={openPicker} onPrefetch={prefetchLibrary} />
      )}

      <ExerciseSelectorModal
        isOpen={isOpen}
        query={inputQuery}
        selectedCategory={selectedCategory}
        selectedEquipment={selectedEquipment}
        categories={library.categories}
        equipmentTypes={library.equipmentTypes}
        exercises={library.exercises}
        total={library.total}
        isLoading={library.isLoading}
        isLoadingMore={library.isLoadingMore}
        hasMore={library.hasMore}
        favoriteExercises={effectiveFavoriteExercises}
        favoriteExerciseIds={effectiveFavoriteExerciseIds}
        recentlyUsedExercises={effectiveRecentlyUsedExercises}
        suggestedExercises={effectiveSuggestedExercises}
        onClose={closePicker}
        onQueryChange={handleQueryChange}
        onCategoryChange={(categoryId) => {
          void library.actions.updateFilters({
            categoryIds: categoryId ? [categoryId] : [],
          })
        }}
        onEquipmentChange={(equipment) => {
          void library.actions.updateFilters({
            equipment: equipment ? [equipment] : [],
          })
        }}
        onSelectExercise={handleSelectExercise}
        onToggleFavorite={effectiveToggleFavorite}
        onLoadMore={() => void library.actions.loadMore()}
        onAddCustomExercise={user ? () => setIsFormOpen(true) : undefined}
      />

      {user && (
        <CustomExerciseForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          categories={library.categories}
          userId={user.id}
          onSaved={(exercise) => {
            void library.actions.refresh()
            handleSelectExercise(exercise)
          }}
        />
      )}
    </div>
  )
}
