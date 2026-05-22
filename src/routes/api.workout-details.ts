import { createServerFileRoute } from '@tanstack/react-start/server'
import { privateMethod } from '../lib/api/define-private-route'
import { badRequest } from '../lib/api/errors'
import { workoutDetailsQueries } from '../lib/supabase/queries/workout-details'

// Aggregate route: returns every workout session the authenticated user has on
// a given date, each with its sets and computed totals. Identity comes from
// the Supabase session — no `userId` is accepted from the request.

export const ServerRoute = createServerFileRoute('/api/workout-details').methods({
  GET: privateMethod(async ({ supabase, url }) => {
    const date = url.searchParams.get('date')
    if (!date) badRequest('date is required')
    return workoutDetailsQueries.getByDate(supabase, date as string)
  }),
})
