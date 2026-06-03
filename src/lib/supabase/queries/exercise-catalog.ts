// Supabase-backed query module for the public exercise catalog.
//
// Mirrors the SQLite implementations in src/lib/database/queries/exercises.ts
// (categoryQueries.getWithCounts, exerciseQueries.search, getMuscleGroups,
// getEquipmentTypes) and returns response shapes byte-compatible with the
// existing TanStack server routes.
//
// All reads use the request-scoped anon client returned by
// getSupabaseServerClient(request). RLS on the catalog tables permits world
// reads, so no auth is required.
//
// Notes on aggregation:
//   * getMuscleGroups aggregates jsonb arrays in JS (fetch primary/secondary
//     muscles for every exercise and deduplicate). Simpler than a Postgres RPC
//     and the catalog is small (~800 rows). We can revisit with a SQL view or
//     RPC once parity is proven.
//   * getEquipmentTypes uses a Postgres-side select-distinct via Supabase's
//     query builder.
//   * getCategoriesWithCounts issues N+1 head:'exact' count queries — one per
//     category. There are only ~7 categories so this is bounded and acceptable
//     for the first pass.

import type { createServerClient } from '@supabase/ssr'
import { assertPostgresOk } from '../../api/errors'
import type { Database } from '../database.types'

// Bind the param type to the exact client shape `getSupabaseServerClient`
// returns. Constructing it from `SupabaseClient<Database>` directly is fragile
// because @supabase/supabase-js v2's generic argument order is non-obvious and
// shifts between minor versions.
type SB = ReturnType<typeof createServerClient<Database>>

// Match shape of legacy ExerciseWithParsedFields used by UI consumers.
export interface CatalogExercise {
  id: string
  name: string
  category_id: string
  tracking_type: 'strength' | 'cardio' | 'timed'
  force: string | null
  level: string | null
  mechanic: string | null
  equipment: string | null
  primary_muscles: string[]
  secondary_muscles: string[]
  instructions: string[]
  gif_path: string | null
  preview_image_path: string | null
  created_at: string
  updated_at: string
  category_name: string
}

export interface CatalogCategoryWithCount {
  id: string
  name: string
  description: string | null
  exercise_count: number
}

export interface ExerciseSearchInput {
  query?: string
  category_id?: string
  equipment?: string
  level?: string
  muscle_group?: string
  primary_muscle?: string
  force?: string
  limit?: number
  offset?: number
}

export interface ExerciseSearchResult {
  data: CatalogExercise[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// Shape returned by Supabase for a row joined to exercise_categories.
type RawExerciseRow = {
  id: string
  name: string
  category_id: string
  tracking_type: 'strength' | 'cardio' | 'timed'
  force: string | null
  level: string | null
  mechanic: string | null
  equipment: string | null
  primary_muscles: unknown
  secondary_muscles: unknown
  instructions: unknown
  gif_path: string | null
  preview_image_path: string | null
  created_at: string
  updated_at: string
  exercise_categories: { name: string } | { name: string }[] | null
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  return []
}

export function mapExerciseRow(row: RawExerciseRow): CatalogExercise {
  const cat = Array.isArray(row.exercise_categories)
    ? (row.exercise_categories[0] ?? null)
    : row.exercise_categories
  return {
    id: row.id,
    name: row.name,
    category_id: row.category_id,
    tracking_type: row.tracking_type ?? 'strength',
    force: row.force,
    level: row.level,
    mechanic: row.mechanic,
    equipment: row.equipment,
    primary_muscles: asStringArray(row.primary_muscles),
    secondary_muscles: asStringArray(row.secondary_muscles),
    instructions: asStringArray(row.instructions),
    gif_path: row.gif_path,
    preview_image_path: row.preview_image_path,
    created_at: row.created_at,
    updated_at: row.updated_at,
    category_name: cat?.name ?? '',
  }
}

export const EXERCISE_SELECT =
  'id, name, category_id, tracking_type, force, level, mechanic, equipment, primary_muscles, secondary_muscles, instructions, gif_path, preview_image_path, created_at, updated_at, exercise_categories!inner(name)'

export const exerciseCatalogQueries = {
  async listCategories(supabase: SB): Promise<CatalogCategoryWithCount[]> {
    const { data: categories, error } = await supabase
      .from('exercise_categories')
      .select('id, name, description')
      .order('name', { ascending: true })

    assertPostgresOk(error)
    if (!categories) return []

    // One count query per category. There are only a handful of categories so
    // this is bounded; promoting to an RPC or view is a follow-up.
    const withCounts = await Promise.all(
      categories.map(async (cat: { id: string; name: string; description: string | null }) => {
        const { count, error: countErr } = await supabase
          .from('exercises')
          .select('id', { count: 'exact', head: true })
          .eq('category_id', cat.id)
        if (countErr) throw countErr
        return {
          id: cat.id,
          name: cat.name,
          description: cat.description,
          exercise_count: count ?? 0,
        }
      }),
    )

    return withCounts
  },

  async listEquipmentTypes(supabase: SB): Promise<string[]> {
    // Pull all non-null equipment values; dedupe + sort in JS. Postgres has no
    // first-class DISTINCT through PostgREST, so we paginate to bypass the
    // default 1000-row API cap on hosted Supabase projects.
    const unique = new Set<string>()
    const PAGE = 1000
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('exercises')
        .select('equipment')
        .not('equipment', 'is', null)
        .neq('equipment', '')
        .range(from, from + PAGE - 1)
      assertPostgresOk(error)
      const rows = (data ?? []) as { equipment: string | null }[]
      for (const row of rows) if (row.equipment) unique.add(row.equipment)
      if (rows.length < PAGE) break
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b))
  },

