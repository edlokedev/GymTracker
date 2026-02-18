import { useState, useEffect, useCallback } from 'react'
import type { ExerciseWithParsedFields } from '../lib/types/database'
import CategoryFilter from './CategoryFilter'
import ExerciseGrid from './ExerciseGrid'
import ExerciseDetailModal from './ExerciseDetailModal'
import MuscleGroupFilter from './MuscleGroupFilter'

interface ExerciseCategory {
  id: string
  name: string
  description?: string
  exercise_count: number
}

interface ExerciseBrowserFilters {
  category_id?: string
  equipment?: string
  muscle_group?: string
  level?: string
  force?: string
  query?: string
}

interface ExerciseSearchResult {
  data: ExerciseWithParsedFields[]
  total: number
  page: number
  totalPages: number
}

interface ExerciseBrowserState {
  // UI States
  isLoading: boolean
  isModalOpen: boolean
  isSidebarOpen: boolean
  
  // Filter States
  selectedCategory: string | null
  selectedEquipment: string | null
  selectedMuscleGroup: string | null
  searchQuery: string
  
  // Data States
  exercises: ExerciseWithParsedFields[]
  categories: ExerciseCategory[]
  equipmentTypes: string[]
  muscleGroups: string[]
  
  // Pagination States
  currentPage: number
  totalPages: number
  hasMore: boolean
  
  // Selection State
  selectedExercise: ExerciseWithParsedFields | null
}

interface ExerciseBrowserProps {
  onSelectExercise?: (exercise: ExerciseWithParsedFields) => void
}

