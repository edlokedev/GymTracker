interface MuscleGroupFilterProps {
  muscleGroups: string[]
  selectedMuscleGroup: string | null
  onSelectMuscleGroup: (muscleGroup: string | null) => void
}

export default function MuscleGroupFilter({
  muscleGroups,
  selectedMuscleGroup,
  onSelectMuscleGroup,
}: MuscleGroupFilterProps) {
  // Group muscle groups by common categories for better organization
  const groupedMuscles = {
    upper: muscleGroups.filter(muscle => 
      ['chest', 'shoulders', 'triceps', 'biceps', 'forearms', 'lats', 'middle back', 'traps'].includes(muscle.toLowerCase())
    ),
    core: muscleGroups.filter(muscle => 
      ['abdominals', 'lower back', 'obliques'].includes(muscle.toLowerCase())
    ),
    lower: muscleGroups.filter(muscle => 
      ['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors'].includes(muscle.toLowerCase())
    ),
    other: muscleGroups.filter(muscle => 
      !['chest', 'shoulders', 'triceps', 'biceps', 'forearms', 'lats', 'middle back', 'traps',
        'abdominals', 'lower back', 'obliques',
        'quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors'].includes(muscle.toLowerCase())
    )
  }

  const formatMuscleName = (muscle: string) => {
    return muscle.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const renderMuscleButtons = (muscles: string[], groupTitle: string) => {
    if (muscles.length === 0) return null

    return (
      <div key={groupTitle} className="space-y-1">
        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {groupTitle}
        </h4>
        {muscles.map((muscle) => (
          <button
            key={muscle}
            onClick={() => onSelectMuscleGroup(muscle)}
            className={`
              w-full text-left px-2 py-1 rounded text-xs transition-all duration-200
              ${selectedMuscleGroup === muscle
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200'
              }
            `}
          >
            {formatMuscleName(muscle)}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Muscle Groups
        </label>
        {selectedMuscleGroup && (
          <button
            onClick={() => onSelectMuscleGroup(null)}
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Clear
          </button>
        )}
      </div>
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {renderMuscleButtons(groupedMuscles.upper, 'Upper Body')}
        {renderMuscleButtons(groupedMuscles.core, 'Core')}
        {renderMuscleButtons(groupedMuscles.lower, 'Lower Body')}
        {renderMuscleButtons(groupedMuscles.other, 'Other')}
      </div>
    </div>
  )
}