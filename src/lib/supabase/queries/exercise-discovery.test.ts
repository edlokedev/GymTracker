import { describe, expect, it } from 'vitest'
import type { AppSupabaseClient } from '../query-client'
import type { CatalogExercise } from './exercise-catalog'
import {
  exerciseDiscoveryQueries,
  type RecentExerciseItem,
  rankSuggestedExercises,
} from './exercise-discovery'

type QueryOp = { name: string; args: unknown[] }

type TableState = {
  data?: unknown[]
  singleData?: unknown
  upsertData?: unknown
  error?: { code?: string; message?: string } | null
  ops: QueryOp[]
}

class FakeBuilder {
  private state: TableState
  private pendingSingle = false

  constructor(state: TableState) {
    this.state = state
  }

  select(...args: unknown[]) {
    this.state.ops.push({ name: 'select', args })
    return this
  }

  eq(...args: unknown[]) {
    this.state.ops.push({ name: 'eq', args })
    return this
  }

  order(...args: unknown[]) {
    this.state.ops.push({ name: 'order', args })
    return this
  }

  limit(...args: unknown[]) {
    this.state.ops.push({ name: 'limit', args })
    return this
  }

  in(...args: unknown[]) {
    this.state.ops.push({ name: 'in', args })
    return this
  }

  insert(...args: unknown[]) {
    this.state.ops.push({ name: 'insert', args })
    return this
  }

  delete(...args: unknown[]) {
    this.state.ops.push({ name: 'delete', args })
    return this
  }

  // biome-ignore lint/suspicious/noThenProperty: Supabase query builders are awaited directly.
  then(resolve: (value: unknown) => void) {
    resolve({ data: this.state.data ?? [], error: this.state.error ?? null })
  }

  single() {
    this.pendingSingle = true
    const data = this.state.upsertData ?? this.state.singleData ?? this.state.data?.[0] ?? null
    return Promise.resolve({ data, error: this.state.error ?? null })
  }

  maybeSingle() {
    const data = this.pendingSingle
      ? (this.state.singleData ?? this.state.data?.[0] ?? null)
      : (this.state.singleData ?? this.state.data?.[0] ?? null)
    return Promise.resolve({ data, error: this.state.error ?? null })
  }
}

function makeClient(states: Record<string, Omit<TableState, 'ops'> & { ops?: QueryOp[] }>) {
  const tableStates = Object.fromEntries(
    Object.entries(states).map(([table, state]) => [table, { ...state, ops: state.ops ?? [] }]),
  ) as Record<string, TableState>

  return {
    client: {
      from(table: string) {
        return new FakeBuilder(tableStates[table])
      },
    } as unknown as AppSupabaseClient,
    states: tableStates,
  }
}

function rawExercise(overrides: Partial<CatalogExercise> = {}) {
  return {
    id: 'bench',
    name: 'Bench Press',
    category_id: 'strength',
    tracking_type: 'strength',
    force: 'push',
    level: 'beginner',
    mechanic: 'compound',
    equipment: 'barbell',
    primary_muscles: ['chest'],
    secondary_muscles: ['triceps'],
    instructions: ['Press'],
    gif_path: null,
    preview_image_path: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    category_name: 'Strength',
    ...overrides,
    exercise_categories: { name: overrides.category_name ?? 'Strength' },
  }
}

function catalogExercise(overrides: Partial<CatalogExercise> = {}): CatalogExercise {
  return {
    id: 'bench',
    name: 'Bench Press',
    category_id: 'strength',
    tracking_type: 'strength',
    force: 'push',
    level: 'beginner',
    mechanic: 'compound',
    equipment: 'barbell',
    primary_muscles: ['chest'],
    secondary_muscles: ['triceps'],
    instructions: ['Press'],
    gif_path: null,
    preview_image_path: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    category_name: 'Strength',
    ...overrides,
  }
}

