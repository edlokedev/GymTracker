import { createServerFileRoute } from '@tanstack/react-start/server'
import { privateMethod } from '../lib/api/define-private-route'
import { getCalendarAggregate, resolveCalendarRange } from '../lib/supabase/queries/calendar'

// Aggregate route: returns the authenticated user's workout-calendar rollup
// for a date range, plus summary stats and the resolved date window. Identity
// comes from the Supabase session — `userId` is never accepted from the
// request. The handler's plain object becomes the envelope's `data` field, so
// clients read `result.data.workouts / .summary / .dateRange`.

export const ServerRoute = createServerFileRoute('/api/calendar-data').methods({
  GET: privateMethod(async ({ user, supabase, url }) => {
    const startDateParam = url.searchParams.get('start')
    const endDateParam = url.searchParams.get('end')

    const dateRange = resolveCalendarRange(startDateParam, endDateParam)
    const aggregate = await getCalendarAggregate(supabase, user.id, dateRange)

    return {
      workouts: aggregate.data,
      summary: aggregate.summary,
      dateRange: aggregate.dateRange,
    }
  }),
})
