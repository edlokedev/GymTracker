import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CalendarState } from '@/lib/types/calendar'
import { getRolling30DayRange } from '@/lib/utils/calendar'
import { fetchCalendarData, fetchWorkoutDetails } from './client'
import { createInitialCalendarState, toWorkoutEvents } from './model'

export const useCalendarData = (userId: string) => {
  const [state, setState] = useState<CalendarState>(() => createInitialCalendarState())

  // Load calendar data for a date range
  const loadCalendarData = useCallback(
    async (dateRange: { start: Date; end: Date }) => {
      if (!userId) return

      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const data = await fetchCalendarData({ userId, dateRange })

        if (data.success) {
          setState((prev) => ({
            ...prev,
            workoutData: data.data,
            summaryStats: data.summary,
            dateRange,
            isLoading: false,
            error: null,
          }))
        } else {
          throw new Error(data.error || 'Failed to load calendar data')
        }
      } catch (error) {
        console.error('Error loading calendar data:', error)
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load calendar data',
        }))
      }
    },
    [userId],
  )

  // Load workout details for a specific date
  const loadWorkoutDetails = useCallback(
    async (date: Date) => {
      if (!userId) return

      setState((prev) => ({ ...prev, isLoading: true }))

      try {
        const data = await fetchWorkoutDetails(userId, date)

        if (data.success && data.data.length > 0) {
          setState((prev) => ({
            ...prev,
            selectedWorkout: data.data[0], // For now, take the first session
            isLoading: false,
          }))
        } else {
          setState((prev) => ({
            ...prev,
            selectedWorkout: null,
            isLoading: false,
          }))
        }
      } catch (error) {
        console.error('Error loading workout details:', error)
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load workout details',
        }))
      }
    },
    [userId],
  )

  // Calendar actions
  const actions = {
    setCurrentDate: useCallback(
      (date: Date) => {
        setState((prev) => ({ ...prev, currentDate: date }))

        // Update date range to rolling 30-day window around the new current date
        const newRange = getRolling30DayRange(date)
        loadCalendarData(newRange)
      },
      [loadCalendarData],
    ),

    selectDate: useCallback((date: Date | null) => {
      setState((prev) => ({ ...prev, selectedDate: date }))
    }, []),

    navigateMonth: useCallback(
      (direction: 'prev' | 'next') => {
        setState((prev) => {
          const newDate = new Date(prev.currentDate)
          newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))

          const newRange = getRolling30DayRange(newDate)
          loadCalendarData(newRange)

          return {
            ...prev,
            currentDate: newDate,
            dateRange: newRange,
          }
        })
      },
      [loadCalendarData],
    ),

    openWorkoutModal: useCallback(
      (date: Date) => {
        setState((prev) => ({
          ...prev,
          isModalOpen: true,
          selectedDate: date,
        }))
        loadWorkoutDetails(date)
      },
      [loadWorkoutDetails],
    ),

    closeWorkoutModal: useCallback(() => {
      setState((prev) => ({
        ...prev,
        isModalOpen: false,
        selectedDate: null,
        selectedWorkout: null,
      }))
    }, []),

    refreshData: useCallback(() => {
      const range = getRolling30DayRange(state.currentDate)
      loadCalendarData(range)
    }, [loadCalendarData, state.currentDate]),

    setCalendarView: useCallback((view: CalendarState['calendarView']) => {
      setState((prev) => ({ ...prev, calendarView: view }))
    }, []),
  }

  // Transform workout data to calendar events for ilamy Calendar
  const workoutEvents = useMemo(() => toWorkoutEvents(state.workoutData), [state.workoutData])

  // Initialize calendar data on mount
  useEffect(() => {
    if (userId) {
      const initialRange = getRolling30DayRange()
      setState((prev) => ({ ...prev, dateRange: initialRange }))
      loadCalendarData(initialRange)
    }
  }, [userId, loadCalendarData])

  return {
    state,
    actions,
    workoutEvents,
    loadCalendarData,
    loadWorkoutDetails,
  }
}
