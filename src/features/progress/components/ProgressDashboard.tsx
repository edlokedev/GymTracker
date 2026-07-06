import { useAuth } from '@/lib/auth'
import type { ExerciseProgress, ProgressMetric } from '@/lib/types/progress'
import { DATE_PRESETS } from '@/lib/types/progress'
import { formatExerciseName } from '@/lib/utils/text'
import { PROGRESS_METRIC_OPTIONS } from '../model'
import { useProgressDashboard } from '../useProgressDashboard'
import { ProgressChart } from './ProgressChart'

type ProgressDashboardState = ReturnType<typeof useProgressDashboard>['state']
type ProgressDashboardActions = ReturnType<typeof useProgressDashboard>['actions']

export default function ProgressDashboard() {
  const { user } = useAuth()
  const { state, summary, chartPoints, actions } = useProgressDashboard({
    userId: user?.id,
  })

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

  return (
    <div className="space-y-6">
      <ProgressControls state={state} actions={actions} />

      {state.data.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-yellow-800 dark:text-yellow-300">
              No workout data found for the selected period. Start logging workouts to see your
              progress!
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="rounded-lg bg-white p-3 shadow dark:bg-gray-800 sm:p-6">
              <h3 className="mb-1 font-semibold text-gray-900 text-xs dark:text-white sm:mb-2 sm:text-lg">
                <span className="sm:hidden">Exercises</span>
                <span className="hidden sm:inline">Exercises Tracked</span>
              </h3>
              <p className="font-bold text-2xl text-blue-600 sm:text-3xl">
                {summary.exercisesTracked}
              </p>
            </div>

            <div className="rounded-lg bg-white p-3 shadow dark:bg-gray-800 sm:p-6">
              <h3 className="mb-1 font-semibold text-gray-900 text-xs dark:text-white sm:mb-2 sm:text-lg">
                <span className="sm:hidden">Workouts</span>
                <span className="hidden sm:inline">Total Workouts</span>
              </h3>
              <p className="font-bold text-2xl text-green-600 sm:text-3xl">
                {summary.totalWorkouts}
              </p>
            </div>

            <div className="rounded-lg bg-white p-3 shadow dark:bg-gray-800 sm:p-6">
              <h3 className="mb-1 font-semibold text-gray-900 text-xs dark:text-white sm:mb-2 sm:text-lg">
                <span className="sm:hidden">PRs</span>
                <span className="hidden sm:inline">Personal Records</span>
              </h3>
              <p className="font-bold text-2xl text-purple-600 sm:text-3xl">
                {summary.personalRecords}
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800 sm:p-6">
            <ProgressChart
              points={chartPoints}
              chartType={state.selectedChart}
              showTrendLines={state.showTrendLines}
              highlightPRs={state.highlightPRs}
              metricLabel={
                PROGRESS_METRIC_OPTIONS.find((option) => option.value === state.filters.metric)
                  ?.label ?? state.filters.metric
              }
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Exercise Progress Summary
              </h2>
            </div>
            <div className="p-6">
              {state.data.map((exercise) => {
                const trend = exercise.trends[state.filters.metric]
                const fields = buildSummaryFields(exercise, state.filters.metric)

                return (
                  <div key={exercise.exerciseId} className="mb-6 last:mb-0">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {formatExerciseName(exercise.exerciseName)}
                      </h3>
                      <div className="flex space-x-2">
                        {trend === 'up' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                            Improving
                          </span>
                        )}
                        {trend === 'down' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                            Declining
                          </span>
                        )}
                        {trend === 'stable' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300">
                            Stable
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {fields.map((field) => (
                        <div key={field.label}>
                          <span className="text-gray-500 dark:text-gray-400">{field.label}:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">
                            {field.value}
                          </span>
                        </div>
                      ))}
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Improvement:</span>
                        <span
                          className={`ml-2 font-medium ${
                            exercise.statistics.improvementPercentage > 0
                              ? 'text-green-600 dark:text-green-400'
                              : exercise.statistics.improvementPercentage < 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {exercise.statistics.improvementPercentage > 0 ? '+' : ''}
                          {exercise.statistics.improvementPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ProgressControls({
  state,
  actions,
}: {
  state: ProgressDashboardState
  actions: ProgressDashboardActions
}) {
  return (
    <div className="rounded-lg bg-white p-3 shadow dark:bg-gray-800 sm:p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <div>
          <label
            className="mb-1 block font-medium text-gray-700 text-xs dark:text-gray-300 sm:mb-2 sm:text-sm"
            htmlFor="progress-metric"
          >
            Metric
          </label>
          <select
            id="progress-metric"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            value={state.filters.metric}
            onChange={(event) =>
              actions.setMetric(event.target.value as ProgressDashboardState['filters']['metric'])
            }
          >
            {PROGRESS_METRIC_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="mb-1 block font-medium text-gray-700 text-xs dark:text-gray-300 sm:mb-2 sm:text-sm"
            htmlFor="progress-start-date"
          >
            Start Date
          </label>
          <input
            id="progress-start-date"
            type="date"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            value={state.filters.dateRange.start}
            onChange={(event) =>
              actions.setDateRange({
                ...state.filters.dateRange,
                start: event.target.value,
              })
            }
          />
        </div>

        <div>
          <label
            className="mb-1 block font-medium text-gray-700 text-xs dark:text-gray-300 sm:mb-2 sm:text-sm"
            htmlFor="progress-end-date"
          >
            End Date
          </label>
          <input
            id="progress-end-date"
            type="date"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            value={state.filters.dateRange.end}
            onChange={(event) =>
              actions.setDateRange({
                ...state.filters.dateRange,
                end: event.target.value,
              })
            }
          />
        </div>

        <div>
          <label
            className="mb-1 block font-medium text-gray-700 text-xs dark:text-gray-300 sm:mb-2 sm:text-sm"
            htmlFor="progress-chart-type"
          >
            Chart Type
          </label>
          <select
            id="progress-chart-type"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            value={state.selectedChart}
            onChange={(event) =>
              actions.setSelectedChart(
                event.target.value as ProgressDashboardState['selectedChart'],
              )
            }
          >
            <option value="line">Line</option>
            <option value="bar">Bar</option>
          </select>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 sm:mt-4 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className="min-h-9 rounded-md border border-gray-300 px-2 py-1 text-center font-medium text-gray-700 text-xs hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 sm:px-3 sm:py-1.5 sm:text-sm"
            onClick={() => actions.setDatePreset(preset.value)}
          >
            {preset.label}
          </button>
        ))}

        <div className="col-span-4 flex flex-wrap items-center gap-x-4 gap-y-2 sm:contents">
          <label className="inline-flex items-center gap-2 text-gray-700 text-sm dark:text-gray-300">
            <input
              type="checkbox"
              checked={state.showTrendLines}
              onChange={(event) => actions.setShowTrendLines(event.target.checked)}
            />
            Trend lines
          </label>

          <label className="inline-flex items-center gap-2 text-gray-700 text-sm dark:text-gray-300">
            <input
              type="checkbox"
              checked={state.highlightPRs}
              onChange={(event) => actions.setHighlightPRs(event.target.checked)}
            />
            Highlight PRs
          </label>
        </div>
      </div>
    </div>
  )
}

function buildSummaryFields(
  exercise: ExerciseProgress,
  metric: ProgressMetric,
): Array<{ label: string; value: string }> {
  const base = [{ label: 'Workouts', value: String(exercise.statistics.totalWorkouts) }]

  if (metric === 'duration') {
    return [
      ...base,
      { label: 'Duration', value: formatDuration(exercise.statistics.totalDurationSeconds) },
      { label: 'Avg Speed', value: formatSpeed(exercise.statistics.averageSpeedKmh) },
    ]
  }

  if (metric === 'distance' || metric === 'speed') {
    return [
      ...base,
      { label: 'Distance', value: `${formatNumber(exercise.statistics.totalDistanceKm)} km` },
      { label: 'Avg Speed', value: formatSpeed(exercise.statistics.averageSpeedKmh) },
    ]
  }

  return [
    ...base,
    { label: 'Volume', value: `${formatNumber(exercise.statistics.totalVolume)} kg` },
    { label: 'Avg Weight', value: formatWeight(exercise.statistics.averageWeight) },
  ]
}

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function formatWeight(value: number | null): string {
  return value === null ? 'N/A' : `${formatNumber(value)} kg`
}

function formatSpeed(value: number | null): string {
  return value === null ? 'N/A' : `${formatNumber(value)} km/h`
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'N/A'
  const minutes = Math.round(totalSeconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}
