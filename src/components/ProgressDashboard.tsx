import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import type { ProgressState } from '@/lib/types/progress'
import dayjs from 'dayjs'

// Temporary basic component - will be enhanced in Component Development phase
export default function ProgressDashboard() {
  const { user } = useAuth()
  const [state, setState] = useState<ProgressState>({
    filters: {
      exerciseIds: [],
      dateRange: {
        start: dayjs().subtract(90, 'day').format('YYYY-MM-DD'),
        end: dayjs().format('YYYY-MM-DD')
      },
      metric: 'volume'
    },
    data: [],
    isLoading: false,
    error: null,
    selectedChart: 'line',
    showTrendLines: true,
    highlightPRs: true
  })

  useEffect(() => {
    if (!user?.id) return

    const fetchProgressData = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        const params = new URLSearchParams({
          userId: user.id,
          startDate: state.filters.dateRange.start,
          endDate: state.filters.dateRange.end,
          metric: state.filters.metric
        })

        if (state.filters.exerciseIds.length > 0) {
          params.set('exercises', state.filters.exerciseIds.join(','))
        }

        const response = await fetch(`/api/progress?${params}`)
        if (!response.ok) throw new Error('Failed to fetch progress data')

        const result = await response.json()

        if (result.success) {
          setState(prev => ({
            ...prev,
            data: result.data.progress,
            isLoading: false
          }))
        } else {
          throw new Error(result.error || 'Unknown error')
        }
      } catch (error: any) {
        setState(prev => ({
          ...prev,
          error: error.message,
          isLoading: false
        }))
      }
    }

    fetchProgressData()
  }, [user?.id, state.filters])

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-300">
          Please log in to view your progress data.
        </p>
      </div>
    )
  }

  if (state.isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">Loading your progress...</p>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-red-800 dark:text-red-300">
            Error loading progress data: {state.error}
          </p>
        </div>
      </div>
    )
  }

  if (state.data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-yellow-800 dark:text-yellow-300">
            No workout data found for the selected period. Start logging workouts to see your progress!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Basic Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Exercises Tracked
          </h3>
          <p className="text-3xl font-bold text-blue-600">
            {state.data.length}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Total Workouts
          </h3>
          <p className="text-3xl font-bold text-green-600">
            {state.data.reduce((sum, exercise) => sum + exercise.statistics.totalWorkouts, 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Personal Records
          </h3>
          <p className="text-3xl font-bold text-purple-600">
            {state.data.reduce((sum, exercise) => {
              let prs = 0
              if (exercise.personalRecords.maxWeight) prs++
              if (exercise.personalRecords.maxReps) prs++
              if (exercise.personalRecords.maxVolume) prs++
              return sum + prs
            }, 0)}
          </p>
        </div>
      </div>

      {/* Exercise List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Exercise Progress Summary
          </h2>
        </div>
        <div className="p-6">
          {state.data.map((exercise) => (
            <div key={exercise.exerciseId} className="mb-6 last:mb-0">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {exercise.exerciseName}
                </h3>
                <div className="flex space-x-2">
                  {exercise.trends.volume === 'up' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      ↗ Improving
                    </span>
                  )}
                  {exercise.trends.volume === 'down' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                      ↘ Declining
                    </span>
                  )}
                  {exercise.trends.volume === 'stable' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300">
                      → Stable
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Workouts:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {exercise.statistics.totalWorkouts}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Total Volume:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {exercise.statistics.totalVolume.toLocaleString()} kg
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Avg Weight:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {exercise.statistics.averageWeight?.toFixed(1) || 'N/A'} kg
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Improvement:</span>
                  <span className={`ml-2 font-medium ${exercise.statistics.improvementPercentage > 0
                      ? 'text-green-600 dark:text-green-400'
                      : exercise.statistics.improvementPercentage < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                    {exercise.statistics.improvementPercentage > 0 ? '+' : ''}{exercise.statistics.improvementPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}