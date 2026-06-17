import { createServerFileRoute } from '@tanstack/react-start/server'
import {
  CATALOG_CACHE_CONTROL,
  type PublicHandlerContext,
  publicMethod,
} from '../lib/api/define-public-route'
import { exerciseCatalogQueries } from '../lib/supabase/queries/exercise-catalog'

export const getMuscleGroups = async ({ supabase }: PublicHandlerContext) =>
  exerciseCatalogQueries.listMuscleGroups(supabase)

export const ServerRoute = createServerFileRoute('/api/muscle-groups').methods({
  GET: publicMethod(getMuscleGroups, { cacheControl: CATALOG_CACHE_CONTROL }),
})
