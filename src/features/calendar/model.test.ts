import { describe, expect, it } from 'vitest'
import type { WorkoutCalendarData } from '@/lib/types/calendar'
import { formatCalendarDate } from '@/lib/utils/calendar'
import { createInitialCalendarState, findWorkoutDayForDate, toWorkoutEvents } from './model'

const makeWorkoutDay = (overrides: Partial<WorkoutCalendarData> = {}): WorkoutCalendarData => ({
  date: '2026-05-10',
  hasWorkout: true,
  workoutCount: 1,
  totalSets: 9,
  totalVolume: 3200,
  exerciseCount: 3,
  sessionIds: ['session-1'],
  intensity: 'moderate',
  duration: 45,
  ...overrides,
})

describe('calendar model', () => {
  it('creates a rolling initial state around the base date', () => {
    const state = createInitialCalendarState(new Date('2026-05-15T12:00:00.000Z'))

    expect(state.currentDate.toISOString()).toBe('2026-05-15T12:00:00.000Z')
    expect(state.calendarView).toBe('rolling')
    expect(formatCalendarDate(state.dateRange.start)).toBe('2026-04-15')
    expect(formatCalendarDate(state.dateRange.end)).toBe('2026-05-15')
    expect(state.summaryStats.totalWorkouts).toBe(0)
  })

  it('maps workout days into calendar events and skips empty days', () => {
    const events = toWorkoutEvents([
      makeWorkoutDay({
        date: '2026-05-10',
        intensity: 'moderate',
        workoutCount: 2,
      }),
      makeWorkoutDay({
        date: '2026-05-11',
        hasWorkout: false,
        workoutCount: 0,
      }),
    ])

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      id: 'workout-2026-05-10',
      title: '2 workouts',
      allDay: true,
      color: '#fff3e0',
      data: {
        totalSets: 9,
        totalVolume: 3200,
        intensity: 'moderate',
        sessionIds: ['session-1'],
      },
    })
  })

  it('finds a workout day by calendar date', () => {
    const day = makeWorkoutDay({ date: '2026-05-10' })

    expect(findWorkoutDayForDate([day], new Date('2026-05-10T08:00:00.000Z'))).toBe(day)
    expect(findWorkoutDayForDate([day], new Date('2026-05-11T00:00:00.000Z'))).toBeUndefined()
  })
})
