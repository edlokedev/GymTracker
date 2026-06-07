import { describe, expect, it } from 'vitest'
import type { WorkoutSession, WorkoutTemplate } from '@/lib/types/database'
import { getNextWorkoutRecommendation } from './model'

function session(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 'session-1',
    user_id: 'user-1',
    name: 'Push Day',
    date: '2026-06-01',
    start_time: '2026-06-01T10:00:00.000Z',
    created_at: new Date('2026-06-01T10:00:00.000Z'),
    updated_at: new Date('2026-06-01T10:00:00.000Z'),
    ...overrides,
  }
}

function template(overrides: Partial<WorkoutTemplate> = {}): WorkoutTemplate {
  return {
    id: 'template-1',
    user_id: 'user-1',
    name: 'Push Day',
    is_archived: false,
    created_at: new Date('2026-05-01T10:00:00.000Z'),
    updated_at: new Date('2026-05-01T10:00:00.000Z'),
    ...overrides,
  }
}

describe('getNextWorkoutRecommendation', () => {
  it('returns starter when no history and no templates exist', () => {
    expect(getNextWorkoutRecommendation({ templates: [], recentSessions: [] })).toEqual({
      type: 'starter',
      title: 'Start your first workout',
      reason: 'No workouts logged yet.',
      ctaLabel: 'Start Workout',
    })
  })

  it('does not recommend repeating history when no saved workouts exist', () => {
    expect(
      getNextWorkoutRecommendation({
        templates: [],
        recentSessions: [session({ id: 'last-session', name: 'Pull Day' })],
      }),
    ).toEqual({
      type: 'starter',
      title: 'Start a workout',
      reason: 'Start from Workouts or log from scratch.',
      ctaLabel: 'Start Workout',
    })
  })

  it('uses least recently used active template when usage exists', () => {
    expect(
      getNextWorkoutRecommendation({
        templates: [
          template({
            id: 'recent',
            name: 'Push Day',
            last_used_at: '2026-06-02T10:00:00.000Z',
          }),
          template({
            id: 'old',
            name: 'Pull Day',
            last_used_at: '2026-05-30T10:00:00.000Z',
          }),
        ],
        recentSessions: [session()],
      }),
    ).toMatchObject({
      type: 'template',
      title: 'Start Pull Day',
      templateId: 'old',
    })
  })

  it('uses most recently created template when none has usage', () => {
    expect(
      getNextWorkoutRecommendation({
        templates: [
          template({ id: 'older', name: 'Push Day', created_at: new Date('2026-05-01') }),
          template({ id: 'newer', name: 'Leg Day', created_at: new Date('2026-05-03') }),
        ],
        recentSessions: [],
      }),
    ).toMatchObject({
      type: 'template',
      title: 'Start Leg Day',
      templateId: 'newer',
    })
  })
})
