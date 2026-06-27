import type { KeyboardEvent, MouseEvent } from 'react'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import { formatExerciseName } from '@/lib/utils/text'
import ExerciseMediaFrame from './ExerciseMediaFrame'
import { DifficultyBadge, ForceIcon, MuscleChips } from './ExerciseMeta'

interface ExerciseCardProps {
  exercise: ExerciseWithParsedFields
  onSelect: (exercise: ExerciseWithParsedFields) => void
  isFavorite?: boolean
  onToggleFavorite?: (exercise: ExerciseWithParsedFields) => void
  // Disable the star (e.g. another toggle is in flight); the in-flight card
  // also gets aria-busy via isFavoritePending.
  isFavoriteDisabled?: boolean
  isFavoritePending?: boolean
}

export default function ExerciseCard({
  exercise,
  onSelect,
  isFavorite = false,
  onToggleFavorite,
  isFavoriteDisabled = false,
  isFavoritePending = false,
}: ExerciseCardProps) {
  const exerciseTitle = formatExerciseName(exercise.name)

  return (
    <div
      onClick={() => onSelect(exercise)}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 
                 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer
                 hover:scale-[1.02] hover:border-blue-300 dark:hover:border-blue-600
                 group active:scale-[0.98] h-full flex flex-col"
    >
      <div className="relative">
        <ExerciseMediaFrame
          exercise={exercise}
          alt={exerciseTitle}
          frameClassName="relative aspect-video flex-shrink-0 overflow-hidden rounded-t-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-700 dark:via-gray-600 dark:to-gray-500"
          imageClassName="absolute inset-0 z-10 h-full w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 object-cover transition-transform duration-200 group-hover:scale-105 dark:from-gray-700 dark:via-gray-600 dark:to-gray-500"
          iconClassName="absolute inset-0 flex items-center justify-center text-gray-400 transition-transform duration-200 group-hover:scale-105 dark:text-gray-500"
        />
        {onToggleFavorite && (
          <FavoriteStarButton
            exerciseTitle={exerciseTitle}
            isFavorite={isFavorite}
            onClick={(event) => {
              event.stopPropagation()
              onToggleFavorite(exercise)
            }}
            disabled={isFavoriteDisabled}
            busy={isFavoritePending}
            className="absolute top-2 right-2 z-20"
          />
        )}
      </div>

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

// Complete static class strings per state (default / active / disabled) — the
// Gymmie "static class strings only" rule forbids template-literal class
// construction, so each branch spells out the full utility set.
const STAR_DEFAULT_CLASS =
  'flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-200 bg-white/95 text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-amber-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-amber-400'

const STAR_ACTIVE_CLASS =
  'flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-200 bg-white/95 text-amber-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-amber-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-900/95 dark:text-amber-400 dark:hover:bg-gray-800 dark:hover:text-amber-400'

const STAR_DISABLED_CLASS =
  'flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-200 bg-white/95 text-gray-300 opacity-60 cursor-not-allowed shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-600'

export function FavoriteStarButton({
  exerciseTitle,
  isFavorite,
  onClick,
  disabled = false,
  busy = false,
  className = '',
}: {
  exerciseTitle: string
  isFavorite: boolean
  onClick: (event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>) => void
  disabled?: boolean
  busy?: boolean
  className?: string
}) {
  const stateClass = disabled
    ? STAR_DISABLED_CLASS
    : isFavorite
      ? STAR_ACTIVE_CLASS
      : STAR_DEFAULT_CLASS
  const buttonClassName = [stateClass, className].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={(event) => {
        if (disabled) return
        if (event.key === 'Enter' || event.key === ' ') {
          // Enter/Space already activate a native button; preventDefault stops
          // the synthesized click so the toggle fires exactly once.
          event.preventDefault()
          onClick(event)
        }
      }}
      disabled={disabled}
      aria-pressed={isFavorite}
      aria-busy={busy || undefined}
      aria-label={
        isFavorite ? `Remove ${exerciseTitle} from favorites` : `Add ${exerciseTitle} to favorites`
      }
      className={buttonClassName}
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill={isFavorite ? 'currentColor' : 'none'}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M11.48 3.5a.58.58 0 0 1 1.04 0l2.36 4.78 5.27.77a.58.58 0 0 1 .32.99l-3.82 3.72.9 5.25a.58.58 0 0 1-.84.61L12 17.14l-4.71 2.48a.58.58 0 0 1-.84-.61l.9-5.25-3.82-3.72a.58.58 0 0 1 .32-.99l5.27-.77 2.36-4.78Z"
        />
      </svg>
    </button>
  )
}
