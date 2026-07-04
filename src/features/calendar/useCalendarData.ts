import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import type { CalendarState, WorkoutSessionWithSets } from '@/lib/types/calendar'
import { getRolling30DayRange } from '@/lib/utils/calendar'
import { calendarDataOptions, workoutDayOptions } from './client'
import { emptyCalendarSummary, toWorkoutEvents } from './model'

/**
 * Calendar server state via TanStack Query (ADR-0007, Phase 1).
 *
 * Local state owns only navigation/UI: the anchor `currentDate` (which derives
 * the rolling window), the selected date, modal open/closed, view mode, and an
 * optional location override applied after an inline edit. All server reads are
 * `useQuery`:
 *   - calendar window  → `calendarDataOptions(currentDate)`
 *   - day drill-down   → `workoutDayOptions(selectedDate)` (enabled with modal)
 *
 * This replaces the old imperative `loadCalendarData`/`loadWorkoutDetails`, the
 * fetch-inside-setState bug in `navigateMonth` (issue #0003 calendar site), and
 * the hand-rolled stale-response race — Query's last-request-wins guarantees the
 * rendered window matches the most recent navigation.
 */
export const useCalendarData = (userId: string) => {
  const enabled = Boolean(userId)

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [calendarView, setCalendarView] = useState<CalendarState['calendarView']>('rolling')
  const [locationOverride, setLocationOverride] = useState<{
    sessionId: string
    locationName: string | null
  } | null>(null)

  const dateRange = useMemo(() => getRolling30DayRange(currentDate), [currentDate])

  const calendarQuery = useQuery({ ...calendarDataOptions(currentDate), enabled })

  const dayQuery = useQuery({
    ...workoutDayOptions(selectedDate ?? new Date(0)),
    enabled: enabled && isModalOpen && selectedDate !== null,
  })

  const workoutData = calendarQuery.data?.workouts ?? []
  const summaryStats = calendarQuery.data?.summary ?? emptyCalendarSummary

  // First session for the selected day (parity with the old behaviour), with an
  // optimistic location override applied after an inline edit.
  const selectedWorkout = useMemo<WorkoutSessionWithSets | null>(() => {
    const first = dayQuery.data?.[0] ?? null
    if (!first) return null
    if (locationOverride && locationOverride.sessionId === first.id) {
      return { ...first, locationName: locationOverride.locationName ?? undefined }
    }
    return first
  }, [dayQuery.data, locationOverride])

  const error = calendarQuery.error
    ? calendarQuery.error instanceof Error
      ? calendarQuery.error.message
      : 'Failed to load calendar data'
    : null

  const isLoading =
    (calendarQuery.isPending && enabled) || (isModalOpen && dayQuery.isPending && enabled)

  const state: CalendarState = {
    currentDate,
    selectedDate,
    dateRange,
    workoutData,
    selectedWorkout,
    isLoading,
    error,
    isModalOpen,
    calendarView,
    summaryStats,
  }

  const actions = {
    setCurrentDate: useCallback((date: Date) => {
      setCurrentDate(date)
    }, []),

    selectDate: useCallback((date: Date | null) => {
      setSelectedDate(date)
    }, []),

    navigateMonth: useCallback((direction: 'prev' | 'next') => {
      // Compute the next anchor and set it — no fetch inside the updater. The
      // derived query key changes, so Query fetches the new window (issue #0003
      // calendar-site fix).
      setCurrentDate((prev) => {
        const next = new Date(prev)
        next.setMonth(next.getMonth() + (direction === 'next' ? 1 : -1))
        return next
      })
    }, []),

    openWorkoutModal: useCallback((date: Date) => {
      setLocationOverride(null)
      setSelectedDate(date)
      setIsModalOpen(true)
    }, []),

    closeWorkoutModal: useCallback(() => {
      setIsModalOpen(false)
      setSelectedDate(null)
      setLocationOverride(null)
    }, []),

    refreshData: useCallback(() => {
      void calendarQuery.refetch()
    }, [calendarQuery]),

    setCalendarView: useCallback((view: CalendarState['calendarView']) => {
      setCalendarView(view)
    }, []),

    updateSelectedWorkoutLocation: useCallback(
      (locationName: string | null) => {
        const sessionId = dayQuery.data?.[0]?.id
        if (!sessionId) return
        setLocationOverride({ sessionId, locationName })
      },
      [dayQuery.data],
    ),
  }

  const workoutEvents = useMemo(() => toWorkoutEvents(workoutData), [workoutData])

  return {
    state,
    actions,
    workoutEvents,
    refetchCalendar: calendarQuery.refetch,
  }
}
