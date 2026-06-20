import { describe, expect, it } from 'vitest'
import { calendarDataSearchParams, workoutDetailsSearchParams } from './client'

describe('calendar client', () => {
  it('converts calendar range into local date-only API search params', () => {
    // Local-constructed dates so the assertion is timezone-independent.
    const params = calendarDataSearchParams({
      dateRange: {
        start: new Date(2026, 4, 1),
        end: new Date(2026, 4, 15),
      },
    })

    expect(params.has('userId')).toBe(false)
    // Date-only local calendar days, NOT UTC ISO instants (that's the TZ bug fix).
    expect(params.get('start')).toBe('2026-05-01')
    expect(params.get('end')).toBe('2026-05-15')
    // A separate `today` is sent for summary math, decoupled from the window.
    expect(params.get('today')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('converts workout detail date into API search params', () => {
    const params = workoutDetailsSearchParams(new Date('2026-05-12T10:30:00.000Z'))

    expect(params.has('userId')).toBe(false)
    expect(params.get('date')).toBe('2026-05-12')
  })
})
