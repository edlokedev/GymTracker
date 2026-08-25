import { useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import type { ChartDataPoint, ExerciseProgress, ProgressMetric } from '@/lib/types/progress'
import { DATE_PRESETS } from '@/lib/types/progress'
import { formatExerciseName } from '@/lib/utils/text'
import {
  buildProgressChartPoints,
  findDatePresetForRange,
  getAvailableProgressMetrics,
  PROGRESS_METRIC_OPTIONS,
} from '../model'
import { useProgressDashboard } from '../useProgressDashboard'
import { ProgressChart } from './ProgressChart'

type ProgressDashboardState = ReturnType<typeof useProgressDashboard>['state']
type ProgressDashboardActions = ReturnType<typeof useProgressDashboard>['actions']

const DASHBOARD_DATE_PRESETS = DATE_PRESETS.filter((preset) => preset.value !== '7d')

export default function ProgressDashboard() {
  const { user } = useAuth()
  const { state, chartPoints, actions } = useProgressDashboard({
    userId: user?.id,
  })

  const selectedExercise =
    state.data.find((exercise) => exercise.exerciseId === state.selectedExerciseId) ??
    state.data[0] ??
    null
  const availableMetrics = selectedExercise ? getAvailableProgressMetrics(selectedExercise) : []
  const metricLabel = getMetricLabel(state.filters.metric)
  const insights = summarizeChartPoints(chartPoints)
  const rankings = useMemo(
    () => buildExerciseRankings(state.data, state.filters.metric),
    [state.data, state.filters.metric],
  )

  if (!user) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-600 dark:text-slate-300">Log in to review your progress.</p>
      </div>
    )
  }

  if (state.isLoading) {
    return <ProgressSkeleton />
  }

  if (state.error) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-5 text-center dark:border-red-900 dark:bg-red-950/40">
        <p className="font-medium text-red-900 dark:text-red-200">Couldn’t load progress</p>
        <p className="mt-1 text-red-700 text-sm dark:text-red-300">{state.error}</p>
        <button
          type="button"
          className="mt-4 min-h-11 cursor-pointer rounded-lg border border-red-300 px-4 font-semibold text-red-800 text-sm hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-900/40"
          onClick={actions.refresh}
        >
          Try again
        </button>
      </div>
    )
  }

  if (!selectedExercise) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="font-semibold text-slate-900 dark:text-slate-100">No progress yet</p>
        <p className="mx-auto mt-2 max-w-sm text-slate-600 text-sm dark:text-slate-400">
          Complete a workout with recorded sets to start seeing exercise trends.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <ProgressControls state={state} actions={actions} availableMetrics={availableMetrics} />

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold text-lg text-slate-950 dark:text-slate-50">
              {formatExerciseName(selectedExercise.exerciseName)}
            </h2>
            <p className="mt-1 text-slate-500 text-sm dark:text-slate-400">
              Best {metricLabel.toLowerCase()} set from each workout
            </p>
          </div>
          <span className="rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-800 text-xs dark:bg-blue-950 dark:text-blue-200">
            {chartPoints.length} {chartPoints.length === 1 ? 'workout' : 'workouts'}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-200 py-3 dark:divide-slate-700 dark:border-slate-700">
          <ProgressInsight
            label="Latest"
            value={
              insights.latest
                ? formatMetricValue(insights.latest.value, state.filters.metric)
                : 'No data'
            }
            detail={insights.latest ? formatDate(insights.latest.date) : undefined}
          />
          <ProgressInsight
            label="Change"
            value={formatChange(insights.changePercentage)}
            detail={insights.changePercentage === null ? 'Need 2 workouts' : 'In this period'}
            tone={getChangeTone(insights.changePercentage)}
          />
          <ProgressInsight
            label="Best in range"
            value={
              insights.best
                ? formatMetricValue(insights.best.value, state.filters.metric)
                : 'No data'
            }
            detail={insights.best ? formatDate(insights.best.date) : undefined}
          />
        </dl>

        <div className="mt-2">
          <ProgressChart points={chartPoints} metricLabel={metricLabel} />
        </div>
      </section>

      <ExerciseRankings
        rankings={rankings}
        metric={state.filters.metric}
        selectedExerciseId={selectedExercise.exerciseId}
        onSelect={actions.setSelectedExerciseId}
      />
    </div>
  )
}

