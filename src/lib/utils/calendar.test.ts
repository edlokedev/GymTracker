import dayjs from 'dayjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  formatDisplayDate,
  getLocalCalendarDate,
  getWorkoutsThisMonth,
  isCurrentMonth,
  isToday,
  isValidCalendarDate,
  parseCalendarDate,
} from './calendar'

describe('calendar utils', () => {
  beforeEach(() => {
    // Mock system time to a fixed date to prevent "today" from drifting in tests
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-11T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('calculateCurrentStreak', () => {
    it('returns 0 when there are no workouts', () => {
      expect(calculateCurrentStreak([])).toBe(0)
    })

    it('returns a streak of 1 if the only workout is today', () => {
      const dates = [dayjs().toISOString()]
      expect(calculateCurrentStreak(dates)).toBe(1)
    })

    it('returns a streak of 1 if the only workout was yesterday', () => {
      const dates = [dayjs().subtract(1, 'day').toISOString()]
      expect(calculateCurrentStreak(dates)).toBe(1)
    })

    it('calculates a rolling 3 day streak successfully', () => {
      const dates = [
        dayjs().toISOString(), // Today
        dayjs().subtract(1, 'day').toISOString(), // Yesterday
        dayjs().subtract(2, 'day').toISOString(), // 2 days ago
      ]
      expect(calculateCurrentStreak(dates)).toBe(3)
    })

    it('breaks the streak if there is a gap of more than 1 day', () => {
      const dates = [
        dayjs().toISOString(), // Today
        // Missed yesterday
        dayjs().subtract(2, 'day').toISOString(), // 2 days ago
        dayjs().subtract(3, 'day').toISOString(),
      ]
      // Because yesterday was missed, the streak should only be 1 (today)
      expect(calculateCurrentStreak(dates)).toBe(1)
    })

    it('returns 0 if the last workout was more than 1 day ago (missed yesterday)', () => {
      const dates = [
        dayjs().subtract(2, 'day').toISOString(), // 2 days ago
        dayjs().subtract(3, 'day').toISOString(),
      ]
      expect(calculateCurrentStreak(dates)).toBe(0)
    })

    it('dedupes multiple sessions on the same day (does not break the streak)', () => {
      const dates = [
        dayjs().toISOString(),
        dayjs().toISOString(), // second session today
        dayjs().subtract(1, 'day').toISOString(),
      ]
      expect(calculateCurrentStreak(dates)).toBe(2)
    })

    it('uses the supplied client-local today, not the system clock', () => {
      expect(calculateCurrentStreak(['2026-03-10', '2026-03-09'], '2026-03-10')).toBe(2)
      // Anchored to a different "today" → no current streak.
      expect(calculateCurrentStreak(['2026-03-10', '2026-03-09'], '2026-03-20')).toBe(0)
    })
  })

  describe('calculateLongestStreak', () => {
    it('returns 0 for empty array', () => {
      expect(calculateLongestStreak([])).toBe(0)
    })

    it('returns the longest continuous block of days', () => {
      const dates = [
        dayjs().subtract(10, 'day').toISOString(),
        dayjs().subtract(9, 'day').toISOString(),
        dayjs().subtract(8, 'day').toISOString(), // Run of 3 here

        dayjs().subtract(5, 'day').toISOString(),
        dayjs().subtract(4, 'day').toISOString(), // Run of 2 here
      ]
      expect(calculateLongestStreak(dates)).toBe(3)
    })

    it('handles single workout correctly', () => {
      const dates = [dayjs().subtract(5, 'day').toISOString()]
      expect(calculateLongestStreak(dates)).toBe(1)
    })

    it('dedupes same-day sessions before counting the run', () => {
      expect(calculateLongestStreak(['2026-03-10', '2026-03-10', '2026-03-11'])).toBe(2)
    })
  })

  describe('getWorkoutsThisMonth', () => {
    it('returns counts only for the current month', () => {
      const dates = [
        dayjs().startOf('month').add(1, 'day').toISOString(),
        dayjs().startOf('month').add(5, 'day').toISOString(),
        dayjs().subtract(1, 'month').toISOString(), // previous month
      ]
      expect(getWorkoutsThisMonth(dates)).toBe(2)
    })

    it('includes a workout dated the 1st of the month (inclusive bounds)', () => {
      expect(getWorkoutsThisMonth(['2026-04-01', '2026-04-30'], '2026-04-11')).toBe(2)
    })
  })

  describe('local calendar date helpers', () => {
    it('getLocalCalendarDate formats a Date as a local YYYY-MM-DD day', () => {
      expect(getLocalCalendarDate(new Date(2026, 1, 3))).toBe('2026-02-03')
    })

    it('parseCalendarDate round-trips with getLocalCalendarDate', () => {
      expect(getLocalCalendarDate(parseCalendarDate('2026-02-03'))).toBe('2026-02-03')
    })

    it('isValidCalendarDate accepts real days and rejects impossible/malformed ones', () => {
      expect(isValidCalendarDate('2026-02-28')).toBe(true)
      expect(isValidCalendarDate('2026-02-31')).toBe(false) // Feb 31 doesn't exist
      expect(isValidCalendarDate('2026-13-01')).toBe(false)
      expect(isValidCalendarDate('2026-1-1')).toBe(false) // not zero-padded
      expect(isValidCalendarDate('not-a-date')).toBe(false)
    })
  })

  describe('formatDisplayDate', () => {
    it('formats a date correctly as MMM D, YYYY', () => {
      const dateStr = '2026-04-10T12:00:00.000Z'
      expect(formatDisplayDate(dateStr)).toBe('Apr 10, 2026')
    })
  })

  describe('isToday', () => {
    it('returns true for todays date', () => {
      expect(isToday(new Date())).toBe(true)
    })

    it('returns false for yesterday', () => {
      expect(isToday(dayjs().subtract(1, 'day').toDate())).toBe(false)
    })
  })

  describe('isCurrentMonth', () => {
    it('returns true for dates in the current month', () => {
      expect(isCurrentMonth(new Date())).toBe(true)
    })

    it('returns false for previous month', () => {
      expect(isCurrentMonth(dayjs().subtract(1, 'month').toDate())).toBe(false)
    })
  })
})
