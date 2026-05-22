import { createServerFileRoute } from '@tanstack/react-start/server'
import { publicMethod } from '../lib/api/define-public-route'
import { exerciseCatalogQueries } from '../lib/supabase/queries/exercise-catalog'

export const ServerRoute = createServerFileRoute('/api/exercise-categories').methods({
  GET: publicMethod(async ({ supabase }) => {
    return exerciseCatalogQueries.listCategories(supabase)
  }),
})
