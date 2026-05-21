import { describe, expect, it } from 'vitest'
import { calendarDataSearchParams, workoutDetailsSearchParams } from './client'

describe('calendar client', () => {
  it('converts calendar range into API search params', () => {
    const params = calendarDataSearchParams({
      userId: 'user 1',
      dateRange: {
        start: new Date('2026-05-01T00:00:00.000Z'),
        end: new Date('2026-05-15T23:59:59.999Z'),
      },
    })

    expect(params.get('userId')).toBe('user 1')
    expect(params.get('start')).toBe('2026-05-01T00:00:00.000Z')
    expect(params.get('end')).toBe('2026-05-15T23:59:59.999Z')
  })

  it('converts workout detail date into API search params', () => {
    const params = workoutDetailsSearchParams('user-1', new Date('2026-05-12T10:30:00.000Z'))

    expect(params.get('userId')).toBe('user-1')
    expect(params.get('date')).toBe('2026-05-12')
  })
})