  async listMuscleGroups(supabase: SB): Promise<string[]> {
    // Aggregate jsonb arrays in JS — simpler than an RPC for the first pass.
    // Paginated for the same reason as listEquipmentTypes (1000-row cap).
    const unique = new Set<string>()
    const PAGE = 1000
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('exercises')
        .select('primary_muscles, secondary_muscles')
        .range(from, from + PAGE - 1)
      assertPostgresOk(error)
      const rows = (data ?? []) as {
        primary_muscles: unknown
        secondary_muscles: unknown
      }[]
      for (const row of rows) {
        for (const m of asStringArray(row.primary_muscles)) unique.add(m)
        for (const m of asStringArray(row.secondary_muscles)) unique.add(m)
      }
      if (rows.length < PAGE) break
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b))
  },

  async getById(supabase: SB, id: string): Promise<CatalogExercise | null> {
    const { data, error } = await supabase
      .from('exercises')
      .select(EXERCISE_SELECT)
      .eq('id', id)
      .maybeSingle()

    assertPostgresOk(error)
    if (!data) return null
    return mapExerciseRow(data as unknown as RawExerciseRow)
  },

  async search(supabase: SB, params: ExerciseSearchInput): Promise<ExerciseSearchResult> {
    const limit = params.limit ?? 50
    const offset = params.offset ?? 0

    // Build the base filter set that Postgres can evaluate directly.
    const buildBase = () => {
      let q = supabase.from('exercises').select(EXERCISE_SELECT, { count: 'exact' })

      if (params.category_id) q = q.eq('category_id', params.category_id)
      if (params.equipment) q = q.eq('equipment', params.equipment)
      if (params.level) q = q.eq('level', params.level)
      if (params.force) q = q.eq('force', params.force)

      // Exact-match muscle_group: row's primary OR secondary jsonb array
      // contains the muscle string.
      if (params.muscle_group) {
        const needle = JSON.stringify([params.muscle_group])
        q = q.or(`primary_muscles.cs.${needle},secondary_muscles.cs.${needle}`)
      }

      return q.order('name', { ascending: true })
    }

    // Fast path: when there's no fuzzy text query and no primary_muscle
    // substring filter, Postgres can paginate directly with an exact count.
    // SQLite's `query` predicate ORs across name + primary_muscles text +
    // secondary_muscles text; we replicate that in JS below to stay portable
    // across PostgREST versions (avoids fragile jsonb::text casts in `or()`).
    const needsJsAggregation = Boolean(params.query || params.primary_muscle)

    if (!needsJsAggregation) {
      const q = buildBase().range(offset, offset + limit - 1)
      const { data, error, count } = await q
      assertPostgresOk(error)
      const rows = (data ?? []) as unknown as RawExerciseRow[]
      const total = count ?? 0
      return {
        data: rows.map(mapExerciseRow),
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        hasMore: offset + limit < total,
      }
    }

    // Slow path: pull the filtered set (without text search) and apply
    // text/muscle substring matching in JS to replicate SQLite semantics.
    // Paginated to bypass the 1000-row API cap when a single facet matches
    // more than 1000 rows (e.g. equipment=body weight returns 325 rows today
    // but could grow).
    const buildSlowQuery = () => {
      let q = supabase.from('exercises').select(EXERCISE_SELECT)
      if (params.category_id) q = q.eq('category_id', params.category_id)
      if (params.equipment) q = q.eq('equipment', params.equipment)
      if (params.level) q = q.eq('level', params.level)
      if (params.force) q = q.eq('force', params.force)
      if (params.muscle_group) {
        const needle = JSON.stringify([params.muscle_group])
        q = q.or(`primary_muscles.cs.${needle},secondary_muscles.cs.${needle}`)
      }
      return q.order('name', { ascending: true })
    }

    const all: CatalogExercise[] = []
    const PAGE = 1000
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await buildSlowQuery().range(from, from + PAGE - 1)
      assertPostgresOk(error)
      const rows = (data ?? []) as unknown as RawExerciseRow[]
      all.push(...rows.map(mapExerciseRow))
      if (rows.length < PAGE) break
    }

    const queryLc = params.query?.toLowerCase()
    const primaryLc = params.primary_muscle?.toLowerCase()

    const filtered = all.filter((ex) => {
      if (queryLc) {
        const hay = [ex.name, ex.primary_muscles.join(','), ex.secondary_muscles.join(',')]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(queryLc)) return false
      }
      if (primaryLc) {
        const hay = ex.primary_muscles.join(',').toLowerCase()
        if (!hay.includes(primaryLc)) return false
      }
      return true
    })

    const total = filtered.length
    const sliced = filtered.slice(offset, offset + limit)

    return {
      data: sliced,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      hasMore: offset + limit < total,
    }
  },
}
