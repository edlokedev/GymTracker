import { createServerFileRoute } from '@tanstack/react-start/server'
import { type PrivateHandlerContext, privateMethod } from '../lib/api/define-private-route'
import { badRequest } from '../lib/api/errors'
import { exerciseDiscoveryQueries } from '../lib/supabase/queries/exercise-discovery'

export const getSuggestedExercises = async ({ supabase, user, url }: PrivateHandlerContext) => {
  const exerciseId = url.searchParams.get('exerciseId') || undefined
  const muscle = url.searchParams.get('muscle') || undefined
  if (!exerciseId && !muscle) badRequest('exerciseId or muscle is required')

  const limit = Number.parseInt(url.searchParams.get('limit') || '10', 10)
  return {
    items: await exerciseDiscoveryQueries.listSuggested(supabase, user.id, {
      exerciseId,
      muscle,
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 10,
    }),
  }
}

export const ServerRoute = createServerFileRoute('/api/exercises/suggested').methods({
  GET: privateMethod(getSuggestedExercises),
})
