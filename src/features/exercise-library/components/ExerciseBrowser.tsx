import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import { toTitleCase } from '@/lib/utils/text'
import { archiveCustomExercise, fetchMyCustomExerciseIds } from '../client'
import { type ExerciseLibrarySearch, routeSearchToNavigateSearch } from '../model'
import { useExerciseLibrary } from '../useExerciseLibrary'
import CustomExerciseForm from './CustomExerciseForm'
import {
  DesktopFilterSidebar,
  ExerciseBrowserFilters,
  ExerciseBrowserHeader,
  MobileFilterDrawer,
} from './ExerciseBrowserFilters'
import ExerciseDetailModal from './ExerciseDetailModal'
import type { ExerciseFacetOption } from './ExerciseFacetFilter'
import ExerciseGrid from './ExerciseGrid'

interface ExerciseBrowserProps {
  initialFilters: ExerciseLibrarySearch
  onSelectExercise?: (exercise: ExerciseWithParsedFields) => void
}

export type { ExerciseLibrarySearch }

export default function ExerciseBrowser({
  initialFilters,
  onSelectExercise,
}: ExerciseBrowserProps) {
  const navigate = useNavigate({ from: '/exercises' })
  const { user } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithParsedFields | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<ExerciseWithParsedFields | null>(null)
  const [ownedCustomIds, setOwnedCustomIds] = useState<Set<string>>(new Set())

  const refreshOwnedCustomIds = useCallback(async () => {
    if (!user) {
      setOwnedCustomIds(new Set())
      return
    }
    try {
      setOwnedCustomIds(new Set(await fetchMyCustomExerciseIds()))
    } catch (error) {
      console.error('Failed to load custom exercises:', error)
    }
  }, [user])

  useEffect(() => {
    void refreshOwnedCustomIds()
  }, [refreshOwnedCustomIds])

  const handleRouteSearchChange = useCallback(
    (routeSearch: ExerciseLibrarySearch) => {
      void navigate({
        search: routeSearchToNavigateSearch(routeSearch),
        replace: true,
      })
    },
    [navigate],
  )

  const library = useExerciseLibrary({
    routeSearch: initialFilters,
    onRouteSearchChange: handleRouteSearchChange,
  })

  const categoryOptions: ExerciseFacetOption[] = useMemo(
    () =>
      library.categories.map((category) => ({
        id: category.id,
        label: category.name,
        count: category.exercise_count,
      })),
    [library.categories],
  )

  const equipmentOptions: ExerciseFacetOption[] = useMemo(
    () =>
      library.equipmentTypes.map((equipment) => ({
        id: equipment,
        label: toTitleCase(equipment),
      })),
    [library.equipmentTypes],
  )

  const muscleOptions: ExerciseFacetOption[] = useMemo(
    () =>
      library.muscleGroups.map((muscle) => ({
        id: muscle,
        label: toTitleCase(muscle),
      })),
    [library.muscleGroups],
  )

  const selectExercise = useCallback((exercise: ExerciseWithParsedFields) => {
    setSelectedExercise(exercise)
  }, [])

  const closeModal = useCallback(() => {
    setSelectedExercise(null)
  }, [])

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((current) => !current)
  }, [])

  const handleExerciseSelect = useCallback(
    (exercise: ExerciseWithParsedFields) => {
      if (onSelectExercise) {
        onSelectExercise(exercise)
      } else {
        selectExercise(exercise)
      }
    },
    [onSelectExercise, selectExercise],
  )

  const openCreateForm = useCallback(() => {
    setEditingExercise(null)
    setFormOpen(true)
  }, [])

  const openEditForm = useCallback((exercise: ExerciseWithParsedFields) => {
    setEditingExercise(exercise)
    setFormOpen(true)
  }, [])

  const handleSaved = useCallback(async () => {
    await Promise.all([library.actions.refresh(), refreshOwnedCustomIds()])
  }, [library.actions, refreshOwnedCustomIds])

  const handleArchive = useCallback(
    async (exercise: ExerciseWithParsedFields) => {
      await archiveCustomExercise(exercise.id)
      setSelectedExercise(null)
      await Promise.all([library.actions.refresh(), refreshOwnedCustomIds()])
    },
    [library.actions, refreshOwnedCustomIds],
  )

  const filterControls = (
    <ExerciseBrowserFilters
      query={library.filters.query}
      activeFilterCount={library.activeFilterCount}
      activeFilterChips={library.activeFilterChips}
      categoryOptions={categoryOptions}
      equipmentOptions={equipmentOptions}
      muscleOptions={muscleOptions}
      selectedCategoryIds={library.filters.categoryIds}
      selectedEquipment={library.filters.equipment}
      selectedMuscleGroups={library.filters.muscleGroups}
      favouritesCount={library.favoriteExercises.length}
      isFavouritesActive={library.filters.favourites === true}
      onQueryChange={library.actions.setQuery}
      onToggleCategory={library.actions.toggleCategory}
      onToggleEquipment={library.actions.toggleEquipment}
      onToggleMuscleGroup={library.actions.toggleMuscleGroup}
      onToggleFavourites={library.actions.toggleFavouritesFilter}
      onRemoveFilter={(chip) => library.actions.removeFilter(chip.type, chip.value)}
      onResetFilters={library.actions.resetFilters}
    />
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
        <ExerciseBrowserHeader
          activeFilterCount={library.activeFilterCount}
          onToggleFilters={toggleSidebar}
        />

        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          <MobileFilterDrawer isOpen={isSidebarOpen} onToggle={toggleSidebar}>
            {filterControls}
          </MobileFilterDrawer>
          <DesktopFilterSidebar activeFilterCount={library.activeFilterCount}>
            {filterControls}
          </DesktopFilterSidebar>

          <main className="min-w-0 flex-1">
            {user && (
              <div className="mb-3 flex justify-end sm:mb-4">
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-blue-700 hover:to-blue-600 cursor-pointer"
                >
                  <span aria-hidden>+</span> Add exercise
                </button>
              </div>
            )}
            <ExerciseGrid
              exercises={library.exercises}
              total={library.total}
              isLoading={library.isLoading}
              isLoadingMore={library.isLoadingMore}
              hasMore={library.hasMore}
              onSelectExercise={handleExerciseSelect}
              onLoadMore={library.actions.loadMore}
            />
          </main>
        </div>

        {selectedExercise && (
          <ExerciseDetailModal
            exercise={selectedExercise}
            isOpen={Boolean(selectedExercise)}
            onClose={closeModal}
            onSelectExercise={onSelectExercise}
            canManage={ownedCustomIds.has(selectedExercise.id)}
            onEditExercise={(exercise) => {
              closeModal()
              openEditForm(exercise)
            }}
            onArchiveExercise={handleArchive}
          />
        )}

        {user && (
          <CustomExerciseForm
            isOpen={formOpen}
            onClose={() => setFormOpen(false)}
            categories={library.categories}
            userId={user.id}
            initial={editingExercise}
            onSaved={handleSaved}
          />
        )}
      </div>
    </div>
  )
}
