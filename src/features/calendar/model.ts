import type { CalendarState, WorkoutCalendarData, WorkoutEvent } from '@/lib/types/calendar'
import { formatCalendarDate, getRolling30DayRange, parseCalendarDate } from '@/lib/utils/calendar'

export const emptyCalendarSummary: CalendarState['summaryStats'] = {
  totalWorkouts: 0,
  totalVolume: 0,
  averageWorkoutsPerWeek: 0,
  longestStreak: 0,
  currentStreak: 0,
  lastWorkoutDate: null,
  workoutsThisMonth: 0,
}

export const workoutIntensityColors: Record<
  WorkoutCalendarData['intensity'],
  { bg: string; border: string; text: string }
> = {
  light: { bg: '#e3f2fd', border: '#2196f3', text: '#1565c0' },
  moderate: { bg: '#fff3e0', border: '#ff9800', text: '#e65100' },
  intense: { bg: '#ffebee', border: '#f44336', text: '#c62828' },
}

export function createInitialCalendarState(baseDate = new Date()): CalendarState {
  const dateRange = getRolling30DayRange(baseDate)

  return {
    currentDate: baseDate,
    selectedDate: null,
    dateRange,
    workoutData: [],
    selectedWorkout: null,
    isLoading: false,
    error: null,
    isModalOpen: false,
    calendarView: 'rolling',
    summaryStats: emptyCalendarSummary,
  }
}

export function toWorkoutEvents(workoutData: WorkoutCalendarData[]): WorkoutEvent[] {
  return workoutData
    .filter((day) => day.hasWorkout)
    .map((day) => {
      const date = parseCalendarDate(day.date)
      const color = workoutIntensityColors[day.intensity]

      return {
        id: `workout-${day.date}`,
        title: `${day.workoutCount} workout${day.workoutCount > 1 ? 's' : ''}`,
        start: date,
        end: date,
        allDay: true,
        color: color.bg,
        data: {
          workoutCount: day.workoutCount,
          totalSets: day.totalSets,
          totalVolume: day.totalVolume,
          exerciseCount: day.exerciseCount,
          intensity: day.intensity,
          sessionIds: day.sessionIds,
          duration: day.duration,
        },
      }
    })
}

export function findWorkoutDayForDate(
  workoutData: WorkoutCalendarData[],
  date: Date,
): WorkoutCalendarData | undefined {
  const dateKey = formatCalendarDate(date)
  return workoutData.find((day) => formatCalendarDate(day.date) === dateKey)
}
