import { describe, expect, it } from 'vitest'
import type { AppSupabaseClient } from '../query-client'
import { workoutTemplateQueries } from './workout-templates'

type QueryOp = { name: string; args: unknown[] }

type TableState = {
  data?: unknown[]
  singleData?: unknown
  error?: { code?: string; message?: string } | null
  ops: QueryOp[]
}

class FakeBuilder {
  private state: TableState

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

  in(...args: unknown[]) {
    this.state.ops.push({ name: 'in', args })
    return this
  }

  order(...args: unknown[]) {
    this.state.ops.push({ name: 'order', args })
    return this
  }

  insert(...args: unknown[]) {
    this.state.ops.push({ name: 'insert', args })
    return this
  }

  update(...args: unknown[]) {
    this.state.ops.push({ name: 'update', args })
    return this
  }

  delete(...args: unknown[]) {
    this.state.ops.push({ name: 'delete', args })
    return this
  }

  // biome-ignore lint/suspicious/noThenProperty: Supabase builders are awaited directly.
  then(resolve: (value: unknown) => void) {
    resolve({ data: this.state.data ?? [], error: this.state.error ?? null })
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

const templateRow = {
  id: 'template-1',
  user_id: 'user-1',
  name: 'Push Day',
  notes: null,
  source_session_id: 'session-1',
  is_archived: false,
  last_used_at: null,
  created_at: '2026-06-01T10:00:00.000Z',
  updated_at: '2026-06-01T10:00:00.000Z',
}

describe('workoutTemplateQueries', () => {
  it('creates a template from a completed session with exercise order and target set counts', async () => {
    const { client, states } = makeClient({
      workout_sessions: {
        singleData: {
          id: 'session-1',
          user_id: 'user-1',
          name: 'Push Day',
          date: '2026-06-01',
          start_time: '2026-06-01T10:00:00.000Z',
          end_time: '2026-06-01T11:00:00.000Z',
          notes: null,
          created_at: '2026-06-01T10:00:00.000Z',
          updated_at: '2026-06-01T11:00:00.000Z',
        },
      },
      workout_sets: {
        data: [
          { exercise_id: 'bench', set_number: 1, created_at: '2026-06-01T10:01:00.000Z' },
          { exercise_id: 'bench', set_number: 2, created_at: '2026-06-01T10:05:00.000Z' },
          { exercise_id: 'row', set_number: 3, created_at: '2026-06-01T10:10:00.000Z' },
        ],
      },
      workout_templates: {
        singleData: templateRow,
        data: [templateRow],
      },
      workout_template_exercises: {
        data: [
          {
            id: 'template-exercise-1',
            template_id: 'template-1',
            exercise_id: 'bench',
            position: 1,
            target_sets: 2,
            notes: null,
            created_at: '2026-06-01T10:00:00.000Z',
          },
          {
            id: 'template-exercise-2',
            template_id: 'template-1',
            exercise_id: 'row',
            position: 2,
            target_sets: 1,
            notes: null,
            created_at: '2026-06-01T10:00:00.000Z',
          },
        ],
      },
      exercises: {
        data: [],
      },
    })

    await workoutTemplateQueries.create(client, 'user-1', { sourceSessionId: 'session-1' })

    expect(states.workout_templates.ops).toContainEqual({
      name: 'insert',
      args: [
        {
          user_id: 'user-1',
          name: 'Push Day',
          notes: null,
          source_session_id: 'session-1',
        },
      ],
    })
    expect(states.workout_template_exercises.ops).toContainEqual({
      name: 'insert',
      args: [
        [
          {
            template_id: 'template-1',
            exercise_id: 'bench',
            position: 1,
            target_sets: 2,
            notes: null,
          },
          {
            template_id: 'template-1',
            exercise_id: 'row',
            position: 2,
            target_sets: 1,
            notes: null,
          },
        ],
      ],
    })
  })
})
