import { createServerFileRoute } from '@tanstack/react-start/server'
import { type PublicHandlerContext, publicMethod } from '../lib/api/define-public-route'
import { parseIntParam } from '../lib/api/params'
import { exerciseCatalogQueries } from '../lib/supabase/queries/exercise-catalog'

// Public catalog route. The handler returns `{ items, total, page, totalPages,
// hasMore }` which the envelope wraps as `data`. We renamed the inner array
// from `data` to `items` so consumers don't end up reading `result.data.data`.

export const searchExercises = async ({ supabase, url }: PublicHandlerContext) => {
  const query = url.searchParams.get('query') || undefined
  const category_id = url.searchParams.get('category_id') || undefined
  const equipment = url.searchParams.get('equipment') || undefined
  const muscle_group = url.searchParams.get('muscle_group') || undefined
  const level = url.searchParams.get('level') || undefined
  const limit = parseIntParam(url.searchParams.get('limit'), {
    name: 'limit',
    defaultValue: 20,
    min: 1,
    max: 100,
  })
  const offset = parseIntParam(url.searchParams.get('offset'), {
    name: 'offset',
    defaultValue: 0,
    min: 0,
    max: 100000,
  })

  const result = await exerciseCatalogQueries.search(supabase, {
    query,
    category_id,
    equipment,
    muscle_group,
    level,
    limit,
    offset,
  })

  const items = result.data
  const total = result.total
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 1
  const page = limit > 0 ? Math.floor(offset / limit) + 1 : 1

  return {
    items,
    total,
    page,
    totalPages,
    hasMore: offset + items.length < total,
  }
}

export const ServerRoute = createServerFileRoute('/api/exercises/search').methods({
  GET: publicMethod(searchExercises),
})
