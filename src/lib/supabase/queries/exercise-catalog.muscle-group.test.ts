import { describe, expect, it } from 'vitest'
import type { AppSupabaseClient } from '../query-client'
import { exerciseCatalogQueries } from './exercise-catalog'

// Records the argument given to `.or(...)`; every other builder method chains.
function makeClient() {
  const orArgs: string[] = []
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  for (const m of ['select', 'eq', 'is', 'order', 'range']) builder[m] = chain
  builder.or = (expr: string) => {
    orArgs.push(expr)
    return builder
  }
  // biome-ignore lint/suspicious/noThenProperty: Supabase builders are awaited.
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: [], count: 0, error: null })
  return { client: { from: () => builder } as unknown as AppSupabaseClient, orArgs }
}

describe('exercise catalog muscle_group filter', () => {
  it('keeps the existing filter string for ordinary values', async () => {
    const { client, orArgs } = makeClient()
    await exerciseCatalogQueries.search(client as never, { muscle_group: 'chest' })
    expect(orArgs).toEqual(['primary_muscles.cs.["chest"],secondary_muscles.cs.["chest"]'])
  })

  it('double-quotes and escapes values containing PostgREST reserved characters', async () => {
    const { client, orArgs } = makeClient()
    await exerciseCatalogQueries.search(client as never, {
      muscle_group: 'chest,name.eq.x)',
    })
    expect(orArgs).toEqual([
      'primary_muscles.cs."[\\"chest,name.eq.x)\\"]",secondary_muscles.cs."[\\"chest,name.eq.x)\\"]"',
    ])
  })
})
