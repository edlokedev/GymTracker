import { z } from 'zod'
import { isValidCalendarDate } from '@/lib/utils/calendar'

// One strict `YYYY-MM-DD` calendar-date schema for every `workout_sessions.date`
// input/query path. Validates a REAL calendar day (rejects `2026-02-31`), not
// just the shape. Backs the contract tests; the same `isValidCalendarDate` is
// reused for runtime route validation (contracts are not runtime-enforced).
export const calendarDate = z
  .string()
  .refine(isValidCalendarDate, { message: 'Expected a valid calendar date (YYYY-MM-DD)' })
