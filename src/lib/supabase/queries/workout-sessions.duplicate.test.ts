import { describe, expect, it } from 'vitest'
import { stubSupabase } from '../../../../tests/contract/stub-supabase'
import { workoutSessionQueries } from './workout-sessions'

describe('bulk inserts', () => {
  it('inserts all rows atomically through the contract stub', async () => {
    const db = stubSupabase({ workout_sets: [] })
    const result = await db
      .from('workout_sets')
      .insert([{ exercise_id: 'a' }, { exercise_id: 'b' }])
    expect(result.error).toBeNull()
    expect(db._tables.workout_sets.map((row: { exercise_id: string }) => row.exercise_id)).toEqual([
      'a',
      'b',
    ])
  })
})

describe('workoutSessionQueries.duplicate', () => {
  const source = {
    id: 'source',
    user_id: 'user',
    name: 'Day',
    date: '2026-01-01',
    start_time: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
  const sets = [1, 2].map((n) => ({
    id: `set-${n}`,
    workout_id: 'source',
    exercise_id: 'ex',
    set_number: n,
    weight: n * 10,
    reps: 5,
    created_at: '2026-01-01T00:00:00Z',
  }))

  it('copies all sets in one insert', async () => {
    const db = stubSupabase({ workout_sessions: [source], workout_sets: sets }, { userId: 'user' })
    const from = db.from.bind(db)
    let inserts = 0
    db.from = (table: string) => {
      const query = from(table)
      if (table === 'workout_sets') {
        const insert = query.insert
        query.insert = (rows: unknown) => {
          inserts++
          return insert(rows)
        }
      }
      return query
    }
    const copy = await workoutSessionQueries.duplicate(db, 'user', 'source', '2026-02-01')
    expect(inserts).toBe(1)
    expect(
      db._tables.workout_sets
        .filter((row: { workout_id: string }) => row.workout_id === copy?.id)
        .map((row: { weight: number }) => row.weight),
    ).toEqual([10, 20])
    const stamps = db._tables.workout_sets
      .filter((row: { workout_id: string }) => row.workout_id === copy?.id)
      .map((row: { created_at: string }) => row.created_at)
    expect(stamps[0] < stamps[1]).toBe(true)
  })

  it('deletes the new session when the set insert fails', async () => {
    const db = stubSupabase({ workout_sessions: [source], workout_sets: sets }, { userId: 'user' })
    const from = db.from.bind(db)
    db.from = (table: string) => {
      const query = from(table)
      if (table === 'workout_sets')
        query.insert = () => Promise.resolve({ error: { message: 'insert failed' } })
      return query
    }
    await expect(workoutSessionQueries.duplicate(db, 'user', 'source')).rejects.toThrow()
    expect(db._tables.workout_sessions.map((row: { id: string }) => row.id)).toEqual(['source'])
    expect(db._tables.workout_sets).toHaveLength(2)
  })
})

describe('workoutSessionQueries.getWithDetails', () => {
  it('starts the set read without waiting for the session read', async () => {
    const db = stubSupabase({ workout_sessions: [], workout_sets: [] })
    const from = db.from.bind(db)
    let release!: () => void
    let setsStarted = false
    db.from = (table: string) => {
      const query = from(table)
      if (table === 'workout_sessions') {
        query.maybeSingle = () =>
          new Promise((resolve) => {
            release = () => resolve({ data: null, error: null })
          })
      }
      if (table === 'workout_sets') setsStarted = true
      return query
    }
    const result = workoutSessionQueries.getWithDetails(db, 'missing')
    expect(setsStarted).toBe(true)
    release()
    await expect(result).resolves.toBeNull()
  })
})