function ProgressControls({
  state,
  actions,
  availableMetrics,
}: {
  state: ProgressDashboardState
  actions: ProgressDashboardActions
  availableMetrics: ProgressMetric[]
}) {
  const activePreset = findDatePresetForRange(state.filters.dateRange)

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <label
            className="mb-1.5 block font-semibold text-slate-700 text-sm dark:text-slate-200"
            htmlFor="progress-exercise"
          >
            Exercise
          </label>
          <div className="relative">
            <select
              id="progress-exercise"
              className="min-h-11 w-full cursor-pointer rounded-lg border border-slate-300 bg-slate-50 px-3 text-slate-950 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                paddingRight: 48,
              }}
              value={state.selectedExerciseId ?? ''}
              onChange={(event) => actions.setSelectedExerciseId(event.target.value)}
            >
              {state.data.map((exercise) => (
                <option key={exercise.exerciseId} value={exercise.exerciseId}>
                  {formatExerciseName(exercise.exerciseName)}
                </option>
              ))}
            </select>
            <svg
              data-testid="exercise-select-chevron"
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 20 20"
              className="pointer-events-none absolute fill-slate-500 dark:fill-slate-400"
              style={{
                top: '50%',
                right: 16,
                width: 16,
                height: 16,
                transform: 'translateY(-50%)',
              }}
            >
              <path
                fillRule="evenodd"
                d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        <fieldset className="grid grid-cols-3 rounded-lg bg-slate-200 p-1 dark:bg-slate-800">
          <legend className="sr-only">Time range</legend>
          {DASHBOARD_DATE_PRESETS.map((preset) => {
            const isActive = activePreset?.value === preset.value
            return (
              <button
                key={preset.value}
                type="button"
                className={`min-h-11 min-w-16 cursor-pointer rounded-md px-3 font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  isActive
                    ? 'bg-slate-50 text-blue-700 shadow-sm dark:bg-slate-950 dark:text-blue-300'
                    : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-slate-50'
                }`}
                aria-pressed={isActive}
                onClick={() => actions.setDatePreset(preset.value)}
              >
                {preset.value === '1y' ? '1Y' : preset.value.toUpperCase()}
              </button>
            )
          })}
        </fieldset>
      </div>

      <fieldset className="mt-4">
        <legend className="mb-2 font-semibold text-slate-700 text-sm dark:text-slate-200">
          Metric
        </legend>
        <div className="flex flex-wrap gap-2">
          {availableMetrics.map((metric) => {
            const isActive = metric === state.filters.metric
            return (
              <button
                key={metric}
                type="button"
                className={`min-h-11 cursor-pointer rounded-lg border px-4 font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  isActive
                    ? 'border-blue-600 bg-blue-600 text-slate-50'
                    : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600'
                }`}
                aria-pressed={isActive}
                onClick={() => actions.setMetric(metric)}
              >
                {getMetricLabel(metric)}
              </button>
            )
          })}
        </div>
      </fieldset>

      <details className="mt-3 text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100">
          Custom date range
        </summary>
        <div className="grid gap-3 pt-2 sm:grid-cols-2">
          <label className="font-medium text-slate-600 text-xs dark:text-slate-400">
            Start date
            <input
              type="date"
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-slate-950 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
              value={state.filters.dateRange.start}
              onChange={(event) =>
                actions.setDateRange({
                  ...state.filters.dateRange,
                  start: event.target.value,
                })
              }
            />
          </label>
          <label className="font-medium text-slate-600 text-xs dark:text-slate-400">
            End date
            <input
              type="date"
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-slate-950 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
              value={state.filters.dateRange.end}
              onChange={(event) =>
                actions.setDateRange({
                  ...state.filters.dateRange,
                  end: event.target.value,
                })
              }
            />
          </label>
        </div>
      </details>
    </section>
  )
}

function ProgressInsight({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string
  value: string
  detail?: string
  tone?: 'positive' | 'negative' | 'neutral'
}) {
  const valueColor = {
    positive: 'text-emerald-700 dark:text-emerald-300',
    negative: 'text-rose-700 dark:text-rose-300',
    neutral: 'text-slate-950 dark:text-slate-50',
  }[tone]

  return (
    <div className="min-w-0 px-2 first:pl-0 last:pr-0 sm:px-5">
      <dt className="truncate font-medium text-slate-500 text-xs dark:text-slate-400">{label}</dt>
      <dd className={`mt-1 truncate font-semibold text-sm sm:text-lg ${valueColor}`}>{value}</dd>
      {detail && (
        <span className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-400">
          {detail}
        </span>
      )}
    </div>
  )
}

interface ExerciseRanking {
  exerciseId: string
  exerciseName: string
  latestValue: number
  changePercentage: number | null
  workouts: number
}

