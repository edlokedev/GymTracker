import { IlamyCalendar, type CalendarEvent } from '@ilamy/calendar'
import dayjs from 'dayjs'
import { useAuth } from '../../lib/auth/context'
import { useCalendarData } from './useCalendarData'
import { WorkoutSummaryStats } from './WorkoutSummaryStats'
import { WorkoutDetailModal } from './WorkoutDetailModal'
import { formatDisplayDate, isToday } from '../../lib/utils/calendar'

export const CalendarDashboard: React.FC = () => {
  const { user } = useAuth()
  const { state, actions, workoutEvents } = useCalendarData(user?.id || '')

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
          <p className="text-red-800 dark:text-red-300">
            Error loading calendar: {state.error}
          </p>
          <button
            onClick={actions.refreshData}
            className="mt-3 btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const handleCellClick = (info: any) => {
    // Info from IlamyCalendar has a date property which could be Dayjs or Date
    const date = info.date && typeof info.date.toDate === 'function'
      ? info.date.toDate()
      : new Date(info.date)

    const workoutDay = state.workoutData.find(day =>
      new Date(day.date).toDateString() === date.toDateString()
    )

    if (workoutDay && workoutDay.hasWorkout) {
      actions.openWorkoutModal(date)
    }
  }

  const handleEventClick = (event: CalendarEvent) => {
    if (event.start) {
      // event.start is a Dayjs object per library types
      const date = typeof (event.start as any).toDate === 'function'
        ? (event.start as any).toDate()
        : new Date(event.start as any)
      actions.openWorkoutModal(date)
    }
  }

  // Transform workoutEvents to CalendarEvent format with Dayjs objects
  const calendarEvents: CalendarEvent[] = workoutEvents.map(event => ({
    id: event.id,
    title: event.title,
    start: dayjs(event.start),
    end: dayjs(event.end),
    allDay: event.allDay,
    backgroundColor: event.color || '#3b82f6',
    color: '#fff',
    data: event.data
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text">
            Workout Calendar
          </h1>
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
      <WorkoutSummaryStats
        stats={state.summaryStats}
        isLoading={state.isLoading}
      />

      {/* Calendar */}
      <div className="relative rounded-2xl shadow-md border border-gray-200/60 dark:border-gray-700/70 bg-gradient-to-br from-white via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-950/20 dark:to-indigo-950/30 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(circle_at_30%_20%,black,transparent_70%)] opacity-40">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-gradient-to-br from-blue-400/30 via-indigo-400/20 to-purple-400/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-gradient-to-tr from-purple-500/20 via-indigo-500/10 to-blue-500/20 rounded-full blur-3xl" />
        </div>
        <div className="relative p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-semibold gradient-text">
              {formatDisplayDate(state.dateRange.start)} - {formatDisplayDate(state.dateRange.end)}
            </h2>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => actions.navigateMonth('prev')}
                className="px-3 py-2 text-sm rounded-md border transition-colors min-h-[44px]"
                style={{
                  background: 'var(--color-surface-primary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                ← Previous
              </button>

              {!isToday(state.currentDate) && (
                <button
                  onClick={() => actions.setCurrentDate(new Date())}
                  className="btn-primary text-sm"
                >
                  Today
                </button>
              )}

              <button
                onClick={() => actions.navigateMonth('next')}
                className="px-3 py-2 text-sm rounded-md border transition-colors min-h-[44px]"
                style={{
                  background: 'var(--color-surface-primary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                Next →
              </button>
            </div>
          </div>

          {/* Calendar Component */}
          <div className="fitness-card p-2 sm:p-4">
            <IlamyCalendar
              events={calendarEvents}
              initialDate={state.currentDate}
              initialView="month"
              onEventClick={handleEventClick}
              onCellClick={handleCellClick}
              onDateChange={(date) => actions.setCurrentDate(date.toDate())}
              onViewChange={(view) => actions.setCalendarView(view)}
            />
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full border shadow-sm" style={{
              backgroundColor: 'color-mix(in srgb, var(--color-info) 10%, var(--color-surface-primary))',
              borderColor: 'var(--color-info)',
              color: 'var(--color-info)'
            }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'linear-gradient(135deg, var(--color-info) 0%, var(--color-brand) 100%)' }} />
              <span>Light Workout</span>
            </div>
            <div className="flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full border shadow-sm" style={{
              backgroundColor: 'color-mix(in srgb, var(--color-warning) 10%, var(--color-surface-primary))',
              borderColor: 'var(--color-warning)',
              color: 'var(--color-warning)'
            }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'linear-gradient(135deg, var(--color-warning) 0%, #ea580c 100%)' }} />
              <span>Moderate Workout</span>
            </div>
            <div className="flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full border shadow-sm" style={{
              backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, var(--color-surface-primary))',
              borderColor: 'var(--color-danger)',
              color: 'var(--color-danger)'
            }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'linear-gradient(135deg, var(--color-danger) 0%, #dc2626 100%)' }} />
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
      />
    </div>
  )
}