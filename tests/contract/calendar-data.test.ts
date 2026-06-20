import { describe, expect, it } from 'vitest'
import { calendarDataContract } from '../../src/lib/api/contracts/calendar-data.contract'
import { getCalendarData } from '../../src/routes/api.calendar-data'
import { fakeUser, runRoute } from './run-route'
import { stubSupabase } from './stub-supabase'

describe('GET /api/calendar-data', () => {
  it('returns workouts + summary + dateRange (happy path)', async () => {
    const supabase = stubSupabase(
      {
        workout_sessions: [
          {
            id: 'sess-1',
            user_id: fakeUser.id,
            date: '2026-05-20',
            start_time: '2026-05-20T10:00:00Z',
            end_time: '2026-05-20T11:00:00Z',
          },
        ],
        workout_sets: [
          {
            id: 'set-1',
            workout_id: 'sess-1',
            exercise_id: 'ex-1',
            weight: 100,
            reps: 5,
          },
        ],
      },
      { userId: fakeUser.id },
    )
    const res = await runRoute({
      contract: calendarDataContract,
      method: 'GET',
      handler: getCalendarData,
      user: fakeUser,
      supabase,
      query: { start: '2026-05-19', end: '2026-05-21', today: '2026-05-20' },
    })
    expect(res.status).toBe(200)
    const parsed = calendarDataContract.methods.GET.response.parse(res.body.data)
    expect(parsed.summary.totalWorkouts).toBe(1)
    expect(parsed.dateRange.start).toBe('2026-05-19')
  })

  it('rejects a partial date window (only one of start/end)', async () => {
    const supabase = stubSupabase(
      { workout_sessions: [], workout_sets: [] },
      { userId: fakeUser.id },
    )
    const res = await runRoute({
      contract: calendarDataContract,
      method: 'GET',
      handler: getCalendarData,
      user: fakeUser,
      supabase,
      query: { start: '2026-05-19' },
    })
    expect(res.status).toBe(400)
  })

  it('rejects a non-calendar date param', async () => {
    const supabase = stubSupabase(
      { workout_sessions: [], workout_sets: [] },
      { userId: fakeUser.id },
    )
    const res = await runRoute({
      contract: calendarDataContract,
      method: 'GET',
      handler: getCalendarData,
      user: fakeUser,
      supabase,
      query: { start: '2026-05-19T00:00:00Z', end: '2026-05-21' },
    })
    expect(res.status).toBe(400)
  })

  it('returns 401 anonymously', async () => {
    const supabase = stubSupabase({ workout_sessions: [], workout_sets: [] })
    const res = await runRoute({
      contract: calendarDataContract,
      method: 'GET',
      handler: getCalendarData,
      user: null,
      supabase,
    })
    expect(res.status).toBe(401)
  })
})