export default function ExerciseBrowser({ 
  onSelectExercise
}: ExerciseBrowserProps) {
  const [state, setState] = useState<ExerciseBrowserState>({
    isLoading: false,
    isModalOpen: false,
    isSidebarOpen: false,
    selectedCategory: null,
    selectedEquipment: null,
    selectedMuscleGroup: null,
    searchQuery: '',
    exercises: [],
    categories: [],
    equipmentTypes: [],
    muscleGroups: [],
    currentPage: 1,
    totalPages: 1,
    hasMore: false,
    selectedExercise: null,
  })

  // Load initial data
  useEffect(() => {
    Promise.all([
      loadCategories(),
      loadEquipmentTypes(),
      loadMuscleGroups(),
      searchExercises({})
    ])
  }, [])

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/exercise-categories')
      const data = await response.json()
      setState(prev => ({ ...prev, categories: data.data || [] }))
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const loadEquipmentTypes = async () => {
    try {
      const response = await fetch('/api/equipment-types')
      const data = await response.json()
      setState(prev => ({ ...prev, equipmentTypes: data.data || [] }))
    } catch (error) {
      console.error('Failed to load equipment types:', error)
    }
  }

  const loadMuscleGroups = async () => {
    try {
      const response = await fetch('/api/muscle-groups')
      const data = await response.json()
      setState(prev => ({ ...prev, muscleGroups: data.data || [] }))
    } catch (error) {
      console.error('Failed to load muscle groups:', error)
    }
  }

  const searchExercises = useCallback(async (filters: ExerciseBrowserFilters) => {
    setState(prev => ({ ...prev, isLoading: true }))
    
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
      params.append('limit', '20')
      
      const response = await fetch(`/api/exercises/search?${params.toString()}`)
      const result: ExerciseSearchResult = await response.json()
      
      setState(prev => ({
        ...prev,
        exercises: result.data || [],
        hasMore: result.page < result.totalPages,
        totalPages: result.totalPages,
        currentPage: result.page,
        isLoading: false,
      }))
    } catch (error) {
      console.error('Exercise search failed:', error)
      setState(prev => ({ 
        ...prev, 
        exercises: [],
        isLoading: false 
      }))
    }
  }, [])

  const getCurrentFilters = useCallback((): ExerciseBrowserFilters => ({
    category_id: state.selectedCategory || undefined,
    equipment: state.selectedEquipment || undefined,
    muscle_group: state.selectedMuscleGroup || undefined,
    query: state.searchQuery || undefined,
  }), [state.selectedCategory, state.selectedEquipment, state.selectedMuscleGroup, state.searchQuery])

  const setCategory = useCallback((categoryId: string | null) => {
    setState(prev => ({ ...prev, selectedCategory: categoryId }))
    const filters = { ...getCurrentFilters(), category_id: categoryId || undefined }
    searchExercises(filters)
  }, [searchExercises, getCurrentFilters])

  const setEquipment = useCallback((equipment: string | null) => {
    setState(prev => ({ ...prev, selectedEquipment: equipment }))
    const filters = { ...getCurrentFilters(), equipment: equipment || undefined }
    searchExercises(filters)
  }, [searchExercises, getCurrentFilters])

  const setMuscleGroup = useCallback((muscle: string | null) => {
    setState(prev => ({ ...prev, selectedMuscleGroup: muscle }))
    const filters = { ...getCurrentFilters(), muscle_group: muscle || undefined }
    searchExercises(filters)
  }, [searchExercises, getCurrentFilters])

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }))
    const filters = { ...getCurrentFilters(), query: query || undefined }
    searchExercises(filters)
  }, [searchExercises, getCurrentFilters])

  const selectExercise = useCallback((exercise: ExerciseWithParsedFields) => {
    setState(prev => ({ ...prev, selectedExercise: exercise, isModalOpen: true }))
  }, [])

  const closeModal = useCallback(() => {
    setState(prev => ({ ...prev, isModalOpen: false, selectedExercise: null }))
  }, [])

  const toggleSidebar = useCallback(() => {
    setState(prev => ({ ...prev, isSidebarOpen: !prev.isSidebarOpen }))
  }, [])

  const resetFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedCategory: null,
      selectedEquipment: null,
      selectedMuscleGroup: null,
      searchQuery: '',
    }))
    searchExercises({})
  }, [searchExercises])

  const handleExerciseSelect = useCallback((exercise: ExerciseWithParsedFields) => {
    if (onSelectExercise) {
      onSelectExercise(exercise)
    } else {
      selectExercise(exercise)
    }
  }, [onSelectExercise, selectExercise])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile-first container with proper padding */}
      <div className="px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto">
        
        {/* Mobile-optimized Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                Exercise Library
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Browse exercises by category, muscle group, and equipment
              </p>
            </div>
            
            {/* Mobile Filter Toggle - Enhanced with gradient */}
            <button
              onClick={toggleSidebar}
              className="md:hidden flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-500 
                       hover:from-blue-700 hover:to-blue-600 text-white p-3 rounded-xl 
                       shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200"
              aria-label="Toggle filters"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile search bar (visible on mobile before sidebar) */}
        <div className="mb-4 md:hidden">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={state.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exercises..."
              className="w-full pl-10 pr-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-xl 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                       placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Mobile Bottom Sheet / Desktop Sidebar */}
          {state.isSidebarOpen && (
            <>
              {/* Mobile Backdrop */}
              <div 
                className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={toggleSidebar}
              />
              
              {/* Mobile Bottom Sheet */}
              <div className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl max-h-[85vh] overflow-hidden">
                {/* Handle bar */}
                <div className="flex justify-center py-3">
                  <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                </div>
                
                {/* Close button */}
                <div className="flex justify-between items-center px-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
                  <button
                    onClick={toggleSidebar}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Scrollable content */}
                <div className="overflow-y-auto p-6 space-y-6 max-h-[calc(85vh-100px)]">
                  {/* Category Filter */}
                  <CategoryFilter
                    categories={state.categories}
                    selectedCategory={state.selectedCategory}
                    onSelectCategory={setCategory}
                  />

                  {/* Muscle Group Filter */}
                  <MuscleGroupFilter
                    muscleGroups={state.muscleGroups}
                    selectedMuscleGroup={state.selectedMuscleGroup}
                    onSelectMuscleGroup={setMuscleGroup}
                  />

                  {/* Equipment Filter */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Equipment
                    </label>
                    <select
                      value={state.selectedEquipment || ''}
                      onChange={(e) => setEquipment(e.target.value || null)}
                      className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-xl 
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Equipment</option>
                      {state.equipmentTypes.map((equipment) => (
                        <option key={equipment} value={equipment}>
                          {equipment.charAt(0).toUpperCase() + equipment.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Clear Filters - Enhanced with gradient */}
                  <button
                    onClick={resetFilters}
                    className="w-full px-4 py-3 text-base font-medium text-white 
                             bg-gradient-to-r from-gray-600 to-gray-500 
                             hover:from-gray-700 hover:to-gray-600
                             rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-200"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Desktop Sidebar */}
          <aside className="hidden md:block md:w-64 md:flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6 sticky top-6">
              {/* Desktop Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Search Exercises
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={state.searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or muscle..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                             placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <CategoryFilter
                categories={state.categories}
                selectedCategory={state.selectedCategory}
                onSelectCategory={setCategory}
              />

              {/* Muscle Group Filter */}
              <MuscleGroupFilter
                muscleGroups={state.muscleGroups}
                selectedMuscleGroup={state.selectedMuscleGroup}
                onSelectMuscleGroup={setMuscleGroup}
              />

              {/* Equipment Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Equipment
                </label>
                <select
                  value={state.selectedEquipment || ''}
                  onChange={(e) => setEquipment(e.target.value || null)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Equipment</option>
                  {state.equipmentTypes.map((equipment) => (
                    <option key={equipment} value={equipment}>
                      {equipment.charAt(0).toUpperCase() + equipment.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              <button
                onClick={resetFilters}
                className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 
                         hover:text-gray-800 dark:hover:text-gray-200 
                         border border-gray-300 dark:border-gray-600 rounded-lg
                         hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <ExerciseGrid
              exercises={state.exercises}
              isLoading={state.isLoading}
              onSelectExercise={handleExerciseSelect}
            />
          </main>
        </div>

        {/* Exercise Detail Modal */}
        {state.isModalOpen && state.selectedExercise && (
          <ExerciseDetailModal
            exercise={state.selectedExercise}
            isOpen={state.isModalOpen}
            onClose={closeModal}
            onSelectExercise={onSelectExercise}
          />
        )}
      </div>
    </div>
  )
}