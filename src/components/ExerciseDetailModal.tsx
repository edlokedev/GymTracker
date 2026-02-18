import { useEffect } from 'react'
import type { ExerciseWithParsedFields } from '../lib/types/database'

interface ExerciseDetailModalProps {
  exercise: ExerciseWithParsedFields
  isOpen: boolean
  onClose: () => void
  onSelectExercise?: (exercise: ExerciseWithParsedFields) => void
}

export default function ExerciseDetailModal({
  exercise,
  isOpen,
  onClose,
  onSelectExercise,
}: ExerciseDetailModalProps) {
  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const formatMuscleName = (muscle: string) => {
    return muscle.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'advanced':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'expert':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal - Mobile optimized */}
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="relative bg-white dark:bg-gray-800 w-full sm:rounded-lg shadow-xl 
                      sm:max-w-4xl sm:w-full max-h-full sm:max-h-[90vh] 
                      rounded-t-xl sm:rounded-xl overflow-hidden">
          {/* Header - Mobile optimized */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 
                        sticky top-0 bg-white dark:bg-gray-800 z-10">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white pr-2">
              {exercise.name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
                       p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                       min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content - Mobile optimized scrolling */}
          <div className="overflow-y-auto max-h-[calc(100vh-140px)] sm:max-h-[calc(90vh-200px)]">
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Exercise Images - Mobile optimized */}
              {exercise.images && exercise.images.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {exercise.images.slice(0, 2).map((image, index) => (
                    <div key={index} className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <img
                        src={`/images/exercises/${image}`}
                        alt={`${exercise.name} - Step ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/images/placeholder-exercise.png'
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Exercise Metadata - Mobile optimized grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Exercise Details
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Category:</span>
                      <span className="ml-2 text-gray-900 dark:text-white capitalize">{exercise.category_name}</span>
                    </div>
                    
                    {exercise.equipment && (
                      <div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Equipment:</span>
                        <span className="ml-2 text-gray-900 dark:text-white capitalize">{exercise.equipment}</span>
                      </div>
                    )}
                    
                    {exercise.level && (
                      <div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Difficulty:</span>
                        <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(exercise.level)}`}>
                          {exercise.level.charAt(0).toUpperCase() + exercise.level.slice(1)}
                        </span>
                      </div>
                    )}
                    
                    {exercise.force && (
                      <div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Force Type:</span>
                        <span className="ml-2 text-gray-900 dark:text-white capitalize">{exercise.force}</span>
                      </div>
                    )}
                    
                    {exercise.mechanic && (
                      <div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Mechanic:</span>
                        <span className="ml-2 text-gray-900 dark:text-white capitalize">{exercise.mechanic}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Target Muscles
                  </h3>
                  
                  {/* Primary Muscles */}
                  {exercise.primary_muscles && exercise.primary_muscles.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Primary Muscles
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {exercise.primary_muscles.map((muscle, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm
                                     bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                          >
                            {formatMuscleName(muscle)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Secondary Muscles */}
                  {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Secondary Muscles
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {exercise.secondary_muscles.map((muscle, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm
                                     bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                          >
                            {formatMuscleName(muscle)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Instructions - Mobile optimized */}
              {exercise.instructions && exercise.instructions.length > 0 && (
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    Instructions
                  </h3>
                  <ol className="space-y-3">
                    {exercise.instructions.map((instruction, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="flex-shrink-0 w-7 h-7 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 
                                       rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                          {instruction}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>

          {/* Footer - Mobile optimized */}
          <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 
                        bg-gray-50 dark:bg-gray-900/50 sticky bottom-0">
            <button
              onClick={onClose}
              className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 
                       bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg
                       hover:bg-gray-50 dark:hover:bg-gray-700 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                       transition-colors min-h-[44px]"
            >
              Close
            </button>
            
            {onSelectExercise && (
              <button
                onClick={() => {
                  onSelectExercise(exercise)
                  onClose()
                }}
                className="px-6 py-3 text-sm font-medium text-white 
                         bg-gradient-to-r from-blue-600 to-blue-500 
                         hover:from-blue-700 hover:to-blue-600 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                         transition-all duration-200 min-h-[44px] shadow-sm hover:shadow-md"
              >
                Select Exercise
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}