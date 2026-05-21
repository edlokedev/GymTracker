import { describe, expect, it } from 'vitest'
import type { WorkoutSession } from '@/lib/types/database'
import {
  getDeleteCandidateLabel,
  getLastWorkoutDate,
  getTimeSinceLastWorkout,
  removeSessionById,
} from './model'

const makeSession = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 'session-1',
  user_id: 'user-1',
  name: 'Push Day',
  date: '2026-05-10',
  start_time: '2026-05-10T10:00:00.000Z',
  created_at: new Date('2026-05-10T10:00:00.000Z'),
  updated_at: new Date('2026-05-10T10:00:00.000Z'),
  ...overrides,
})

describe('workout history model', () => {
  it('removes sessions by id without mutating other sessions', () => {
    const sessions = [makeSession(), makeSession({ id: 'session-2', name: 'Pull Day' })]

    expect(removeSessionById(sessions, 'session-1')).toEqual([sessions[1]])
  })

  it('builds friendly delete labels', () => {
    expect(getDeleteCandidateLabel(makeSession({ name: '  Leg Day  ' }))).toBe('Leg Day')
    expect(getDeleteCandidateLabel(makeSession({ name: undefined }))).toBe(
      'workout from Sunday, May 10, 2026',
    )
    expect(getDeleteCandidateLabel(null)).toBe('this workout')
  })

  it('derives last workout date and relative label from ordered sessions', () => {
    const lastWorkout = getLastWorkoutDate([makeSession({ date: '2026-05-14' })])

    expect(lastWorkout?.toISOString()).toContain('2026-05-14')
    expect(getTimeSinceLastWorkout(lastWorkout, new Date('2026-05-15T12:00:00.000Z'))).toBe(
      '1 day ago',
    )
  })
})
