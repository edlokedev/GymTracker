import { describe, expect, it } from 'vitest'
import {
  paginatedSessions,
  workoutSession,
  workoutSessionsContract,
  workoutWithDetails,
} from '../../src/lib/api/contracts/workout-sessions.contract'
import {
  createWorkoutSession,
  deleteWorkoutSession,
  getWorkoutSessions,
  patchWorkoutSession,
} from '../../src/routes/api.workout-sessions'
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
        name: 'Push Day',
        date: '2026-05-20',
        start_time: '2026-05-20T10:00:00Z',
        end_time: null,
        notes: null,
        created_at: '2026-05-20T10:00:00Z',
        updated_at: '2026-05-20T10:00:00Z',
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
    exercises: [
      {
        id: 'ex-1',
        name: 'Bench Press',
        category_id: 'cat-1',
        force: 'push',
        level: 'intermediate',
        mechanic: 'compound',
        equipment: 'barbell',
        primary_muscles: ['chest'],
        secondary_muscles: ['triceps'],
        instructions: ['Lie down', 'Lift'],
        gif_path: null,
        preview_image_path: null,
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
        exercise_categories: { name: 'Chest' },
      },
    ],
  }
}

describe('/api/workout-sessions', () => {
  it('GET ?id=… returns the "one" shape', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSessionsContract,
      method: 'GET',
      handler: getWorkoutSessions,
      user: fakeUser,
      supabase,
      query: { id: 'sess-1' },
    })
    expect(res.status).toBe(200)
    const parsed = workoutSession.parse(res.body.data)
    expect(parsed.id).toBe('sess-1')
  })

  it('GET ?id=…&includeDetails=true returns the "detail" shape', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSessionsContract,
      method: 'GET',
      handler: getWorkoutSessions,
      user: fakeUser,
      supabase,
      query: { id: 'sess-1', includeDetails: 'true' },
    })
    expect(res.status).toBe(200)
    const parsed = workoutWithDetails.parse(res.body.data)
    expect(parsed.exercises).toHaveLength(1)
    expect(parsed.exercises[0].exercise.name).toBe('Bench Press')
  })

  it('GET (no id) returns the "list" (paginated) shape', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSessionsContract,
      method: 'GET',
      handler: getWorkoutSessions,
      user: fakeUser,
      supabase,
    })
    expect(res.status).toBe(200)
    const parsed = paginatedSessions.parse(res.body.data)
    expect(parsed.data).toHaveLength(1)
    expect(parsed.total).toBe(1)
  })

  it('GET returns 401 anonymously', async () => {
    const supabase = stubSupabase(fixtures())
    const res = await runRoute({
      contract: workoutSessionsContract,
      method: 'GET',
      handler: getWorkoutSessions,
      user: null,
      supabase,
      query: { id: 'sess-1' },
    })
    expect(res.status).toBe(401)
  })

  it('GET ?id=missing returns 404', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSessionsContract,
      method: 'GET',
      handler: getWorkoutSessions,
      user: fakeUser,
      supabase,
      query: { id: 'sess-missing' },
    })
    expect(res.status).toBe(404)
  })

  it('POST creates a session for the authenticated user', async () => {
    const supabase = stubSupabase(
      { workout_sessions: [], workout_sets: [] },
      { userId: fakeUser.id, parentRefs },
    )
    const res = await runRoute({
      contract: workoutSessionsContract,
      method: 'POST',
      handler: createWorkoutSession,
      user: fakeUser,
      supabase,
      body: { name: 'Pull Day' },
    })
    expect(res.status).toBe(200)
    const parsed = workoutSession.parse(res.body.data)
    expect(parsed.name).toBe('Pull Day')
    expect(parsed.user_id).toBe(fakeUser.id)
  })

  it('PATCH ?id=… without action updates the session', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSessionsContract,
      method: 'PATCH',
      handler: patchWorkoutSession,
      user: fakeUser,
      supabase,
      query: { id: 'sess-1' },
      body: { notes: 'Felt strong' },
    })
    expect(res.status).toBe(200)
    const parsed = workoutSession.parse(res.body.data)
    expect(parsed.notes).toBe('Felt strong')
  })

  it('PATCH returns 400 when id is missing', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSessionsContract,
      method: 'PATCH',
      handler: patchWorkoutSession,
      user: fakeUser,
      supabase,
      body: { notes: 'no id' },
    })
    expect(res.status).toBe(400)
  })

  it('DELETE ?id=… returns {}', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSessionsContract,
      method: 'DELETE',
      handler: deleteWorkoutSession,
      user: fakeUser,
      supabase,
      query: { id: 'sess-1' },
    })
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({})
  })

  it('DELETE ?id=missing returns 404', async () => {
    const supabase = stubSupabase(fixtures(), { userId: fakeUser.id, parentRefs })
    const res = await runRoute({
      contract: workoutSessionsContract,
      method: 'DELETE',
      handler: deleteWorkoutSession,
      user: fakeUser,
      supabase,
      query: { id: 'sess-missing' },
    })
    expect(res.status).toBe(404)
  })
})
