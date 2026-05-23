import { createServerFileRoute } from '@tanstack/react-start/server'
import { type PublicHandlerContext, publicMethod } from '../lib/api/define-public-route'
import { exerciseCatalogQueries } from '../lib/supabase/queries/exercise-catalog'

export const getExerciseCategories = async ({ supabase }: PublicHandlerContext) =>
  exerciseCatalogQueries.listCategories(supabase)

export const ServerRoute = createServerFileRoute('/api/exercise-categories').methods({
  GET: publicMethod(getExerciseCategories),
})