function ExerciseRankings({
  rankings,
  metric,
  selectedExerciseId,
  onSelect,
}: {
  rankings: ExerciseRanking[]
  metric: ProgressMetric
  selectedExerciseId: string
  onSelect: (exerciseId: string) => void
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
        <h2 className="font-semibold text-slate-950 dark:text-slate-50">
          Exercises using {getMetricLabel(metric).toLowerCase()}
        </h2>
        <p className="mt-0.5 text-slate-500 text-sm dark:text-slate-400">
          Ranked by change in this period
        </p>
      </div>

      {rankings.length === 0 ? (
        <p className="px-4 py-8 text-center text-slate-500 text-sm dark:text-slate-400">
          No comparable exercise data for this metric.
        </p>
      ) : (
        <ol className="divide-y divide-slate-200 dark:divide-slate-800">
          {rankings.map((ranking, index) => {
            const isSelected = ranking.exerciseId === selectedExerciseId
            const changeTone = getChangeTone(ranking.changePercentage)
            return (
              <li key={ranking.exerciseId}>
                <button
                  type="button"
                  className={`grid min-h-14 w-full cursor-pointer grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-5 ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/30'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  aria-label={`View ${formatExerciseName(ranking.exerciseName)}`}
                  onClick={() => onSelect(ranking.exerciseId)}
                >
                  <span className="font-semibold text-slate-400 text-sm dark:text-slate-500">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-900 text-sm dark:text-slate-100">
                      {formatExerciseName(ranking.exerciseName)}
                    </span>
                    <span className="block text-slate-500 text-xs dark:text-slate-400">
                      {ranking.workouts} {ranking.workouts === 1 ? 'workout' : 'workouts'} · Latest{' '}
                      {formatMetricValue(ranking.latestValue, metric)}
                    </span>
                  </span>
                  <span
                    className={`font-semibold text-sm ${
                      changeTone === 'positive'
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : changeTone === 'negative'
                          ? 'text-rose-700 dark:text-rose-300'
                          : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {formatChange(ranking.changePercentage)}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

function ProgressSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading progress">
      <div className="h-40 animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none dark:bg-slate-800" />
      <div className="h-96 animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none dark:bg-slate-800" />
      <span className="sr-only">Loading progress</span>
    </div>
  )
}

function summarizeChartPoints(points: ChartDataPoint[]) {
  const latest = points.at(-1) ?? null
  const best =
    points.length > 0
      ? points.reduce((currentBest, point) =>
          point.value > currentBest.value ? point : currentBest,
        )
      : null
  const first = points[0] ?? null
  const changePercentage =
    first && latest && first.value > 0 && points.length > 1
      ? ((latest.value - first.value) / first.value) * 100
      : null

  return { latest, best, changePercentage }
}

function buildExerciseRankings(
  exercises: ExerciseProgress[],
  metric: ProgressMetric,
): ExerciseRanking[] {
  return exercises
    .flatMap((exercise) => {
      const points = buildProgressChartPoints([exercise], metric, {
        exerciseId: exercise.exerciseId,
      })
      const summary = summarizeChartPoints(points)
      if (!summary.latest) return []

      return [
        {
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          latestValue: summary.latest.value,
          changePercentage: summary.changePercentage,
          workouts: points.length,
        },
      ]
    })
    .sort((left, right) => {
      if (left.changePercentage === null && right.changePercentage === null) return 0
      if (left.changePercentage === null) return 1
      if (right.changePercentage === null) return -1
      return right.changePercentage - left.changePercentage
    })
}

function getMetricLabel(metric: ProgressMetric): string {
  return PROGRESS_METRIC_OPTIONS.find((option) => option.value === metric)?.label ?? metric
}

function formatMetricValue(value: number, metric: ProgressMetric): string {
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: 1 })

  switch (metric) {
    case 'weight':
      return `${formatted} kg`
    case 'reps':
      return `${formatted} reps`
    case 'volume':
      return `${formatted} kg·reps`
    case 'duration':
      return formatDuration(value)
    case 'distance':
      return `${formatted} km`
    case 'speed':
      return `${formatted} km/h`
  }
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

function formatChange(changePercentage: number | null): string {
  if (changePercentage === null) return '—'
  const prefix = changePercentage > 0 ? '+' : ''
  return `${prefix}${changePercentage.toFixed(1)}%`
}

function getChangeTone(changePercentage: number | null): 'positive' | 'negative' | 'neutral' {
  if (changePercentage === null || changePercentage === 0) return 'neutral'
  return changePercentage > 0 ? 'positive' : 'negative'
}

function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
