import type { ExerciseWithParsedFields } from '@/lib/types/database'
import { formatExerciseName } from '@/lib/utils/text'
import ExerciseMediaFrame from './ExerciseMediaFrame'
import { DifficultyBadge, ForceIcon, MuscleChips } from './ExerciseMeta'

interface ExerciseCardProps {
  exercise: ExerciseWithParsedFields
  onSelect: (exercise: ExerciseWithParsedFields) => void
}

export default function ExerciseCard({ exercise, onSelect }: ExerciseCardProps) {
  const exerciseTitle = formatExerciseName(exercise.name)

  return (
    <div
      onClick={() => onSelect(exercise)}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 
                 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer
                 hover:scale-[1.02] hover:border-blue-300 dark:hover:border-blue-600
                 group active:scale-[0.98] h-full flex flex-col"
    >
      <ExerciseMediaFrame
        exercise={exercise}
        alt={exerciseTitle}
        frameClassName="relative aspect-video flex-shrink-0 overflow-hidden rounded-t-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-700 dark:via-gray-600 dark:to-gray-500"
        imageClassName="absolute inset-0 z-10 h-full w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 object-cover transition-transform duration-200 group-hover:scale-105 dark:from-gray-700 dark:via-gray-600 dark:to-gray-500"
        iconClassName="absolute inset-0 flex items-center justify-center text-gray-400 transition-transform duration-200 group-hover:scale-105 dark:text-gray-500"
      />

      <div className="p-4 space-y-3 flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white line-clamp-2 
                       group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug"
          >
            {exerciseTitle}
          </h3>
          {exercise.force && (
            <div className="flex-shrink-0 text-gray-400 dark:text-gray-500 mt-0.5">
              <ForceIcon force={exercise.force} />
            </div>
          )}
        </div>

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

        {exercise.level && (
          <div className="flex items-center gap-2 flex-wrap">
            <DifficultyBadge level={exercise.level} />
            {exercise.mechanic && (
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {exercise.mechanic}
              </span>
            )}
          </div>
        )}

        {exercise.primary_muscles && exercise.primary_muscles.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Primary Muscles
            </div>
            <MuscleChips muscles={exercise.primary_muscles} limit={3} />
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation()
            onSelect(exercise)
          }}
          className="w-full mt-auto px-4 py-3 text-sm font-medium text-white 
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
