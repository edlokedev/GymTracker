import { createServerFileRoute } from '@tanstack/react-start/server'
import { type PrivateHandlerContext, privateMethod } from '../lib/api/define-private-route'
import { exerciseDiscoveryQueries } from '../lib/supabase/queries/exercise-discovery'

export const getRecentExercises = async ({ supabase, user, url }: PrivateHandlerContext) => {
  const limit = Number.parseInt(url.searchParams.get('limit') || '10', 10)
  return {
    items: await exerciseDiscoveryQueries.listRecent(
      supabase,
      user.id,
      Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 10,
    ),
  }
}

export const ServerRoute = createServerFileRoute('/api/exercises/recent').methods({
  GET: privateMethod(getRecentExercises),
})
