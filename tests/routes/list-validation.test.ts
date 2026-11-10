import { describe, expect, it } from 'vitest'
import { calendarDataContract } from '../../src/lib/api/contracts/calendar-data.contract'
import { exercisesSearchContract } from '../../src/lib/api/contracts/exercises.search.contract'
import { progressContract } from '../../src/lib/api/contracts/progress.contract'
import { workoutSessionsContract } from '../../src/lib/api/contracts/workout-sessions.contract'
import { getCalendarData } from '../../src/routes/api.calendar-data'
import { searchExercises } from '../../src/routes/api.exercises.search'
import { getProgress } from '../../src/routes/api.progress'
import {
  createWorkoutSession,
  getWorkoutSessions,
  patchWorkoutSession,
} from '../../src/routes/api.workout-sessions'
import { fakeUser, runRoute } from '../contract/run-route'
import { stubSupabase } from '../contract/stub-supabase'

const emptyDb = () => stubSupabase({}, { userId: fakeUser.id })

describe('list route input validation', () => {
  it.each([
    ['limit=0', { limit: '0' }],
    ['limit=abc', { limit: 'abc' }],
    ['offset=-1', { offset: '-1' }],
  ])('GET /api/exercises/search rejects %s with 400', async (_label, query) => {
    const res = await runRoute({
      contract: exercisesSearchContract,
      method: 'GET',
      handler: searchExercises,
      isPublic: true,
      supabase: emptyDb(),
      query,
    })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it.each([
    ['limit=0', { limit: '0' }],
    ['limit=NaN', { limit: 'NaN' }],
    ['offset=abc', { offset: 'abc' }],
  ])('GET /api/workout-sessions rejects %s with 400', async (_label, query) => {
    const res = await runRoute({
      contract: workoutSessionsContract,
      method: 'GET',
      handler: getWorkoutSessions,
      user: fakeUser,
      supabase: emptyDb(),
      query,
    })
    expect(res.status).toBe(400)
  })

  it('GET /api/progress rejects limit=0 with 400', async () => {
    const res = await runRoute({
      contract: progressContract,
      method: 'GET',
      handler: getProgress,
      user: fakeUser,
      supabase: emptyDb(),
      query: { startDate: '2026-05-01', endDate: '2026-05-31', limit: '0' },
    })
    expect(res.status).toBe(400)
  })

  it('GET /api/calendar-data rejects start after end with 400', async () => {
    const res = await runRoute({
      contract: calendarDataContract,
      method: 'GET',
      handler: getCalendarData,
      user: fakeUser,
      supabase: emptyDb(),
      query: { start: '2026-05-21', end: '2026-05-19', today: '2026-05-20' },
    })
    expect(res.status).toBe(400)
  })

  it('GET /api/calendar-data rejects an unbounded window with 400', async () => {
    const res = await runRoute({
      contract: calendarDataContract,
      method: 'GET',
      handler: getCalendarData,
      user: fakeUser,
      supabase: emptyDb(),
      query: { start: '1900-01-01', end: '2026-05-20', today: '2026-05-20' },
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/workout-sessions rejects a non-string location_name with 400', async () => {
    const res = await runRoute({
      contract: workoutSessionsContract,
      method: 'POST',
      handler: createWorkoutSession,
      user: fakeUser,
      supabase: emptyDb(),
      body: { date: '2026-05-20', location_name: 123 },
    })
    expect(res.status).toBe(400)
  })

  it('PATCH /api/workout-sessions rejects a non-string location_name with 400', async () => {
    const res = await runRoute({
      contract: workoutSessionsContract,
      method: 'PATCH',
      handler: patchWorkoutSession,
      user: fakeUser,
      supabase: emptyDb(),
      query: { id: 'sess-1' },
      body: { location_name: { a: 1 } },
    })
    expect(res.status).toBe(400)
  })
})
