import { useState, useEffect, useCallback } from 'react'
import { getRolling30DayRange, formatCalendarDate } from '../../lib/utils/calendar'
import type { CalendarState, CalendarDataResponse, WorkoutDetailResponse, WorkoutEvent } from '../../lib/types/calendar'

export const useCalendarData = (userId: string) => {
  const [state, setState] = useState<CalendarState>({
    currentDate: new Date(),
    selectedDate: null,
    dateRange: {
      start: new Date(),
      end: new Date()
    },
    workoutData: [],
    selectedWorkout: null,
    isLoading: false,
    error: null,
    isModalOpen: false,
    calendarView: 'rolling',
    summaryStats: {
      totalWorkouts: 0,
      totalVolume: 0,
      averageWorkoutsPerWeek: 0,
      longestStreak: 0,
      currentStreak: 0,
      lastWorkoutDate: null,
      workoutsThisMonth: 0
    }
  })

  // Load calendar data for a date range
  const loadCalendarData = useCallback(async (dateRange: { start: Date; end: Date }) => {
    if (!userId) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const startDate = dateRange.start.toISOString()
      const endDate = dateRange.end.toISOString()

      const response = await fetch(
        `/api/calendar-data?userId=${encodeURIComponent(userId)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch calendar data: ${response.statusText}`)
      }

      const data: CalendarDataResponse = await response.json()

      if (data.success) {
        setState(prev => ({
          ...prev,
          workoutData: data.data,
          summaryStats: data.summary,
          dateRange,
          isLoading: false,
          error: null
        }))
      } else {
        throw new Error(data.error || 'Failed to load calendar data')
      }
    } catch (error) {
      console.error('Error loading calendar data:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load calendar data'
      }))
    }
  }, [userId])

  // Load workout details for a specific date
  const loadWorkoutDetails = useCallback(async (date: Date) => {
    if (!userId) return

    setState(prev => ({ ...prev, isLoading: true }))

    try {
      const dateStr = formatCalendarDate(date)
      const response = await fetch(
        `/api/workout-details?userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(dateStr)}`
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch workout details: ${response.statusText}`)
      }

      const data: WorkoutDetailResponse = await response.json()

      if (data.success && data.data.length > 0) {
        setState(prev => ({
          ...prev,
          selectedWorkout: data.data[0], // For now, take the first session
          isLoading: false
        }))
      } else {
        setState(prev => ({
          ...prev,
          selectedWorkout: null,
          isLoading: false
        }))
      }
    } catch (error) {
      console.error('Error loading workout details:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load workout details'
      }))
    }
  }, [userId])

  // Calendar actions
  const actions = {
    setCurrentDate: useCallback((date: Date) => {
      setState(prev => ({ ...prev, currentDate: date }))

      // Update date range to rolling 30-day window around the new current date
      const newRange = getRolling30DayRange(date)
      loadCalendarData(newRange)
    }, [loadCalendarData]),

    selectDate: useCallback((date: Date | null) => {
      setState(prev => ({ ...prev, selectedDate: date }))
    }, []),

    navigateMonth: useCallback((direction: 'prev' | 'next') => {
      setState(prev => {
        const newDate = new Date(prev.currentDate)
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))

        const newRange = getRolling30DayRange(newDate)
        loadCalendarData(newRange)

        return {
          ...prev,
          currentDate: newDate,
          dateRange: newRange
        }
      })
    }, [loadCalendarData]),

    openWorkoutModal: useCallback((date: Date) => {
      setState(prev => ({ ...prev, isModalOpen: true, selectedDate: date }))
      loadWorkoutDetails(date)
    }, [loadWorkoutDetails]),

    closeWorkoutModal: useCallback(() => {
      setState(prev => ({
        ...prev,
        isModalOpen: false,
        selectedDate: null,
        selectedWorkout: null
      }))
    }, []),

    refreshData: useCallback(() => {
      const range = getRolling30DayRange(state.currentDate)
      loadCalendarData(range)
    }, [loadCalendarData, state.currentDate]),

    setCalendarView: useCallback((view: any) => {
      setState(prev => ({ ...prev, calendarView: view }))
    }, [])
  }

  // Transform workout data to calendar events for ilamy Calendar
  const workoutEvents: WorkoutEvent[] = state.workoutData
    .filter(day => day.hasWorkout)
    .map(day => {
      const date = new Date(day.date)

      // Color coding based on intensity
      const colors = {
        light: { bg: '#e3f2fd', border: '#2196f3', text: '#1565c0' },
        moderate: { bg: '#fff3e0', border: '#ff9800', text: '#e65100' },
        intense: { bg: '#ffebee', border: '#f44336', text: '#c62828' }
      }

      const color = colors[day.intensity]

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
          duration: day.duration
        }
      }
    })

  // Initialize calendar data on mount
  useEffect(() => {
    if (userId) {
      const initialRange = getRolling30DayRange()
      setState(prev => ({ ...prev, dateRange: initialRange }))
      loadCalendarData(initialRange)
    }
  }, [userId, loadCalendarData])

  return {
    state,
    actions,
    workoutEvents,
    loadCalendarData,
    loadWorkoutDetails
  }
}