// React import omitted (automatic runtime) 

// Align types with central calendar types to avoid drift
interface WorkoutSet {
  id: string;
  sessionId?: string;
  exerciseId: string;
  exerciseName?: string;
  reps: number;
  weight: number;
  restTime?: number;
  notes?: string;
}

interface WorkoutSessionWithSets {
  id: string;
  userId?: string;
  date: string; // ISO string
  duration?: number; // minutes
  notes?: string;
  sets: WorkoutSet[];
  totalVolume?: number;
  exerciseCount?: number;
}

interface WorkoutDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout?: WorkoutSessionWithSets | null;
  selectedDate?: Date | null;
  isLoading: boolean;
}

export function WorkoutDetailModal({ 
  isOpen, 
  onClose, 
  workout, 
  selectedDate, 
  isLoading 
}: WorkoutDetailModalProps) {
  if (!isOpen) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Fallback friendly time formatting utilities (session may lack explicit start/end)
  const formatMinutes = (minutes?: number) => {
    if (!minutes && minutes !== 0) return '—';
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  const calculateTotalVolume = (sets: WorkoutSet[]) => {
    return sets.reduce((total, set) => total + (set.weight * set.reps), 0);
  };

  const groupSetsByExercise = (sets: WorkoutSet[]) => {
    const grouped: { [key: string]: WorkoutSet[] } = {};
    sets.forEach(set => {
      if (!grouped[set.exerciseId]) {
        grouped[set.exerciseId] = [];
      }
      grouped[set.exerciseId].push(set);
    });
    return grouped;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm modal-container z-50">
      <div className="modal-content max-w-2xl max-h-[90vh] sm:max-h-[85vh]">
        {/* Accent Bar */}
        <div className="h-1 w-full" style={{ background: 'var(--gradient-primary)' }} />
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b" style={{ 
          borderColor: 'var(--color-border)', 
          background: 'var(--color-surface-elevated)' 
        }}>
          <div>
            <h2 className="text-xl font-bold gradient-text">
              Workout Details
            </h2>
            {selectedDate && (
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                {formatDate(selectedDate)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="transition-colors hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(85vh-120px)] sm:max-h-[calc(85vh-140px)]" style={{ background: 'var(--color-surface-primary)' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading workout details...</span>
            </div>
          ) : !workout ? (
            <div className="text-center py-8">
              <div className="text-gray-400 dark:text-gray-600 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6M9 16h6M9 8h6M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No workout found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No workout data available for this date.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Workout Summary */}
              <div className="rounded-xl p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 border border-blue-100/70 dark:border-indigo-900/40 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Date
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                      {new Date(workout.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Duration
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                      {formatMinutes(workout.duration)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Total Sets
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                      {workout.sets.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Total Volume
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                      {Math.round((workout.totalVolume ?? calculateTotalVolume(workout.sets)))} kg
                    </p>
                  </div>
                </div>

                {workout.notes && (
                  <div className="mt-4 pt-4 border-t border-blue-200/60 dark:border-indigo-800/60">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Workout Notes
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {workout.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Exercises */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Exercises
                </h3>
                
                {Object.entries(groupSetsByExercise(workout.sets)).map(([exerciseId, sets]) => (
                  <div key={exerciseId} className="mb-6 last:mb-0">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      {sets[0].exerciseName}
                    </h4>
                    
                    <div className="bg-white/90 dark:bg-gray-900/80 rounded-xl border border-gray-200/70 dark:border-gray-700/60 overflow-hidden shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 dark:from-blue-600/20 dark:via-indigo-600/20 dark:to-purple-600/20">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                              Set
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                              Weight
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                              Reps
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                              Volume
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200/70 dark:divide-gray-700/60">
                          {sets.map((set, index) => (
                            <tr key={set.id}>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                {index + 1}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                {set.weight} kg
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                {set.reps}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                {Math.round(set.weight * set.reps)} kg
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {sets.find(set => set.notes) && (
                      <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 rounded-lg border border-blue-100/60 dark:border-indigo-900/40">
                        <p className="text-xs font-medium text-blue-800 dark:text-blue-400 mb-1">
                          Notes:
                        </p>
                        {sets.filter(set => set.notes).map((set, index) => (
                          <p key={index} className="text-sm text-blue-700 dark:text-blue-300">
                            Set {sets.indexOf(set) + 1}: {set.notes}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-indigo-600 text-white font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}