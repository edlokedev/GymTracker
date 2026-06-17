import { createServerFileRoute } from '@tanstack/react-start/server'
import {
  CATALOG_CACHE_CONTROL,
  type PublicHandlerContext,
  publicMethod,
} from '../lib/api/define-public-route'
import { exerciseCatalogQueries } from '../lib/supabase/queries/exercise-catalog'

// Bare handler — exported so contract tests can invoke it with a stub
// Supabase client and bypass the TanStack route wrapper.
export const getEquipmentTypes = async ({ supabase }: PublicHandlerContext) =>
  exerciseCatalogQueries.listEquipmentTypes(supabase)

export const ServerRoute = createServerFileRoute('/api/equipment-types').methods({
  GET: publicMethod(getEquipmentTypes, { cacheControl: CATALOG_CACHE_CONTROL }),
})
