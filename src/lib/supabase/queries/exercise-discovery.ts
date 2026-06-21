import type { createServerClient } from '@supabase/ssr'
import { assertPostgresOk, notFound } from '../../api/errors'
import type { Database } from '../database.types'
import type { AppSupabaseClient, QueryBuilder } from '../query-client'
import {
  type CatalogExercise,
  EXERCISE_SELECT,
  exerciseCatalogQueries,
  mapExerciseRow,
} from './exercise-catalog'

type SB = ReturnType<typeof createServerClient<Database>> | AppSupabaseClient

export interface RecentExerciseItem {
  exercise: CatalogExercise
  lastUsedAt: string
  useCount: number
}

export interface SuggestedExerciseItem {
  exercise: CatalogExercise
  score: number
  reasons: string[]
}

type FavoriteRow = {
  user_id: string
  exercise_id: string
  created_at: string
}

type WorkoutSetRow = {
  exercise_id: string
  created_at: string | null
  workout_sessions?: {
    user_id?: string
    date?: string | null
    start_time?: string | null
    created_at?: string | null
  } | null
}

const RECENT_SELECT =
  'exercise_id, created_at, workout_sessions!inner(user_id, date, start_time, created_at)'

function table(supabase: SB, tableName: string) {
  return (supabase as unknown as { from: (name: string) => QueryBuilder }).from(tableName)
}

