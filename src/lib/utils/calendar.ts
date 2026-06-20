import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter.js'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js'
import relativeTime from 'dayjs/plugin/relativeTime.js'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'

// Configure Day.js plugins (required plugins for ilamy Calendar + additional needed plugins)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
dayjs.extend(timezone)
dayjs.extend(utc)
dayjs.extend(relativeTime)

/**
 * The user's LOCAL calendar day as `YYYY-MM-DD`.
 *
 * Use this — never `new Date().toISOString().split('T')[0]` — whenever the value
 * represents a calendar day (a `workout_sessions.date`). The ISO/UTC form drifts
 * by the user's offset and lands "today" on the wrong day for non-UTC users.
 */
export const getLocalCalendarDate = (d: Date = new Date()): string => dayjs(d).format('YYYY-MM-DD')

/**
 * Parse a date-only `YYYY-MM-DD` string as a LOCAL-midnight `Date`.
 *
 * Use this for display — never `new Date("YYYY-MM-DD")`, which JS parses as UTC
 * midnight and then renders shifted by the user's offset.
 */
export const parseCalendarDate = (dateOnly: string): Date => dayjs(dateOnly).toDate()

/**
 * Strict real-calendar-day validation for a `YYYY-MM-DD` string. Rejects bad
 * shapes AND impossible days like `2026-02-31` (which would otherwise normalize
 * or fail downstream). Pure (no dayjs) so it can back both zod schemas and
 * runtime route validation.
 */
export const isValidCalendarDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/**
 * Get a rolling 30-day date range from the current date
 * @param baseDate - The date to calculate the range from (defaults to today)
 * @returns Object with start and end dates
 */
export const getRolling30DayRange = (baseDate: Date = new Date()) => {
  const base = dayjs(baseDate)
  const start = base.subtract(30, 'day').startOf('day')
  const end = base.endOf('day')

  return {
    start: start.toDate(),
    end: end.toDate(),
    startISOString: start.toISOString(),
    endISOString: end.toISOString(),
  }
}

/**
 * Calculate the current workout streak
 * @param workoutDates - Array of workout dates (ISO strings)
 * @returns Current streak count
 */
export const calculateCurrentStreak = (
  workoutDates: string[],
  today: string = getLocalCalendarDate(),
): number => {
  if (workoutDates.length === 0) return 0

  // Dedupe to unique calendar days — two sessions on the same day must not
  // double-count or break consecutive-day counting.
  const sortedDates = [...new Set(workoutDates.map((date) => dayjs(date).format('YYYY-MM-DD')))]
    .map((date) => dayjs(date))
    .sort((a, b) => b.valueOf() - a.valueOf()) // Sort descending (newest first)

  let streak = 0
  const currentDate = dayjs(today).startOf('day')

  // Check if there's a workout today or yesterday to start the streak
  const latestWorkout = sortedDates[0]
  const daysSinceLatest = currentDate.diff(latestWorkout.startOf('day'), 'day')

  if (daysSinceLatest > 1) {
    return 0 // No streak if more than 1 day since last workout
  }

  const streakBaseDate = daysSinceLatest === 0 ? currentDate : latestWorkout.startOf('day')

  // Count consecutive workout days
  for (let i = 0; i < sortedDates.length; i++) {
    const workoutDate = sortedDates[i].startOf('day')
    const expectedDate = streakBaseDate.subtract(i, 'day')

    if (workoutDate.isSame(expectedDate, 'day')) {
      streak++
    } else {
      break
    }
  }

  return streak
}

/**
 * Calculate the longest workout streak
 * @param workoutDates - Array of workout dates (ISO strings)
 * @returns Longest streak count
 */
export const calculateLongestStreak = (workoutDates: string[]): number => {
  if (workoutDates.length === 0) return 0

  // Dedupe to unique calendar days first (multiple sessions per day are one day).
  const sortedDates = [...new Set(workoutDates.map((date) => dayjs(date).format('YYYY-MM-DD')))]
    .map((date) => dayjs(date).startOf('day'))
    .sort((a, b) => a.valueOf() - b.valueOf()) // Sort ascending

  let longestStreak = 1
  let currentStreak = 1

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = sortedDates[i - 1]
    const currentDate = sortedDates[i]
    const daysDiff = currentDate.diff(prevDate, 'day')

    if (daysDiff === 1) {
      currentStreak++
      longestStreak = Math.max(longestStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  return longestStreak
}

/**
 * Calculate average workouts per week
 * @param workoutDates - Array of workout dates (ISO strings)
 * @param weeks - Number of weeks to calculate over (defaults to 4)
 * @returns Average workouts per week
 */
export const calculateAverageWorkoutsPerWeek = (
  workoutDates: string[],
  weeks: number = 4,
  today: string = getLocalCalendarDate(),
): number => {
  if (workoutDates.length === 0) return 0

  const startDate = dayjs(today).subtract(weeks, 'week').startOf('day')
  const workoutsInPeriod = workoutDates.filter((date) => dayjs(date).isAfter(startDate))

  return Math.round((workoutsInPeriod.length / weeks) * 10) / 10 // Round to 1 decimal
}

/**
 * Get workouts for the current month
 * @param workoutDates - Array of workout dates (ISO strings)
 * @returns Count of workouts this month
 */
export const getWorkoutsThisMonth = (
  workoutDates: string[],
  today: string = getLocalCalendarDate(),
): number => {
  const month = dayjs(today)
  // Compare by calendar month (inclusive of the 1st and last day); strict
  // isAfter/isBefore against month bounds dropped a workout dated the 1st.
  return workoutDates.filter((date) => dayjs(date).isSame(month, 'month')).length
}

/**
 * Format date for calendar display
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatCalendarDate = (date: Date | string): string => {
  return dayjs(date).format('YYYY-MM-DD')
}

/**
 * Format date for display
 * @param date - Date to format
 * @returns Human-readable date string
 */
export const formatDisplayDate = (date: Date | string): string => {
  return dayjs(date).format('MMM D, YYYY')
}

/**
 * Get relative time string
 * @param date - Date to get relative time for
 * @returns Relative time string (e.g., "2 days ago")
 */
export const getRelativeTime = (date: Date | string): string => {
  return dayjs(date).fromNow()
}

/**
 * Check if a date is today
 * @param date - Date to check
 * @returns True if date is today
 */
export const isToday = (date: Date | string): boolean => {
  return dayjs(date).isSame(dayjs(), 'day')
}

/**
 * Check if a date is in the current month
 * @param date - Date to check
 * @returns True if date is in current month
 */
export const isCurrentMonth = (date: Date | string): boolean => {
  return dayjs(date).isSame(dayjs(), 'month')
}

export { dayjs }
