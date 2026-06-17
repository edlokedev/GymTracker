import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { WorkoutHistoryList } from '@/features/workout-history'
import { getTimeSinceLastWorkout } from '@/features/workout-history/model'
import { useWorkoutHistory } from '@/features/workout-history/useWorkoutHistory'
import { useNextWorkout } from '@/features/workout-templates/useNextWorkout'
import { useAuth } from '@/lib/auth'
import type { CalendarState } from '@/lib/types/calendar'
import type { NextWorkoutRecommendation } from '@/lib/types/database'

interface WorkoutDashboardProps {
  className?: string
  showOverview?: boolean
}

type WorkoutHistoryState = ReturnType<typeof useWorkoutHistory>
type DashboardSummaryStats = CalendarState['summaryStats']

export function WorkoutDashboardOverview({
  className = '',
  summaryStats,
  isSummaryLoading = false,
}: {
  className?: string
  summaryStats?: DashboardSummaryStats
  isSummaryLoading?: boolean
}) {
  const { user } = useAuth()
  const history = useWorkoutHistory({
    userId: user?.id,
    mode: 'recent',
    limit: 5,
  })
  const timeSinceLastWorkout = useMemo(
    () => getTimeSinceLastWorkout(history.lastWorkoutDate),
    [history.lastWorkoutDate],
  )

  if (history.isLoading) {
    return <WorkoutDashboardOverviewSkeleton className={className} />
  }

  return (
    <WorkoutDashboardOverviewContent
      className={className}
      userLabel={user?.name || user?.email || 'Athlete'}
      history={history}
      timeSinceLastWorkout={timeSinceLastWorkout ?? ''}
      summaryStats={summaryStats}
      isSummaryLoading={isSummaryLoading}
    />
  )
}

export default function WorkoutDashboard({
  className = '',
  showOverview = true,
}: WorkoutDashboardProps) {
  const { user } = useAuth()
  const history = useWorkoutHistory({
    userId: user?.id,
    mode: 'recent',
    limit: 5,
  })
  const timeSinceLastWorkout = useMemo(
    () => getTimeSinceLastWorkout(history.lastWorkoutDate),
    [history.lastWorkoutDate],
  )

  if (history.isLoading) {
    return (
      <div
        className={`${showOverview ? 'min-h-screen bg-gray-50 dark:bg-gray-900' : ''} ${className}`}
      >
        <div className={showOverview ? 'mx-auto max-w-7xl px-4 py-8' : 'mx-auto max-w-7xl p-0'}>
          <div className="animate-pulse">
            {showOverview && (
              <>
                <div className="mb-4 h-8 w-1/4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mb-8 h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-48 rounded-lg bg-gray-200 dark:bg-gray-700" />
                  ))}
                </div>
              </>
            )}
            <div className="h-48 rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${showOverview ? 'min-h-screen bg-gray-50 dark:bg-gray-900' : ''} ${className}`}
    >
      <div className={showOverview ? 'mx-auto max-w-7xl px-4 py-8' : 'mx-auto max-w-7xl p-0'}>
        {showOverview && (
          <WorkoutDashboardOverviewContent
            className="mb-8"
            userLabel={user?.name || user?.email || 'Athlete'}
            history={history}
            timeSinceLastWorkout={timeSinceLastWorkout ?? ''}
          />
        )}

        <div className="rounded-xl bg-white p-6 shadow-lg dark:bg-gray-800">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-xl dark:text-white">Recent Workouts</h2>
            {history.sessions.length > 0 && (
              <Link to="/history" className="font-medium text-blue-600 text-sm hover:text-blue-700">
                View All
              </Link>
            )}
          </div>
          {history.sessions.length === 0 && !history.isLoading ? (
            <div>
              <svg
                className="mx-auto mb-4 h-16 w-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <WorkoutHistoryList
                history={history}
                emptyTitle="No workouts yet"
                emptyDescription="Start your fitness journey by logging your first workout session."
                emptyActionLabel="Start First Workout"
              />
            </div>
          ) : (
            <WorkoutHistoryList
              history={history}
              emptyTitle="No workouts yet"
              emptyDescription="Start your fitness journey by logging your first workout session."
              emptyActionLabel="Start First Workout"
            />
          )}
        </div>
      </div>
    </div>
  )
}

function WorkoutDashboardOverviewSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="mb-8">
        <div className="mb-4 h-8 w-80 max-w-full rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-44 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="h-40 rounded-xl bg-gray-200 dark:bg-gray-700 md:col-span-2 lg:col-span-3" />
        <div className="h-36 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="h-36 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="h-36 rounded-xl bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  )
}

