import { describe, expect, it } from 'vitest'
import type { AppSupabaseClient } from '../query-client'
import { mapExerciseRow } from './exercise-catalog'
import { exerciseCustomQueries } from './exercise-custom'

type QueryOp = { name: string; args: unknown[] }

type TableState = {
  data?: unknown[]
  singleData?: unknown
  count?: number
  error?: { code?: string; message?: string } | null
  ops: QueryOp[]
}

class FakeBuilder {
  constructor(private state: TableState) {}

  private record(name: string, args: unknown[]) {
    this.state.ops.push({ name, args })
    return this
  }

  select(...a: unknown[]) {
    return this.record('select', a)
  }
  insert(...a: unknown[]) {
    return this.record('insert', a)
  }
  update(...a: unknown[]) {
    return this.record('update', a)
  }
  eq(...a: unknown[]) {
    return this.record('eq', a)
  }
  is(...a: unknown[]) {
    return this.record('is', a)
  }
  order(...a: unknown[]) {
    return this.record('order', a)
  }
  range(...a: unknown[]) {
    return this.record('range', a)
  }

  single() {
    return Promise.resolve({
      data: this.state.singleData ?? this.state.data?.[0] ?? null,
      error: this.state.error ?? null,
    })
  }
  maybeSingle() {
    return Promise.resolve({
      data: this.state.singleData ?? this.state.data?.[0] ?? null,
      error: this.state.error ?? null,
    })
  }
  // biome-ignore lint/suspicious/noThenProperty: Supabase builders are awaited.
  then(resolve: (value: unknown) => void) {
    resolve({
      data: this.state.data ?? [],
      count: this.state.count ?? 0,
      error: this.state.error ?? null,
    })
  }
}

function makeClient(states: Record<string, Omit<TableState, 'ops'>>) {
  const tableStates = Object.fromEntries(
    Object.entries(states).map(([t, s]) => [t, { ...s, ops: [] as QueryOp[] }]),
  ) as Record<string, TableState>
  return {
    client: {
      from: (table: string) => new FakeBuilder(tableStates[table]),
    } as unknown as AppSupabaseClient,
    states: tableStates,
  }
}

function rawRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'custom-1',
    name: 'Pendlay Row',
    category_id: 'strength',
    tracking_type: 'strength',
    force: null,
    level: null,
    mechanic: null,
    equipment: 'barbell',
    primary_muscles: ['back'],
    secondary_muscles: [],
    instructions: ['Pull'],
    gif_path: null,
    preview_image_path: null,
    created_by: 'user-1',
    created_at: '2026-06-21T00:00:00.000Z',
    updated_at: '2026-06-21T00:00:00.000Z',
    exercise_categories: { name: 'Strength' },
    ...overrides,
  }
}

const validPayload = {
  name: 'Pendlay Row',
  category_id: 'strength',
  tracking_type: 'strength' as const,
  equipment: 'barbell',
  primary_muscles: ['back'],
  secondary_muscles: [],
  instructions: ['Pull'],
  gif_path: null,
  preview_image_path: null,
}

describe('mapExerciseRow is_custom', () => {
  it('marks rows with a creator as custom and never leaks created_by', () => {
    const custom = mapExerciseRow(rawRow({ created_by: 'user-1' }) as never)
    expect(custom.is_custom).toBe(true)
    expect('created_by' in custom).toBe(false)

    const seed = mapExerciseRow(rawRow({ created_by: null }) as never)
    expect(seed.is_custom).toBe(false)
  })
})

describe('exerciseCustomQueries.create', () => {
  it('inserts a whitelisted payload with the creator and a custom- id', async () => {
    const { client, states } = makeClient({
      exercises: { singleData: rawRow({ id: 'custom-generated' }) },
    })

    const result = await exerciseCustomQueries.create(client, 'user-1', validPayload)

    expect(result.is_custom).toBe(true)
    const insertOp = states.exercises.ops.find((op) => op.name === 'insert')
    expect(insertOp).toBeTruthy()
    const inserted = (insertOp?.args[0] ?? {}) as Record<string, unknown>
    expect(inserted.created_by).toBe('user-1')
    expect(String(inserted.id)).toMatch(/^custom-/)
    expect(inserted.name).toBe('Pendlay Row')
    // never persist join-only / derived columns
    expect('category_name' in inserted).toBe(false)
    expect('is_custom' in inserted).toBe(false)
  })
})

describe('exerciseCustomQueries.update', () => {
  it('scopes the update to the row id AND the creator', async () => {
    const { client, states } = makeClient({
      exercises: { singleData: rawRow({ name: 'Renamed' }) },
    })

    await exerciseCustomQueries.update(client, 'user-1', 'custom-1', validPayload)

    const ops = states.exercises.ops
    expect(ops.find((op) => op.name === 'update')).toBeTruthy()
    expect(ops).toContainEqual({ name: 'eq', args: ['id', 'custom-1'] })
    expect(ops).toContainEqual({ name: 'eq', args: ['created_by', 'user-1'] })
  })
})

describe('exerciseCustomQueries.archive', () => {
  it('sets archived_at and scopes to the creator', async () => {
    const { client, states } = makeClient({
      exercises: { singleData: { id: 'custom-1' } },
    })

    const result = await exerciseCustomQueries.archive(client, 'user-1', 'custom-1')

    expect(result).toEqual({ exerciseId: 'custom-1', archived: true })
    const ops = states.exercises.ops
    const updateOp = ops.find((op) => op.name === 'update')
    expect((updateOp?.args[0] as Record<string, unknown>).archived_at).toBeTruthy()
    expect(ops).toContainEqual({ name: 'eq', args: ['id', 'custom-1'] })
    expect(ops).toContainEqual({ name: 'eq', args: ['created_by', 'user-1'] })
  })
})

describe('exerciseCustomQueries.listOwn', () => {
  it('returns active rows for the creator only', async () => {
    const { client, states } = makeClient({
      exercises: { data: [rawRow({ id: 'custom-1' }), rawRow({ id: 'custom-2' })] },
    })

    const result = await exerciseCustomQueries.listOwn(client, 'user-1')

    expect(result.exerciseIds).toEqual(['custom-1', 'custom-2'])
    expect(result.items.every((it) => it.is_custom)).toBe(true)
    const ops = states.exercises.ops
    expect(ops).toContainEqual({ name: 'eq', args: ['created_by', 'user-1'] })
    expect(ops).toContainEqual({ name: 'is', args: ['archived_at', null] })
  })
})
