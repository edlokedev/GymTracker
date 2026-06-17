import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import { emptyExerciseLibrarySearch } from '../model'
import { useExerciseLibrary } from '../useExerciseLibrary'
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
}: ExerciseSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)
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

  const handleSelectExercise = (exercise: ExerciseWithParsedFields) => {
    onSelectExercise(exercise)
    setIsOpen(false)
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
        onClose={() => setIsOpen(false)}
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
      />
    </div>
  )
}
