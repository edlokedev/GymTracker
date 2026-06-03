import { createServerFileRoute } from '@tanstack/react-start/server'
import { type PrivateHandlerContext, privateMethod } from '../lib/api/define-private-route'
import { badRequest } from '../lib/api/errors'
import { exerciseDiscoveryQueries } from '../lib/supabase/queries/exercise-discovery'

export const getExerciseFavorites = async ({ supabase, user }: PrivateHandlerContext) => {
  return await exerciseDiscoveryQueries.listFavorites(supabase, user.id)
}

export const addExerciseFavorite = async ({ request, supabase, user }: PrivateHandlerContext) => {
  const body = (await request.json().catch(() => null)) as { exerciseId?: unknown } | null
  if (!body || typeof body.exerciseId !== 'string' || !body.exerciseId.trim()) {
    badRequest('exerciseId is required')
  }

  return await exerciseDiscoveryQueries.addFavorite(supabase, user.id, body.exerciseId)
}

export const createExerciseFavorite = addExerciseFavorite

export const deleteExerciseFavorite = async ({ supabase, user, url }: PrivateHandlerContext) => {
  const exerciseId = url.searchParams.get('exerciseId')
  if (!exerciseId) badRequest('exerciseId is required')

  return await exerciseDiscoveryQueries.deleteFavorite(supabase, user.id, exerciseId)
}

export const ServerRoute = createServerFileRoute('/api/exercise-favorites').methods({
  GET: privateMethod(getExerciseFavorites),
  POST: privateMethod(addExerciseFavorite),
  DELETE: privateMethod(deleteExerciseFavorite),
})
