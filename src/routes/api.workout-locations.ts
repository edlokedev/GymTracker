import { createServerFileRoute } from '@tanstack/react-start/server'
import type { PrivateHandlerContext } from '../lib/api/define-private-route'
import { privateMethod } from '../lib/api/define-private-route'
import { workoutSessionQueries } from '../lib/supabase/queries/workout-sessions'

// GET /api/workout-locations
// Returns the authenticated user's distinct Workout Location names, sorted
// alphabetically. Used to populate session form autocomplete.
// Private data — response carries Cache-Control: private, no-store.

const getWorkoutLocations = async ({ supabase }: PrivateHandlerContext) => {
  return workoutSessionQueries.listDistinctLocationNames(supabase)
}

export const ServerRoute = createServerFileRoute('/api/workout-locations').methods({
  GET: privateMethod(getWorkoutLocations, {
    extraHeaders: { 'Cache-Control': 'private, no-store' },
  }),
})
