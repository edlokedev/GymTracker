import type { User } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { PrivateHandlerContext } from '../lib/api/define-private-route'
import {
  archiveCustomExercise,
  createCustomExercise,
  updateCustomExercise,
} from './api.exercises.custom'

const fakeUser = { id: 'user-1' } as unknown as User

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

class FakeBuilder {
  constructor(private row: unknown) {}
  insert() {
    return this
  }
  update() {
    return this
  }
  eq() {
    return this
  }
  select() {
    return this
  }
  single() {
    return Promise.resolve({ data: this.row, error: null })
  }
}

function fakeSupabase(row: unknown) {
  return { from: () => new FakeBuilder(row) } as unknown as PrivateHandlerContext['supabase']
}

function ctx(opts: { body?: unknown; search?: string; row?: unknown }): PrivateHandlerContext {
  const url = `http://test/api/exercises/custom${opts.search ?? ''}`
  const request = new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  })
  return {
    user: fakeUser,
    supabase: fakeSupabase(opts.row ?? rawRow()),
    request,
    url: new URL(url),
    params: {},
  }
}

const validBody = {
  name: 'Pendlay Row',
  category_id: 'strength',
  tracking_type: 'strength',
}

describe('POST create custom exercise', () => {
  it('creates and returns the mapped exercise', async () => {
    const result = await createCustomExercise(ctx({ body: validBody }))
    expect(result.id).toBe('custom-1')
    expect(result.is_custom).toBe(true)
  })

  it('rejects a blank name', async () => {
    await expect(
      createCustomExercise(ctx({ body: { ...validBody, name: '   ' } })),
    ).rejects.toThrow()
  })

  it('rejects an unknown field (strict body)', async () => {
    await expect(
      createCustomExercise(ctx({ body: { ...validBody, sneaky: true } })),
    ).rejects.toThrow()
  })
})

describe('PATCH / DELETE require an id', () => {
  it('PATCH without id throws', async () => {
    await expect(updateCustomExercise(ctx({ body: validBody }))).rejects.toThrow()
  })

  it('PATCH with id updates', async () => {
    const result = await updateCustomExercise(ctx({ body: validBody, search: '?id=custom-1' }))
    expect(result.id).toBe('custom-1')
  })

  it('DELETE without id throws', async () => {
    await expect(archiveCustomExercise(ctx({}))).rejects.toThrow()
  })

  it('DELETE with id archives', async () => {
    const result = await archiveCustomExercise(
      ctx({ search: '?id=custom-1', row: { id: 'custom-1' } }),
    )
    expect(result).toEqual({ exerciseId: 'custom-1', archived: true })
  })
})
