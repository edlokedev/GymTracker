import { useAuth } from '@/lib/auth'
import { formatDisplayDate, isToday } from '@/lib/utils/calendar'
import { findWorkoutDayForDate } from '../model'
import { useCalendarData } from '../useCalendarData'
import { RollingCalendarGrid } from './RollingCalendarGrid'
import { WorkoutDetailModal } from './WorkoutDetailModal'
import { WorkoutSummaryStats } from './WorkoutSummaryStats'

type CalendarDashboardController = ReturnType<typeof useCalendarData>
type CalendarDashboardUser = ReturnType<typeof useAuth>['user']

export const CalendarDashboard: React.FC = () => {
  const { user } = useAuth()
  const calendar = useCalendarData(user?.id || '')

  return <CalendarDashboardContent calendar={calendar} user={user} />
}

interface CalendarDashboardContentProps {
  calendar: CalendarDashboardController
  user: CalendarDashboardUser
  showSummaryStats?: boolean
}

export function CalendarDashboardContent({
  calendar,
  user,
  showSummaryStats = true,
}: CalendarDashboardContentProps) {
  const { state, actions } = calendar

  if (!user) {
    return (
      <div className="text-center py-12">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-yellow-800 dark:text-yellow-300">
            Please log in to view your workout calendar.
          </p>
        </div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-red-800 dark:text-red-300">Error loading calendar: {state.error}</p>
          <button onClick={actions.refreshData} className="mt-3 btn-primary">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const handleDayClick = (date: Date) => {
    const workoutDay = findWorkoutDayForDate(state.workoutData, date)

    if (workoutDay?.hasWorkout) {
      actions.openWorkoutModal(date)
    }
  }

  return (
    <div
      className={`mx-auto max-w-7xl space-y-4 sm:space-y-6 ${
        showSummaryStats ? 'px-4 sm:px-6' : ''
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Workout Calendar</h1>
          <p className="text-sm sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>
            Track your fitness journey with a rolling 30-day view
          </p>
        </div>

        <button
          onClick={actions.refreshData}
          disabled={state.isLoading}
          className="btn-primary disabled:opacity-50"
        >
          {state.isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Summary Stats */}
      {showSummaryStats && (
        <WorkoutSummaryStats stats={state.summaryStats} isLoading={state.isLoading} />
      )}

      {/* Calendar */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 bg-gradient-to-br from-white via-blue-50 to-indigo-50 shadow-md dark:border-gray-700/70 dark:from-gray-900 dark:via-blue-950/20 dark:to-indigo-950/30">
        <div className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(circle_at_30%_20%,black,transparent_70%)] opacity-40">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-gradient-to-br from-blue-400/30 via-indigo-400/20 to-purple-400/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-gradient-to-tr from-purple-500/20 via-indigo-500/10 to-blue-500/20 rounded-full blur-3xl" />
        </div>
        <div className="relative p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="gradient-text text-base font-semibold leading-snug sm:text-xl">
              {formatDisplayDate(state.dateRange.start)} - {formatDisplayDate(state.dateRange.end)}
            </h2>

            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              <button
                onClick={() => actions.navigateMonth('prev')}
                className="min-h-11 rounded-md border px-3 py-2 text-sm transition-colors"
                style={{
                  background: 'var(--color-surface-primary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                ← Previous
              </button>

              {!isToday(state.currentDate) && (
                <button
                  onClick={() => actions.setCurrentDate(new Date())}
                  className="btn-primary col-span-2 text-sm sm:col-span-1"
                >
                  Today
                </button>
              )}

              <button
                onClick={() => actions.navigateMonth('next')}
                className="min-h-11 rounded-md border px-3 py-2 text-sm transition-colors"
                style={{
                  background: 'var(--color-surface-primary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Next →
              </button>
            </div>
          </div>

          {/* Rolling Calendar Grid */}
          <div className="fitness-card p-2 sm:p-4">
            <RollingCalendarGrid
              workoutData={state.workoutData}
              dateRange={state.dateRange}
              onDayClick={handleDayClick}
            />
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <div
              className="flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full border shadow-sm"
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--color-info) 10%, var(--color-surface-primary))',
                borderColor: 'var(--color-info)',
                color: 'var(--color-info)',
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-info) 0%, var(--color-brand) 100%)',
                }}
              />
              <span>Light Workout</span>
            </div>
            <div
              className="flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full border shadow-sm"
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--color-warning) 10%, var(--color-surface-primary))',
                borderColor: 'var(--color-warning)',
                color: 'var(--color-warning)',
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, var(--color-warning) 0%, #ea580c 100%)',
                }}
              />
              <span>Moderate Workout</span>
            </div>
            <div
              className="flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full border shadow-sm"
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--color-danger) 10%, var(--color-surface-primary))',
                borderColor: 'var(--color-danger)',
                color: 'var(--color-danger)',
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, var(--color-danger) 0%, #dc2626 100%)',
                }}
              />
              <span>Intense Workout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Workout Detail Modal */}
      <WorkoutDetailModal
        isOpen={state.isModalOpen}
        onClose={actions.closeWorkoutModal}
        workout={state.selectedWorkout}
        selectedDate={state.selectedDate}
        isLoading={state.isLoading}
        onWorkoutDeleted={async () => {
          actions.closeWorkoutModal()
          actions.refreshData()
        }}
      />
    </div>
  )
}
