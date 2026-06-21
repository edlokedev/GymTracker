// Custom Exercise writes (ADR-0004). Create / edit / archive rows the
// authenticated user owns, plus listing their own custom exercises so the UI
// can show edit affordances without the public catalog leaking `created_by`.
//
// RLS is the real authorization boundary; the extra `.eq('created_by', userId)`
// filters are defense-in-depth and keep the intent explicit in the query.

import type { createServerClient } from '@supabase/ssr'
import { assertPostgresOk } from '../../api/errors'
import type { Database } from '../database.types'
import type { AppSupabaseClient, QueryBuilder } from '../query-client'
import { type CatalogExercise, EXERCISE_SELECT, mapExerciseRow } from './exercise-catalog'

type SB = ReturnType<typeof createServerClient<Database>> | AppSupabaseClient

// Loose-typed table accessor: the generated Database type is a permissive
// placeholder, so we route writes through the QueryBuilder shape (same pattern
// as exercise-discovery) to keep insert/update payloads typed as plain records.
function table(supabase: SB, tableName: string): QueryBuilder {
  return (supabase as unknown as { from: (name: string) => QueryBuilder }).from(tableName)
}

// Normalized payload accepted from the route (matches DB column names). Mirrors
// the client-side CustomExercisePayload but lives server-side to avoid a
// feature → lib import.
export interface CustomExerciseInput {
  name: string
  category_id: string
  tracking_type: 'strength' | 'cardio' | 'timed'
  equipment: string | null
  primary_muscles: string[]
  secondary_muscles: string[]
  instructions: string[]
  gif_path: string | null
  preview_image_path: string | null
}

export interface ArchiveResult {
  exerciseId: string
  archived: true
}

export interface OwnCustomExercises {
  items: CatalogExercise[]
  exerciseIds: string[]
}

function newCustomId(): string {
  return `custom-${crypto.randomUUID()}`
}

// Only these columns are ever written from user input — never the join-only
// `category_name` or the derived `is_custom`.
function toColumns(input: CustomExerciseInput) {
  return {
    name: input.name,
    category_id: input.category_id,
    tracking_type: input.tracking_type,
    equipment: input.equipment,
    primary_muscles: input.primary_muscles,
    secondary_muscles: input.secondary_muscles,
    instructions: input.instructions,
    gif_path: input.gif_path,
    preview_image_path: input.preview_image_path,
  }
}

export const exerciseCustomQueries = {
  async create(supabase: SB, userId: string, input: CustomExerciseInput): Promise<CatalogExercise> {
    const { data, error } = await table(supabase, 'exercises')
      .insert({ id: newCustomId(), created_by: userId, ...toColumns(input) })
      .select(EXERCISE_SELECT)
      .single()

    assertPostgresOk(error)
    return mapExerciseRow(data as never)
  },

  async update(
    supabase: SB,
    userId: string,
    id: string,
    input: CustomExerciseInput,
  ): Promise<CatalogExercise> {
    const { data, error } = await table(supabase, 'exercises')
      .update(toColumns(input))
      .eq('id', id)
      .eq('created_by', userId)
      .select(EXERCISE_SELECT)
      .single()

    assertPostgresOk(error)
    return mapExerciseRow(data as never)
  },

  async archive(supabase: SB, userId: string, id: string): Promise<ArchiveResult> {
    const { error } = await table(supabase, 'exercises')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .eq('created_by', userId)
      .select('id')
      .single()

    assertPostgresOk(error)
    return { exerciseId: id, archived: true }
  },

  async listOwn(supabase: SB, userId: string): Promise<OwnCustomExercises> {
    const { data, error } = await table(supabase, 'exercises')
      .select(EXERCISE_SELECT)
      .eq('created_by', userId)
      .is('archived_at', null)
      .order('name', { ascending: true })

    assertPostgresOk(error)
    const items = ((data ?? []) as never[]).map(mapExerciseRow)
    return { items, exerciseIds: items.map((it) => it.id) }
  },
}
