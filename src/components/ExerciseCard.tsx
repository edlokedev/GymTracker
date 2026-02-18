import type { ExerciseWithParsedFields } from '../lib/types/database'

interface ExerciseCardProps {
  exercise: ExerciseWithParsedFields
  onSelect: (exercise: ExerciseWithParsedFields) => void
}

export default function ExerciseCard({ exercise, onSelect }: ExerciseCardProps) {
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

  const getForceIcon = (force: string | null) => {
    switch (force) {
      case 'push':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
          </svg>
        )
      case 'pull':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5 5-5M18 12H6" />
          </svg>
        )
      case 'static':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div
      onClick={() => onSelect(exercise)}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 
                 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer
                 hover:scale-[1.02] hover:border-blue-300 dark:hover:border-blue-600
                 group active:scale-[0.98]"
    >
      {/* Exercise Image */}
      {exercise.images && exercise.images.length > 0 && (
        <div className="aspect-video bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 
                       dark:from-gray-700 dark:via-gray-600 dark:to-gray-500 rounded-t-xl overflow-hidden">
          <img
            src={`/images/exercises/${exercise.images[0]}`}
            alt={exercise.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              // Hide image if it fails to load
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Exercise Name - Mobile optimized */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white line-clamp-2 
                       group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
            {exercise.name}
          </h3>
          {exercise.force && (
            <div className="flex-shrink-0 text-gray-400 dark:text-gray-500 mt-0.5">
              {getForceIcon(exercise.force)}
            </div>
          )}
        </div>

        {/* Category and Equipment - Mobile optimized */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <span className="capitalize">{exercise.category_name}</span>
            {exercise.equipment && (
              <>
                <span>•</span>
                <span className="capitalize">{exercise.equipment}</span>
              </>
            )}
          </div>
        </div>

        {/* Difficulty Level - Mobile optimized */}
        {exercise.level && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getLevelColor(exercise.level)}`}>
              {exercise.level.charAt(0).toUpperCase() + exercise.level.slice(1)}
            </span>
            {exercise.mechanic && (
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {exercise.mechanic}
              </span>
            )}
          </div>
        )}

        {/* Primary Muscles - Mobile optimized */}
        {exercise.primary_muscles && exercise.primary_muscles.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Primary Muscles
            </div>
            <div className="flex flex-wrap gap-1.5">
              {exercise.primary_muscles.slice(0, 3).map((muscle, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded text-xs 
                           bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                >
                  {formatMuscleName(muscle)}
                </span>
              ))}
              {exercise.primary_muscles.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs 
                               bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                  +{exercise.primary_muscles.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Select Button - Enhanced with gradient */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSelect(exercise)
          }}
          className="w-full mt-4 px-4 py-3 text-sm font-medium text-white 
                   bg-gradient-to-r from-blue-600 to-blue-500 
                   hover:from-blue-700 hover:to-blue-600
                   rounded-lg shadow-sm hover:shadow-md
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                   transition-all duration-200 min-h-[44px] 
                   active:bg-blue-700 dark:active:bg-blue-600"
        >
          View Details
        </button>
      </div>
    </div>
  )
}