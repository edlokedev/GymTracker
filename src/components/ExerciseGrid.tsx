import type { ExerciseWithParsedFields } from '../lib/types/database'
import ExerciseCard from './ExerciseCard'

interface ExerciseGridProps {
  exercises: ExerciseWithParsedFields[]
  isLoading: boolean
  onSelectExercise: (exercise: ExerciseWithParsedFields) => void
}

export default function ExerciseGrid({
  exercises,
  isLoading,
  onSelectExercise,
}: ExerciseGridProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading Header */}
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
        </div>

        {/* Loading Grid - Tennis dashboard style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 animate-pulse"
            >
              {/* Image placeholder */}
              <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-700 rounded-xl mb-6" />
              
              {/* Title placeholder */}
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3" />
              
              {/* Subtitle placeholder */}
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
              
              {/* Tags placeholder */}
              <div className="flex gap-2 mb-6">
                <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded-full w-20" />
                <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded-full w-24" />
              </div>
              
              {/* Button placeholder */}
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (exercises.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
          <svg 
            className="w-12 h-12 text-gray-400 dark:text-gray-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No exercises found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
          Try adjusting your filters or search terms to find the exercises you're looking for.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 
                   border border-blue-600 dark:border-blue-400 rounded-md
                   hover:bg-blue-50 dark:hover:bg-blue-900/20 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                   transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset Filters
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Results Header - Tennis dashboard style */}
      <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Exercises
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} found
          </p>
        </div>
        
        {/* Sort Options - Modern style */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          Sorted by name
        </div>
      </div>

      {/* Exercise Grid - Tennis dashboard responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onSelect={onSelectExercise}
          />
        ))}
      </div>

      {/* Load More Button - Enhanced with gradient */}
      {exercises.length >= 20 && (
        <div className="text-center pt-8">
          <button
            className="inline-flex items-center px-8 py-4 text-sm font-semibold text-white 
                     bg-gradient-to-r from-blue-600 to-blue-500 
                     hover:from-blue-700 hover:to-blue-600 rounded-2xl 
                     shadow-lg hover:shadow-xl
                     focus:outline-none focus:ring-4 focus:ring-blue-500/20
                     transition-all duration-200 min-h-[48px]"
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Load More Exercises
          </button>
        </div>
      )}
    </div>
  )
}