import { describe, expect, it } from 'vitest'
import { workoutSetsContract } from '../../src/lib/api/contracts/workout-sets.contract'
import {
  createWorkoutSet,
  deleteWorkoutSet,
  getWorkoutSets,
  updateWorkoutSet,
} from '../../src/routes/api.workout-sets'
import { fakeUser, runRoute } from './run-route'
import { stubSupabase } from './stub-supabase'

const parentRefs = {
  workout_sets: { table: 'workout_sessions', childKey: 'workout_id' },
}

function fixtures() {
  return {
    workout_sessions: [
      {
        id: 'sess-1',
        user_id: fakeUser.id,
        date: '2026-05-20',
        start_time: '2026-05-20T10:00:00Z',
      },
    ],
    workout_sets: [
      {
        id: 'set-1',
        workout_id: 'sess-1',
        exercise_id: 'ex-1',
        set_number: 1,
        weight: 100,
        reps: 5,
        rest_time: null,
        notes: null,
        created_at: '2026-05-20T10:00:00Z',
        updated_at: '2026-05-20T10:00:00Z',
      },
    ],
  }
}

describe('/api/workout-sets', () => {
  it('GET ?id=… returns one set', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSetsContract,
      method: 'GET',
      handler: getWorkoutSets,
      user: fakeUser,
      supabase,
      query: { id: 'set-1' },
    })
    expect(res.status).toBe(200)
    const parsed = workoutSetsContract.methods.GET.response.parse(res.body.data)
    expect(parsed).toMatchObject({ id: 'set-1', set_number: 1 })
  })

  it('GET ?workoutId=… returns a list', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSetsContract,
      method: 'GET',
      handler: getWorkoutSets,
      user: fakeUser,
      supabase,
      query: { workoutId: 'sess-1' },
    })
    expect(res.status).toBe(200)
    const parsed = workoutSetsContract.methods.GET.response.parse(res.body.data)
    expect(Array.isArray(parsed)).toBe(true)
  })

  it('GET returns 401 anonymously', async () => {
    const supabase = stubSupabase(fixtures())
    const res = await runRoute({
      contract: workoutSetsContract,
      method: 'GET',
      handler: getWorkoutSets,
      user: null,
      supabase,
      query: { id: 'set-1' },
    })
    expect(res.status).toBe(401)
  })

  it('GET returns 400 when neither id nor workoutId is provided', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSetsContract,
      method: 'GET',
      handler: getWorkoutSets,
      user: fakeUser,
      supabase,
    })
    expect(res.status).toBe(400)
  })

  it('GET ?id=missing returns 404', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSetsContract,
      method: 'GET',
      handler: getWorkoutSets,
      user: fakeUser,
      supabase,
      query: { id: 'set-missing' },
    })
    expect(res.status).toBe(404)
  })

  it('POST creates a new set', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSetsContract,
      method: 'POST',
      handler: createWorkoutSet,
      user: fakeUser,
      supabase,
      body: {
        workout_id: 'sess-1',
        exercise_id: 'ex-1',
        set_order: 2,
        reps: 10,
        weight: 80,
      },
    })
    expect(res.status).toBe(200)
    const parsed = workoutSetsContract.methods.POST.response.parse(res.body.data)
    expect(parsed.set_number).toBe(2)
  })

  it('POST returns 400 when required fields are missing', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSetsContract,
      method: 'POST',
      handler: createWorkoutSet,
      user: fakeUser,
      supabase,
      body: { workout_id: 'sess-1' },
    })
    expect(res.status).toBe(400)
  })

  it('PUT ?id=… updates an existing set', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSetsContract,
      method: 'PUT',
      handler: updateWorkoutSet,
      user: fakeUser,
      supabase,
      query: { id: 'set-1' },
      body: { reps: 7 },
    })
    expect(res.status).toBe(200)
    const parsed = workoutSetsContract.methods.PUT.response.parse(res.body.data)
    expect(parsed.reps).toBe(7)
  })

  it('DELETE ?id=… returns {}', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSetsContract,
      method: 'DELETE',
      handler: deleteWorkoutSet,
      user: fakeUser,
      supabase,
      query: { id: 'set-1' },
    })
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({})
  })

  it('DELETE ?workoutId=…&exerciseId=… returns { deleted: number }', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSetsContract,
      method: 'DELETE',
      handler: deleteWorkoutSet,
      user: fakeUser,
      supabase,
      query: { workoutId: 'sess-1', exerciseId: 'ex-1' },
    })
    expect(res.status).toBe(200)
    const parsed = workoutSetsContract.methods.DELETE.response.parse(res.body.data)
    expect(parsed).toEqual({ deleted: 1 })
  })
})