function WorkoutDashboardOverviewContent({
  className = '',
  userLabel,
  history,
  timeSinceLastWorkout,
  summaryStats,
  isSummaryLoading = false,
}: {
  className?: string
  userLabel: string
  history: WorkoutHistoryState
  timeSinceLastWorkout: string
  summaryStats?: DashboardSummaryStats
  isSummaryLoading?: boolean
}) {
  const navigate = useNavigate()
  const nextWorkout = useNextWorkout()
  const totalWorkouts = summaryStats?.totalWorkouts ?? history.sessions.length
  const currentStreak = summaryStats?.currentStreak ?? 0
  const workoutsThisMonth = summaryStats?.workoutsThisMonth ?? 0

  const startRecommendedWorkout = async () => {
    const recommendation = nextWorkout.recommendation
    if (!recommendation) {
      navigate({ to: '/workout' })
      return
    }

    if (recommendation.type === 'template' && recommendation.templateId) {
      navigate({ to: '/workout', search: { templateId: recommendation.templateId } })
      return
    }

    if (recommendation.type === 'repeat-last' && recommendation.sessionId) {
      navigate({ to: '/workout' })
      return
    }

    navigate({ to: '/workout' })
  }

  return (
    <section className={className}>
      <div className="mb-3 sm:mb-4">
        <h1 className="truncate font-bold text-gray-900 text-xl dark:text-white sm:text-3xl">
          Welcome back, {userLabel}!
        </h1>
        <p className="mt-1 text-gray-600 text-sm dark:text-gray-400 sm:mt-2 sm:text-base">
          {history.lastWorkoutDate ? (
            <>Last workout: {timeSinceLastWorkout}</>
          ) : (
            'Ready to start your fitness journey?'
          )}
        </p>
      </div>

      <NextWorkoutCard
        recommendation={nextWorkout.recommendation}
        isLoading={nextWorkout.isLoading}
        isStarting={Boolean(history.duplicatingId)}
        onStart={startRecommendedWorkout}
      />

      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-[1.15fr_1fr]">
        <Link
          to="/workout"
          className="motion-press flex min-h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-left font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md sm:min-h-20 sm:gap-3 sm:px-5 sm:py-4 sm:text-base"
        >
          <LightningIcon className="h-5 w-5 shrink-0 text-white sm:h-6 sm:w-6" />
          <span>Start Workout</span>
        </Link>

        <Link
          to="/exercises"
          className="motion-press flex min-h-12 items-center justify-center gap-2 rounded-lg border border-green-500/60 bg-green-50/80 px-3 py-2 font-semibold text-green-600 text-sm shadow-sm transition-colors hover:bg-green-100 dark:bg-green-950/20 dark:text-green-400 dark:hover:bg-green-950/35 sm:min-h-20 sm:gap-3 sm:px-5 sm:py-4 sm:text-base"
        >
          <DumbbellIcon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
          Exercises
        </Link>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 sm:mt-3 sm:gap-2">
        <DashboardStat
          icon={<BarChartIcon className="h-6 w-6" />}
          label="Workouts"
          value={totalWorkouts}
          isLoading={isSummaryLoading}
        />
        <DashboardStat
          icon={<FlameIcon className="h-6 w-6" />}
          label="Streak"
          value={`${currentStreak}d`}
          isLoading={isSummaryLoading}
        />
        <DashboardStat
          icon={<CalendarIcon className="h-6 w-6" />}
          label="This Month"
          mobileLabel="Month"
          value={workoutsThisMonth}
          isLoading={isSummaryLoading}
        />
        <DashboardStat
          icon={<ClockIcon className="h-6 w-6" />}
          label="Last"
          value={history.lastWorkoutDate ? timeSinceLastWorkout : 'Never'}
          isLoading={isSummaryLoading}
        />
      </div>
    </section>
  )
}

function NextWorkoutCard({
  recommendation,
  isLoading,
  isStarting,
  onStart,
}: {
  recommendation: NextWorkoutRecommendation | null
  isLoading: boolean
  isStarting: boolean
  onStart: () => void
}) {
  const title = recommendation?.title ?? 'Create your first workout'
  const reason = recommendation?.reason ?? 'Save a completed workout to make repeat sessions fast.'
  const showBrowse = recommendation?.type === 'template'

  return (
    <div className="mb-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:mb-3 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-blue-600 text-xs uppercase dark:text-blue-400">
            Next Workout
          </p>
          {isLoading ? (
            <div className="mt-2 h-7 w-56 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ) : (
            <h2 className="mt-1 truncate font-bold text-gray-900 text-xl dark:text-white">
              {title}
            </h2>
          )}
          <p className="mt-1 line-clamp-2 text-gray-600 text-sm dark:text-gray-400">{reason}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {showBrowse && (
            <Link
              to="/workouts"
              className="motion-press inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 text-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Change
            </Link>
          )}
          <button
            type="button"
            onClick={onStart}
            disabled={isLoading || isStarting}
            className="motion-press inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-semibold text-sm text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isStarting ? 'Starting...' : recommendation?.ctaLabel || 'Start Workout'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DashboardStat({
  icon,
  label,
  mobileLabel,
  value,
  isLoading,
}: {
  icon: ReactNode
  label: string
  mobileLabel?: string
  value: string | number
  isLoading: boolean
}) {
  return (
    <div className="flex min-h-14 flex-col justify-center rounded-lg border border-gray-200 bg-white/80 px-2 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800/45 sm:min-h-20 sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:px-3 sm:py-3">
      <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/45 dark:text-blue-400 sm:flex">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-gray-500 text-xs dark:text-gray-400 sm:text-sm">
          <span className="sm:hidden">{mobileLabel || label}</span>
          <span className="hidden sm:inline">{label}</span>
        </p>
        {isLoading ? (
          <div className="mt-1 h-5 w-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700 sm:h-6 sm:w-14" />
        ) : (
          <p className="mt-0.5 truncate font-semibold text-base text-blue-600 dark:text-blue-400 sm:text-lg">
            {value}
          </p>
        )}
      </div>
    </div>
  )
}

function LightningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  )
}

function DumbbellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M6 7v10M18 7v10" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      <path d="M3 9v6M21 9v6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      <path d="M6 12h12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </svg>
  )
}

function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M5 20V10h4v10" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      <path d="M10 20V4h4v16" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      <path d="M15 20V7h4v13" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </svg>
  )
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M12 22a7 7 0 0 0 7-7c0-3.5-2-6-5-8.5.2 2.5-.7 4-2 5-1.5-2-1-5-1-8C7.7 5.9 5 9.3 5 15a7 7 0 0 0 7 7Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M8 2v4M16 2v4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      <path
        d="M4 7h16M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </svg>
  )
}
