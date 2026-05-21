export function formatExerciseLabel(value: string) {
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function DifficultyBadge({ level }: { level: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getLevelColor(level)}`}
    >
      {formatExerciseLabel(level)}
    </span>
  )
}

export function MuscleChips({
  muscles,
  tone = 'primary',
  limit,
}: {
  muscles: string[]
  tone?: 'primary' | 'secondary'
  limit?: number
}) {
  const visibleMuscles = typeof limit === 'number' ? muscles.slice(0, limit) : muscles
  const hiddenCount = typeof limit === 'number' ? Math.max(muscles.length - limit, 0) : 0
  const toneClass =
    tone === 'primary'
      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleMuscles.map((muscle) => (
        <span
          key={muscle}
          className={`inline-flex items-center rounded px-2 py-1 text-xs ${toneClass}`}
        >
          {formatExerciseLabel(muscle)}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="inline-flex items-center rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
          +{hiddenCount} more
        </span>
      )}
    </div>
  )
}

export function ForceIcon({ force }: { force: string | null }) {
  switch (force) {
    case 'push':
      return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7l5 5-5 5M6 12h12"
          />
        </svg>
      )
    case 'pull':
      return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 17l-5-5 5-5M18 12H6"
          />
        </svg>
      )
    case 'static':
      return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8" />
        </svg>
      )
    default:
      return null
  }
}

function getLevelColor(level: string) {
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
