import { useEffect, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuth } from '@/lib/auth'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import { formatExerciseName } from '@/lib/utils/text'
import { FavoriteStarButton } from './ExerciseCard'
import { ExerciseHistory } from './ExerciseHistory'
import ExerciseMediaFrame from './ExerciseMediaFrame'
import { DifficultyBadge, MuscleChips } from './ExerciseMeta'

export interface SimilarExerciseItem {
  exercise: ExerciseWithParsedFields
  score?: number
  reasons?: string[]
}

interface ExerciseDetailModalProps {
  exercise: ExerciseWithParsedFields
  isOpen: boolean
  onClose: () => void
  onSelectExercise?: (exercise: ExerciseWithParsedFields) => void
  isFavorite?: boolean
  onToggleFavorite?: (exercise: ExerciseWithParsedFields) => void
  isFavoriteDisabled?: boolean
  isFavoritePending?: boolean
  similarExercises?: SimilarExerciseItem[]
  onSelectSimilarExercise?: (exercise: ExerciseWithParsedFields) => void
  // When the viewer owns this custom exercise, expose edit + archive.
  canManage?: boolean
  onEditExercise?: (exercise: ExerciseWithParsedFields) => void
  onArchiveExercise?: (exercise: ExerciseWithParsedFields) => void | Promise<void>
}

export default function ExerciseDetailModal({
  exercise,
  isOpen,
  onClose,
  onSelectExercise,
  isFavorite = false,
  onToggleFavorite,
  isFavoriteDisabled = false,
  isFavoritePending = false,
  similarExercises = [],
  onSelectSimilarExercise,
  canManage = false,
  onEditExercise,
  onArchiveExercise,
}: ExerciseDetailModalProps) {
  const { user } = useAuth()
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

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
  const exerciseTitle = formatExerciseName(exercise.name)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className="relative bg-white dark:bg-gray-800 w-full sm:rounded-lg shadow-xl 
                      sm:max-w-4xl sm:w-full max-h-full sm:max-h-[90vh] 
                      rounded-t-xl sm:rounded-xl overflow-hidden"
        >
          <div
            className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 
                        sticky top-0 bg-white dark:bg-gray-800 z-10"
          >
            <div className="min-w-0 flex-1 pr-2">
              <h2 className="truncate text-lg font-bold text-gray-900 dark:text-white sm:text-2xl">
                {exerciseTitle}
              </h2>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              {onToggleFavorite && (
                <FavoriteStarButton
                  exerciseTitle={exerciseTitle}
                  isFavorite={isFavorite}
                  onClick={() => onToggleFavorite(exercise)}
                  disabled={isFavoriteDisabled}
                  busy={isFavoritePending}
                />
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                       p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                       min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close exercise detail"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-140px)] sm:max-h-[calc(90vh-200px)]">
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <ExerciseMediaFrame
                exercise={exercise}
                alt={`${exerciseTitle} demonstration`}
                frameClassName="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100 sm:aspect-video dark:bg-gray-700"
                imageClassName="absolute inset-0 z-10 h-full w-full bg-gray-100 object-contain dark:bg-gray-700"
                iconClassName="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500"
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Exercise Details
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Category:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-white capitalize">
                        {exercise.category_name}
                      </span>
                    </div>

                    {exercise.equipment && (
                      <div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Equipment:
                        </span>
                        <span className="ml-2 text-gray-900 dark:text-white capitalize">
                          {exercise.equipment}
                        </span>
                      </div>
                    )}

                    {exercise.level && (
                      <div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Difficulty:
                        </span>
                        <span className="ml-2">
                          <DifficultyBadge level={exercise.level} />
                        </span>
                      </div>
                    )}

                    {exercise.force && (
                      <div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Force Type:
                        </span>
                        <span className="ml-2 text-gray-900 dark:text-white capitalize">
                          {exercise.force}
                        </span>
                      </div>
                    )}

                    {exercise.mechanic && (
                      <div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Mechanic:
                        </span>
                        <span className="ml-2 text-gray-900 dark:text-white capitalize">
                          {exercise.mechanic}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Target Muscles
                  </h3>

                  {exercise.primary_muscles && exercise.primary_muscles.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Primary Muscles
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <MuscleChips muscles={exercise.primary_muscles} />
                      </div>
                    </div>
                  )}

                  {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Secondary Muscles
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <MuscleChips muscles={exercise.secondary_muscles} tone="secondary" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {exercise.instructions && exercise.instructions.length > 0 && (
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    Instructions
                  </h3>
                  <ol className="space-y-3">
                    {exercise.instructions.map((instruction, index) => (
                      <li key={index} className="flex gap-3">
                        <span
                          className="flex-shrink-0 w-7 h-7 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 
                                       rounded-full flex items-center justify-center text-sm font-medium"
                        >
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

              {similarExercises.length > 0 && (
                <div className="space-y-3 border-gray-200 border-t pt-4 dark:border-gray-700 sm:space-y-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
                    Similar exercises
                  </h3>
                  <div className="space-y-2">
                    {similarExercises.map((item, index) => (
                      <button
                        key={item.exercise.id}
                        type="button"
                        onClick={() =>
                          (onSelectSimilarExercise || onSelectExercise)?.(item.exercise)
                        }
                        className="min-h-14 w-full rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:border-blue-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600 dark:hover:bg-gray-700"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 text-sm font-medium dark:bg-gray-700 dark:text-gray-300">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {formatExerciseName(item.exercise.name)}
                            </div>
                            {item.reasons && item.reasons.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {item.reasons.slice(0, 3).map((reason) => (
                                  <span
                                    key={reason}
                                    className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 text-xs dark:bg-gray-700 dark:text-gray-300"
                                  >
                                    {reason}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {user && (
                <div className="space-y-3 sm:space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    Progression History
                  </h3>
                  <ExerciseHistory exerciseId={exercise.id} />
                </div>
              )}
            </div>
          </div>

          <div
            className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700
                        bg-gray-50 dark:bg-gray-900/50 sticky bottom-0"
          >
            {canManage && onEditExercise && (
              <button
                onClick={() => onEditExercise(exercise)}
                className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[44px] cursor-pointer mr-auto"
              >
                Edit
              </button>
            )}
            {canManage && onArchiveExercise && (
              <button
                onClick={() => setConfirmArchive(true)}
                className="px-4 py-3 text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-h-[44px] cursor-pointer"
              >
                Archive
              </button>
            )}
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

      <ConfirmDialog
        isOpen={confirmArchive}
        title="Archive this exercise?"
        description="It will be hidden from search and pickers. Your logged history stays intact."
        confirmLabel="Archive"
        variant="danger"
        isConfirming={isArchiving}
        onCancel={() => setConfirmArchive(false)}
        onConfirm={async () => {
          if (!onArchiveExercise) return
          setIsArchiving(true)
          try {
            await onArchiveExercise(exercise)
            setConfirmArchive(false)
          } finally {
            setIsArchiving(false)
          }
        }}
      />
    </div>
  )
}
