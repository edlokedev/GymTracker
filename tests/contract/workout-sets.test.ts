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

const otherUserId = 'user-2'

function historyFixtures(count: number) {
  return {
    workout_sessions: Array.from({ length: count }, (_, index) => ({
      id: `hist-sess-${index + 1}`,
      user_id: fakeUser.id,
      name: `History ${index + 1}`,
      date: `2026-05-${String((index % 28) + 1).padStart(2, '0')}`,
      start_time: `2026-05-${String((index % 28) + 1).padStart(2, '0')}T10:00:00Z`,
    })),
    workout_sets: Array.from({ length: count }, (_, index) => ({
      id: `hist-set-${index + 1}`,
      workout_id: `hist-sess-${index + 1}`,
      exercise_id: 'ex-history',
      set_number: 1,
      weight: 100 + index,
      reps: 5,
      rest_time: null,
      notes: null,
      created_at: `2026-05-${String((index % 28) + 1).padStart(2, '0')}T10:00:00Z`,
      updated_at: `2026-05-${String((index % 28) + 1).padStart(2, '0')}T10:00:00Z`,
      workout_sessions: {
        user_id: fakeUser.id,
        name: `History ${index + 1}`,
        date: `2026-05-${String((index % 28) + 1).padStart(2, '0')}`,
      },
    })),
  }
}

function exerciseHistoryFixtures() {
  return {
    workout_sessions: [
      {
        id: 'hist-sess-1',
        user_id: fakeUser.id,
        name: 'Push Day',
        date: '2026-05-20',
        start_time: '2026-05-20T10:00:00Z',
      },
      {
        id: 'hist-sess-2',
        user_id: otherUserId,
        name: 'Other User Push',
        date: '2026-05-21',
        start_time: '2026-05-21T10:00:00Z',
      },
      {
        id: 'hist-sess-3',
        user_id: fakeUser.id,
        name: 'Leg Day',
        date: '2026-05-22',
        start_time: '2026-05-22T10:00:00Z',
      },
    ],
    workout_sets: [
      {
        id: 'hist-set-1',
        workout_id: 'hist-sess-1',
        exercise_id: 'ex-1',
        set_number: 1,
        weight: 100,
        reps: 5,
        rest_time: null,
        notes: null,
        duration_seconds: 1800,
        distance_km: 3.5,
        incline: 0,
        speed_kmh: 7,
        created_at: '2026-05-20T10:00:00Z',
        updated_at: '2026-05-20T10:00:00Z',
        workout_sessions: { user_id: fakeUser.id, name: 'Push Day', date: '2026-05-20' },
      },
      {
        id: 'hist-set-2',
        workout_id: 'hist-sess-2',
        exercise_id: 'ex-1',
        set_number: 1,
        weight: 200,
        reps: 1,
        rest_time: null,
        notes: null,
        created_at: '2026-05-21T10:00:00Z',
        updated_at: '2026-05-21T10:00:00Z',
        workout_sessions: { user_id: otherUserId, name: 'Other User Push', date: '2026-05-21' },
      },
      {
        id: 'hist-set-3',
        workout_id: 'hist-sess-3',
        exercise_id: 'ex-2',
        set_number: 1,
        weight: 50,
        reps: 10,
        rest_time: null,
        notes: null,
        created_at: '2026-05-22T10:00:00Z',
        updated_at: '2026-05-22T10:00:00Z',
        workout_sessions: { user_id: fakeUser.id, name: 'Leg Day', date: '2026-05-22' },
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

  it('GET ?action=history returns exercise history for the authenticated user', async () => {
    const supabase = stubSupabase(exerciseHistoryFixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSetsContract,
      method: 'GET',
      handler: getWorkoutSets,
      user: fakeUser,
      supabase,
      query: { action: 'history', userId: otherUserId, exerciseId: 'ex-1', limit: '10' },
    })
    expect(res.status).toBe(200)
    const parsed = workoutSetsContract.methods.GET.response.parse(res.body.data)
    expect(parsed).toEqual([
      {
        id: 'hist-set-1',
        reps: 5,
        weight: 100,
        duration_seconds: 1800,
        distance_km: 3.5,
        incline: 0,
        speed_kmh: 7,
        session_date: '2026-05-20',
        session_name: 'Push Day',
      },
    ])
  })

  it('GET ?action=history returns 400 without exerciseId', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSetsContract,
      method: 'GET',
      handler: getWorkoutSets,
      user: fakeUser,
      supabase,
      query: { action: 'history' },
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('exerciseId is required')
  })

  it('GET ?action=history defaults to 50 rows and caps oversized limits at 100', async () => {
    const defaultSupabase = stubSupabase(historyFixtures(55), { userId: fakeUser.id, parentRefs })
    const defaultRes = await runRoute({
      contract: workoutSetsContract,
      method: 'GET',
      handler: getWorkoutSets,
      user: fakeUser,
      supabase: defaultSupabase,
      query: { action: 'history', exerciseId: 'ex-history' },
    })
    expect(defaultRes.status).toBe(200)
    const defaultParsed = workoutSetsContract.methods.GET.response.parse(defaultRes.body.data)
    expect(defaultParsed).toHaveLength(50)

    const cappedSupabase = stubSupabase(historyFixtures(105), { userId: fakeUser.id, parentRefs })
    const cappedRes = await runRoute({
      contract: workoutSetsContract,
      method: 'GET',
      handler: getWorkoutSets,
      user: fakeUser,
      supabase: cappedSupabase,
      query: { action: 'history', exerciseId: 'ex-history', limit: '500' },
    })
    expect(cappedRes.status).toBe(200)
    const cappedParsed = workoutSetsContract.methods.GET.response.parse(cappedRes.body.data)
    expect(cappedParsed).toHaveLength(100)
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
        exercise_id: 'treadmill',
        set_order: 2,
        duration_seconds: 1800,
        distance_km: 3.5,
        incline: 0,
        speed_kmh: 7,
      },
    })
    expect(res.status).toBe(200)
    const parsed = workoutSetsContract.methods.POST.response.parse(res.body.data)
    expect(parsed.set_number).toBe(2)
    expect(parsed).toMatchObject({
      exercise_id: 'treadmill',
      duration_seconds: 1800,
      distance_km: 3.5,
      incline: 0,
      speed_kmh: 7,
    })
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

  it('PUT returns 400 when id is missing', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSetsContract,
      method: 'PUT',
      handler: updateWorkoutSet,
      user: fakeUser,
      supabase,
      body: { reps: 7 },
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Set ID is required')
  })

  it('PUT ?id=missing returns 404', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSetsContract,
      method: 'PUT',
      handler: updateWorkoutSet,
      user: fakeUser,
      supabase,
      query: { id: 'set-missing' },
      body: { reps: 7 },
    })
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Workout set not found')
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

  it('DELETE returns 400 when no selector is provided', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSetsContract,
      method: 'DELETE',
      handler: deleteWorkoutSet,
      user: fakeUser,
      supabase,
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Set ID (or workoutId+exerciseId) is required')
  })

  it('DELETE ?id=missing returns 404', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSetsContract,
      method: 'DELETE',
      handler: deleteWorkoutSet,
      user: fakeUser,
      supabase,
      query: { id: 'set-missing' },
    })
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Workout set not found')
  })
})
