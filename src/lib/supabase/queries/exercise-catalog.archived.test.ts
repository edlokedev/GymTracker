import { describe, expect, it } from 'vitest'
import type { AppSupabaseClient } from '../query-client'
import { exerciseCatalogQueries } from './exercise-catalog'

type QueryOp = { name: string; args: unknown[] }

class FakeBuilder {
  ops: QueryOp[]
  constructor(private store: { data?: unknown[]; count?: number; ops: QueryOp[] }) {
    this.ops = store.ops
  }
  private rec(name: string, args: unknown[]) {
    this.ops.push({ name, args })
    return this
  }
  select(...a: unknown[]) {
    return this.rec('select', a)
  }
  eq(...a: unknown[]) {
    return this.rec('eq', a)
  }
  neq(...a: unknown[]) {
    return this.rec('neq', a)
  }
  not(...a: unknown[]) {
    return this.rec('not', a)
  }
  or(...a: unknown[]) {
    return this.rec('or', a)
  }
  is(...a: unknown[]) {
    return this.rec('is', a)
  }
  order(...a: unknown[]) {
    return this.rec('order', a)
  }
  range(...a: unknown[]) {
    return this.rec('range', a)
  }
  // biome-ignore lint/suspicious/noThenProperty: Supabase builders are awaited.
  then(resolve: (v: unknown) => void) {
    resolve({ data: this.store.data ?? [], count: this.store.count ?? 0, error: null })
  }
}

function makeClient(store: { data?: unknown[]; count?: number }) {
  const shared = { ...store, ops: [] as QueryOp[] }
  return {
    client: { from: () => new FakeBuilder(shared) } as unknown as AppSupabaseClient,
    ops: shared.ops,
  }
}

const hasArchivedFilter = (ops: QueryOp[]) =>
  ops.some((op) => op.name === 'is' && op.args[0] === 'archived_at' && op.args[1] === null)

describe('exercise catalog reads exclude archived custom exercises', () => {
  it('search fast path filters archived_at is null', async () => {
    const { client, ops } = makeClient({ data: [], count: 0 })
    await exerciseCatalogQueries.search(client as never, {
      category_id: 'strength',
      limit: 20,
      offset: 0,
    })
    expect(hasArchivedFilter(ops)).toBe(true)
  })

  it('search slow path (text query) filters archived_at is null', async () => {
    const { client, ops } = makeClient({ data: [] })
    await exerciseCatalogQueries.search(client as never, { query: 'row', limit: 20, offset: 0 })
    expect(hasArchivedFilter(ops)).toBe(true)
  })

  it('equipment facet excludes archived', async () => {
    const { client, ops } = makeClient({ data: [] })
    await exerciseCatalogQueries.listEquipmentTypes(client as never)
    expect(hasArchivedFilter(ops)).toBe(true)
  })

  it('muscle facet excludes archived', async () => {
    const { client, ops } = makeClient({ data: [] })
    await exerciseCatalogQueries.listMuscleGroups(client as never)
    expect(hasArchivedFilter(ops)).toBe(true)
  })
})
