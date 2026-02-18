import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter.js';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';

// Configure Day.js plugins (required plugins for ilamy Calendar + additional needed plugins)
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(timezone);
dayjs.extend(utc);
dayjs.extend(relativeTime);

/**
 * Get a rolling 30-day date range from the current date
 * @param baseDate - The date to calculate the range from (defaults to today)
 * @returns Object with start and end dates
 */
export const getRolling30DayRange = (baseDate: Date = new Date()) => {
  const base = dayjs(baseDate);
  const start = base.subtract(30, 'day').startOf('day');
  const end = base.endOf('day');

  return {
    start: start.toDate(),
    end: end.toDate(),
    startISOString: start.toISOString(),
    endISOString: end.toISOString(),
  };
};

/**
 * Calculate the current workout streak
 * @param workoutDates - Array of workout dates (ISO strings)
 * @returns Current streak count
 */
export const calculateCurrentStreak = (workoutDates: string[]): number => {
  if (workoutDates.length === 0) return 0;

  const sortedDates = workoutDates
    .map(date => dayjs(date))
    .sort((a, b) => b.valueOf() - a.valueOf()); // Sort descending (newest first)

  let streak = 0;
  let currentDate = dayjs().startOf('day');

  // Check if there's a workout today or yesterday to start the streak
  const latestWorkout = sortedDates[0];
  const daysSinceLatest = currentDate.diff(latestWorkout.startOf('day'), 'day');

  if (daysSinceLatest > 1) {
    return 0; // No streak if more than 1 day since last workout
  }

  // Count consecutive workout days
  for (let i = 0; i < sortedDates.length; i++) {
    const workoutDate = sortedDates[i].startOf('day');
    const expectedDate = currentDate.subtract(i, 'day');

    if (workoutDate.isSame(expectedDate, 'day')) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

/**
 * Calculate the longest workout streak
 * @param workoutDates - Array of workout dates (ISO strings)
 * @returns Longest streak count
 */
export const calculateLongestStreak = (workoutDates: string[]): number => {
  if (workoutDates.length === 0) return 0;

  const sortedDates = workoutDates
    .map(date => dayjs(date).startOf('day'))
    .sort((a, b) => a.valueOf() - b.valueOf()); // Sort ascending

  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = sortedDates[i - 1];
    const currentDate = sortedDates[i];
    const daysDiff = currentDate.diff(prevDate, 'day');

    if (daysDiff === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return longestStreak;
};

/**
 * Calculate average workouts per week
 * @param workoutDates - Array of workout dates (ISO strings)
 * @param weeks - Number of weeks to calculate over (defaults to 4)
 * @returns Average workouts per week
 */
export const calculateAverageWorkoutsPerWeek = (
  workoutDates: string[],
  weeks: number = 4
): number => {
  if (workoutDates.length === 0) return 0;

  const startDate = dayjs().subtract(weeks, 'week').startOf('day');
  const workoutsInPeriod = workoutDates.filter(date =>
    dayjs(date).isAfter(startDate)
  );

  return Math.round((workoutsInPeriod.length / weeks) * 10) / 10; // Round to 1 decimal
};

/**
 * Get workouts for the current month
 * @param workoutDates - Array of workout dates (ISO strings)
 * @returns Count of workouts this month
 */
export const getWorkoutsThisMonth = (workoutDates: string[]): number => {
  const startOfMonth = dayjs().startOf('month');
  const endOfMonth = dayjs().endOf('month');

  return workoutDates.filter(date => {
    const workoutDate = dayjs(date);
    return workoutDate.isAfter(startOfMonth) && workoutDate.isBefore(endOfMonth);
  }).length;
};

/**
 * Format date for calendar display
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatCalendarDate = (date: Date | string): string => {
  return dayjs(date).format('YYYY-MM-DD');
};

/**
 * Format date for display
 * @param date - Date to format
 * @returns Human-readable date string
 */
export const formatDisplayDate = (date: Date | string): string => {
  return dayjs(date).format('MMM D, YYYY');
};

/**
 * Get relative time string
 * @param date - Date to get relative time for
 * @returns Relative time string (e.g., "2 days ago")
 */
export const getRelativeTime = (date: Date | string): string => {
  return dayjs(date).fromNow();
};

/**
 * Check if a date is today
 * @param date - Date to check
 * @returns True if date is today
 */
export const isToday = (date: Date | string): boolean => {
  return dayjs(date).isSame(dayjs(), 'day');
};

/**
 * Check if a date is in the current month
 * @param date - Date to check
 * @returns True if date is in current month
 */
export const isCurrentMonth = (date: Date | string): boolean => {
  return dayjs(date).isSame(dayjs(), 'month');
};

export { dayjs };