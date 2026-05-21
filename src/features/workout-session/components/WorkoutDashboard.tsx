import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { WorkoutHistoryList } from '@/features/workout-history'
import { getTimeSinceLastWorkout } from '@/features/workout-history/model'
import { useWorkoutHistory } from '@/features/workout-history/useWorkoutHistory'
import { useAuth } from '@/lib/auth'
import type { CalendarState } from '@/lib/types/calendar'

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
  const navigate = useNavigate()
  const history = useWorkoutHistory({
    userId: user?.id,
    mode: 'recent',
    limit: 5,
    onDuplicated: (session) => {
      navigate({ to: '/workout', search: { sessionId: session.id } })
    },
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
      timeSinceLastWorkout={timeSinceLastWorkout}
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
  const navigate = useNavigate()
  const history = useWorkoutHistory({
    userId: user?.id,
    mode: 'recent',
    limit: 5,
    onDuplicated: (session) => {
      navigate({ to: '/workout', search: { sessionId: session.id } })
    },
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
        <div className="mx-auto max-w-7xl px-4 py-8">
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
      <div className="mx-auto max-w-7xl px-4 py-8">
        {showOverview && (
          <WorkoutDashboardOverviewContent
            className="mb-8"
            userLabel={user?.name || user?.email || 'Athlete'}
            history={history}
            timeSinceLastWorkout={timeSinceLastWorkout}
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
  const lastSession = history.sessions[0]
  const totalWorkouts = summaryStats?.totalWorkouts ?? history.sessions.length
  const currentStreak = summaryStats?.currentStreak ?? 0
  const workoutsThisMonth = summaryStats?.workoutsThisMonth ?? 0

  const repeatLastWorkout = () => {
    if (!lastSession || history.duplicatingId) return
    history.actions.duplicateSession(lastSession.id)
  }

  return (
    <section className={className}>
      <div className="mb-4">
        <h1 className="font-bold text-2xl text-gray-900 dark:text-white sm:text-3xl">
          Welcome back, {userLabel}!
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {history.lastWorkoutDate ? (
            <>Last workout: {timeSinceLastWorkout}</>
          ) : (
            'Ready to start your fitness journey?'
          )}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[1.15fr_1fr_1fr]">
        {lastSession ? (
          <button
            type="button"
            onClick={repeatLastWorkout}
            disabled={Boolean(history.duplicatingId)}
            className="motion-press flex min-h-20 cursor-pointer items-center gap-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-left text-white shadow-sm transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RepeatWorkoutIcon className="h-8 w-8 shrink-0 text-white" />
            <span className="min-w-0">
              <span className="block truncate font-semibold">
                {history.duplicatingId ? 'Preparing workout...' : 'Repeat Last Workout'}
              </span>
              <span className="mt-1 block truncate text-blue-100 text-sm">
                Start from {lastSession.name || 'your previous session'}.
              </span>
            </span>
          </button>
        ) : (
          <Link
            to="/workout"
            className="motion-press flex min-h-20 items-center gap-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-left text-white shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <LightningIcon className="h-7 w-7 shrink-0 text-white" />
            <span className="font-semibold">Start Workout</span>
          </Link>
        )}

        {lastSession && (
          <Link
            to="/workout"
            className="motion-press flex min-h-20 items-center justify-center gap-3 rounded-lg border border-blue-500/60 bg-blue-50/80 px-5 py-4 font-semibold text-blue-600 shadow-sm transition-colors hover:bg-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:hover:bg-blue-950/35"
          >
            <LightningIcon className="h-6 w-6 shrink-0" />
            Start Workout
          </Link>
        )}

        <Link
          to="/exercises"
          className="motion-press flex min-h-20 items-center justify-center gap-3 rounded-lg border border-green-500/60 bg-green-50/80 px-5 py-4 font-semibold text-green-600 shadow-sm transition-colors hover:bg-green-100 dark:bg-green-950/20 dark:text-green-400 dark:hover:bg-green-950/35"
        >
          <DumbbellIcon className="h-6 w-6 shrink-0" />
          Exercises
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
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

function DashboardStat({
  icon,
  label,
  value,
  isLoading,
}: {
  icon: ReactNode
  label: string
  value: string | number
  isLoading: boolean
}) {
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-lg border border-gray-200 bg-white/80 px-3 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800/45">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/45 dark:text-blue-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-gray-500 text-sm dark:text-gray-400">{label}</p>
        {isLoading ? (
          <div className="mt-1 h-6 w-14 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        ) : (
          <p className="mt-0.5 truncate font-semibold text-blue-600 text-lg dark:text-blue-400">
            {value}
          </p>
        )}
      </div>
    </div>
  )
}

function RepeatWorkoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M21 12a9 9 0 1 1-2.64-6.36"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <path d="M21 4v5h-5" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      <path d="M17 17h4m-2-2v4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </svg>
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
