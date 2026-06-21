import { createServerFileRoute } from '@tanstack/react-start/server'
import { type PrivateHandlerContext, privateMethod } from '../lib/api/define-private-route'
import { badRequest } from '../lib/api/errors'
import { getCalendarAggregate, resolveCalendarRange } from '../lib/supabase/queries/calendar'
import { isValidCalendarDate } from '../lib/utils/calendar'

// Aggregate route: returns the authenticated user's workout-calendar rollup
// for a date range, plus summary stats and the resolved date window. Identity
// comes from the Supabase session — `userId` is never accepted from the
// request. The handler's plain object becomes the envelope's `data` field, so
// clients read `result.data.workouts / .summary / .dateRange`.

export const getCalendarData = async ({ user, supabase, url }: PrivateHandlerContext) => {
  const startDateParam = url.searchParams.get('start')
  const endDateParam = url.searchParams.get('end')
  const todayParam = url.searchParams.get('today')

  // A partial window is almost always a client bug — don't silently fall back to
  // the default range and return data for dates the caller didn't ask for.
  if (Boolean(startDateParam) !== Boolean(endDateParam)) {
    badRequest('start and end must be provided together')
  }
  for (const [name, value] of [
    ['start', startDateParam],
    ['end', endDateParam],
    ['today', todayParam],
  ] as const) {
    if (value && !isValidCalendarDate(value)) badRequest(`${name} must be a valid YYYY-MM-DD date`)
  }

  const dateRange = resolveCalendarRange(startDateParam, endDateParam, todayParam)
  const aggregate = await getCalendarAggregate(supabase, user.id, dateRange)

  return {
    workouts: aggregate.data,
    summary: aggregate.summary,
    dateRange: aggregate.dateRange,
  }
}

export const ServerRoute = createServerFileRoute('/api/calendar-data').methods({
  GET: privateMethod(getCalendarData),
})