function uniqueOrdered(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

async function listFavoriteRows(supabase: SB, userId: string): Promise<FavoriteRow[]> {
  const { data, error } = await table(supabase, 'exercise_favorites')
    .select('user_id, exercise_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  assertPostgresOk(error)
  return (data ?? []) as FavoriteRow[]
}

async function listExercisesByIds(
  supabase: SB,
  exerciseIds: string[],
  opts: { excludeArchived?: boolean } = {},
): Promise<CatalogExercise[]> {
  const ids = uniqueOrdered(exerciseIds)
  if (ids.length === 0) return []

  // Recent/history keep archived rows resolvable; favorites (a picker) hide
  // them. Caller opts in via excludeArchived.
  let q = table(supabase, 'exercises').select(EXERCISE_SELECT).in('id', ids)
  if (opts.excludeArchived) q = q.is('archived_at', null)
  const { data, error } = await q
  assertPostgresOk(error)

  const byId = new Map(
    ((data ?? []) as Parameters<typeof mapExerciseRow>[0][]).map((row) => {
      const exercise = mapExerciseRow(row)
      return [exercise.id, exercise]
    }),
  )
  return ids.flatMap((id) => {
    const exercise = byId.get(id)
    return exercise ? [exercise] : []
  })
}

async function listRecentRows(supabase: SB, userId: string): Promise<WorkoutSetRow[]> {
  const { data, error } = await table(supabase, 'workout_sets')
    .select(RECENT_SELECT)
    .eq('workout_sessions.user_id', userId)
    .order('created_at', { ascending: false })

  assertPostgresOk(error)
  return (data ?? []) as WorkoutSetRow[]
}

function rowUsedAt(row: WorkoutSetRow): string {
  return (
    row.workout_sessions?.start_time ||
    row.workout_sessions?.date ||
    row.workout_sessions?.created_at ||
    row.created_at ||
    ''
  )
}

function overlapCount(a: string[], b: string[]): number {
  const bSet = new Set(b)
  return a.filter((value) => bSet.has(value)).length
}

export function rankSuggestedExercises({
  catalog,
  currentExercise,
  muscle,
  favoriteIds,
  recentExerciseIds,
  limit,
}: {
  catalog: CatalogExercise[]
  currentExercise?: CatalogExercise | null
  muscle?: string
  favoriteIds: Set<string>
  recentExerciseIds: Set<string>
  limit: number
}): SuggestedExerciseItem[] {
  const targetPrimary = muscle ? [muscle] : (currentExercise?.primary_muscles ?? [])
  const targetSecondary = currentExercise?.secondary_muscles ?? []

  return catalog
    .filter((exercise) => exercise.id !== currentExercise?.id)
    .map((exercise) => {
      let score = 0
      const reasons: string[] = []

      if (currentExercise && exercise.tracking_type === currentExercise.tracking_type) {
        score += 30
        reasons.push('same tracking type')
      }

      if (overlapCount(exercise.primary_muscles, targetPrimary) > 0) {
        score += 28
        reasons.push('same primary muscle')
      }

      const secondaryOverlap = overlapCount(exercise.secondary_muscles, targetSecondary)
      if (secondaryOverlap > 0) {
        score += secondaryOverlap * 8
        reasons.push('overlapping secondary muscles')
      }

      if (currentExercise?.equipment && exercise.equipment === currentExercise.equipment) {
        score += 12
        reasons.push('same equipment')
      }

      if (currentExercise && exercise.category_id === currentExercise.category_id) {
        score += 10
        reasons.push('same category')
      }

      if (favoriteIds.has(exercise.id)) {
        score += 7
        reasons.push('favorite')
      }

      if (recentExerciseIds.has(exercise.id)) {
        score += 5
        reasons.push('recently used')
      }

      return { exercise, score, reasons }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name))
    .slice(0, limit)
}

export const exerciseDiscoveryQueries = {
  async listFavorites(
    supabase: SB,
    userId: string,
  ): Promise<{ items: CatalogExercise[]; exerciseIds: string[] }> {
    const rows = await listFavoriteRows(supabase, userId)
    const exerciseIds = rows.map((row) => row.exercise_id)
    const items = await listExercisesByIds(supabase, exerciseIds, { excludeArchived: true })
    return { items, exerciseIds: items.map((exercise) => exercise.id) }
  },

  async addFavorite(supabase: SB, userId: string, exerciseId: string) {
    const exercise = await exerciseCatalogQueries.getById(
      supabase as ReturnType<typeof createServerClient<Database>>,
      exerciseId,
    )
    if (!exercise) notFound()

    const { error } = await table(supabase, 'exercise_favorites')
      .insert({ user_id: userId, exercise_id: exerciseId })
      .select('user_id, exercise_id')
      .single()

    assertPostgresOk(error)
    return { exerciseId, isFavorite: true }
  },

  async deleteFavorite(supabase: SB, userId: string, exerciseId: string) {
    const { data, error } = await table(supabase, 'exercise_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .select('exercise_id')

    assertPostgresOk(error)
    if ((data ?? []).length === 0) notFound()
    return { exerciseId, isFavorite: false }
  },

  async listRecent(supabase: SB, userId: string, limit: number): Promise<RecentExerciseItem[]> {
    const rows = await listRecentRows(supabase, userId)
    const byExercise = new Map<string, { lastUsedAt: string; useCount: number }>()

    for (const row of rows) {
      const usedAt = rowUsedAt(row)
      const prev = byExercise.get(row.exercise_id)
      if (!prev) {
        byExercise.set(row.exercise_id, { lastUsedAt: usedAt, useCount: 1 })
        continue
      }
      prev.useCount += 1
      if (usedAt > prev.lastUsedAt) prev.lastUsedAt = usedAt
    }

    const sorted = Array.from(byExercise.entries())
      .sort((a, b) => b[1].lastUsedAt.localeCompare(a[1].lastUsedAt))
      .slice(0, limit)
    const exercises = await listExercisesByIds(
      supabase,
      sorted.map(([exerciseId]) => exerciseId),
    )
    const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]))

    return sorted.flatMap(([exerciseId, stats]) => {
      const exercise = byId.get(exerciseId)
      return exercise ? [{ exercise, ...stats }] : []
    })
  },

  async listSuggested(
    supabase: SB,
    userId: string,
    params: { exerciseId?: string; muscle?: string; limit: number },
  ): Promise<SuggestedExerciseItem[]> {
    const currentExercise = params.exerciseId
      ? await exerciseCatalogQueries.getById(
          supabase as ReturnType<typeof createServerClient<Database>>,
          params.exerciseId,
        )
      : null
    if (params.exerciseId && !currentExercise) notFound()

    const [favorites, recent, catalogResult] = await Promise.all([
      this.listFavorites(supabase, userId),
      this.listRecent(supabase, userId, 25),
      exerciseCatalogQueries.search(supabase as ReturnType<typeof createServerClient<Database>>, {
        limit: 1000,
        offset: 0,
      }),
    ])

    return rankSuggestedExercises({
      catalog: catalogResult.data,
      currentExercise,
      muscle: params.muscle,
      favoriteIds: new Set(favorites.exerciseIds),
      recentExerciseIds: new Set(recent.map((item) => item.exercise.id)),
      limit: params.limit,
    })
  },
}
