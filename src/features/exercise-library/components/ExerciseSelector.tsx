import { useState } from 'react'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import { emptyExerciseLibrarySearch } from '../model'
import { useExerciseLibrary } from '../useExerciseLibrary'
import ExerciseSelectorModal from './ExerciseSelectorModal'
import { EmptyExerciseSelector, SelectedExercisePanel } from './ExerciseSelectorPanel'

interface ExerciseSelectorProps {
  onSelectExercise: (exercise: ExerciseWithParsedFields) => void
  selectedExercise?: ExerciseWithParsedFields | null
  onClearExercise?: () => void
  className?: string
}

export default function ExerciseSelector({
  onSelectExercise,
  selectedExercise,
  onClearExercise,
  className = '',
}: ExerciseSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const library = useExerciseLibrary({
    initialSearch: emptyExerciseLibrarySearch,
  })

  const selectedCategory = library.filters.categoryIds[0] || ''
  const selectedEquipment = library.filters.equipment[0] || ''

  const handleSelectExercise = (exercise: ExerciseWithParsedFields) => {
    onSelectExercise(exercise)
    setIsOpen(false)
  }

  const clearSelection = () => {
    onClearExercise?.()
    void library.actions.resetFilters()
  }

  return (
    <div className={`relative ${className}`}>
      {selectedExercise ? (
        <SelectedExercisePanel
          exercise={selectedExercise}
          onChange={() => setIsOpen(true)}
          onClear={onClearExercise ? clearSelection : undefined}
        />
      ) : (
        <EmptyExerciseSelector onOpen={() => setIsOpen(true)} />
      )}

      <ExerciseSelectorModal
        isOpen={isOpen}
        query={library.filters.query}
        selectedCategory={selectedCategory}
        selectedEquipment={selectedEquipment}
        categories={library.categories}
        equipmentTypes={library.equipmentTypes}
        exercises={library.exercises}
        total={library.total}
        isLoading={library.isLoading}
        isLoadingMore={library.isLoadingMore}
        hasMore={library.hasMore}
        onClose={() => setIsOpen(false)}
        onQueryChange={(query) => {
          void library.actions.setQuery(query)
        }}
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
        onLoadMore={() => void library.actions.loadMore()}
      />
    </div>
  )
}