describe('exerciseDiscoveryQueries', () => {
  it('lists favorite exercises and ids for owner-scoped rows', async () => {
    const { client, states } = makeClient({
      exercise_favorites: {
        data: [
          {
            exercise_id: 'bench',
            created_at: '2026-01-03T00:00:00.000Z',
            exercises: rawExercise({ id: 'bench' }),
          },
        ],
      },
      exercises: {
        data: [rawExercise({ id: 'bench' })],
      },
    })

    const result = await exerciseDiscoveryQueries.listFavorites(client, 'user-1')

    expect(result.exerciseIds).toEqual(['bench'])
    expect(result.items.map((item) => item.id)).toEqual(['bench'])
    expect(states.exercise_favorites.ops).toContainEqual({
      name: 'eq',
      args: ['user_id', 'user-1'],
    })
    expect(states.exercises.ops).toContainEqual({ name: 'in', args: ['id', ['bench']] })
  })

  it('adds favorite with user and exercise composite key insert', async () => {
    const { client, states } = makeClient({
      exercises: {
        singleData: rawExercise({ id: 'squat' }),
      },
      exercise_favorites: {
        singleData: { exercise_id: 'squat' },
      },
    })

    const exerciseId = await exerciseDiscoveryQueries.addFavorite(client, 'user-1', 'squat')

    expect(exerciseId).toEqual({ exerciseId: 'squat', isFavorite: true })
    expect(states.exercise_favorites.ops).toContainEqual({
      name: 'insert',
      args: [{ user_id: 'user-1', exercise_id: 'squat' }],
    })
  })

  it('derives recent exercises from workout sets grouped by exercise', async () => {
    const { client, states } = makeClient({
      workout_sets: {
        data: [
          {
            exercise_id: 'bench',
            created_at: '2026-01-03T10:01:00.000Z',
            workout_sessions: {
              user_id: 'user-1',
              start_time: '2026-01-03T10:00:00.000Z',
              date: '2026-01-03',
            },
          },
          {
            exercise_id: 'squat',
            created_at: '2026-01-02T10:01:00.000Z',
            workout_sessions: {
              user_id: 'user-1',
              start_time: '2026-01-02T10:00:00.000Z',
              date: '2026-01-02',
            },
          },
          {
            exercise_id: 'bench',
            created_at: '2026-01-01T10:01:00.000Z',
            workout_sessions: {
              user_id: 'user-1',
              start_time: '2026-01-01T10:00:00.000Z',
              date: '2026-01-01',
            },
          },
        ],
      },
      exercises: {
        data: [
          rawExercise({ id: 'bench', name: 'Bench Press' }),
          rawExercise({ id: 'squat', name: 'Squat' }),
        ],
      },
    })

    const recent = await exerciseDiscoveryQueries.listRecent(client, 'user-1', 10)

    expect(
      recent.map((item: RecentExerciseItem) => ({
        id: item.exercise.id,
        lastUsedAt: item.lastUsedAt,
        useCount: item.useCount,
      })),
    ).toEqual([
      { id: 'bench', lastUsedAt: '2026-01-03T10:00:00.000Z', useCount: 2 },
      { id: 'squat', lastUsedAt: '2026-01-02T10:00:00.000Z', useCount: 1 },
    ])
    expect(states.workout_sets.ops).toContainEqual({
      name: 'eq',
      args: ['workout_sessions.user_id', 'user-1'],
    })
  })
})

describe('rankSuggestedExercises', () => {
  it('ranks same tracking, muscle, equipment, favorites, and recent above weaker matches', () => {
    const current = catalogExercise({
      id: 'bench',
      name: 'Bench Press',
      tracking_type: 'strength',
      equipment: 'barbell',
      primary_muscles: ['chest'],
      secondary_muscles: ['triceps'],
    })
    const dumbbellPress = catalogExercise({
      id: 'dumbbell-press',
      name: 'Dumbbell Press',
      equipment: 'dumbbell',
      primary_muscles: ['chest'],
      secondary_muscles: ['triceps'],
    })
    const pushUp = catalogExercise({
      id: 'push-up',
      name: 'Push Up',
      equipment: 'body weight',
      primary_muscles: ['chest'],
      secondary_muscles: ['triceps'],
    })
    const treadmill = catalogExercise({
      id: 'treadmill',
      name: 'Treadmill',
      category_id: 'cardio',
      tracking_type: 'cardio',
      equipment: 'machine',
      primary_muscles: ['quadriceps'],
      secondary_muscles: [],
    })

    const ranked = rankSuggestedExercises({
      catalog: [current, treadmill, pushUp, dumbbellPress],
      currentExercise: current,
      muscle: 'chest',
      favoriteIds: new Set(['push-up']),
      recentExerciseIds: new Set(['dumbbell-press']),
      limit: 10,
    })

    expect(ranked.map((item) => item.exercise.id)).toEqual(['push-up', 'dumbbell-press'])
    expect(ranked[0].reasons).toEqual(
      expect.arrayContaining(['same tracking type', 'same primary muscle', 'favorite']),
    )
    expect(ranked.some((item) => item.exercise.id === 'bench')).toBe(false)
    expect(ranked.some((item) => item.exercise.id === 'treadmill')).toBe(false)
  })
})
