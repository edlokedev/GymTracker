import { describe, expect, it } from 'vitest'
import { queryKeys } from './query-keys'

describe('queryKeys factories', () => {
  it('produce stable keys for equal inputs', () => {
    expect(queryKeys.calendar.data('2026-07')).toEqual(queryKeys.calendar.data('2026-07'))
    expect(queryKeys.workoutSessions.detail('s1')).toEqual(queryKeys.workoutSessions.detail('s1'))
    expect(queryKeys.exercises.search({ query: 'bench' })).toEqual(
      queryKeys.exercises.search({ query: 'bench' }),
    )
  })

  it('vary the key when inputs differ', () => {
    expect(queryKeys.calendar.data('2026-07')).not.toEqual(queryKeys.calendar.data('2026-08'))
    expect(queryKeys.workoutSets.history('e1')).not.toEqual(queryKeys.workoutSets.history('e2'))
  })

  it('nest every domain query under its `all` root for prefix invalidation', () => {
    expect(queryKeys.calendar.data('2026-07')[0]).toBe(queryKeys.calendar.all[0])
    expect(queryKeys.calendar.day('2026-07-04')[0]).toBe(queryKeys.calendar.all[0])
    expect(queryKeys.workoutSessions.list()[0]).toBe(queryKeys.workoutSessions.all[0])
    expect(queryKeys.workoutSessions.detail('s1')[0]).toBe(queryKeys.workoutSessions.all[0])
    expect(queryKeys.exercises.favourites()[0]).toBe(queryKeys.exercises.all[0])
    expect(queryKeys.exercises.facets()[0]).toBe(queryKeys.exercises.all[0])
    expect(queryKeys.workoutTemplates.detail('t1')[0]).toBe(queryKeys.workoutTemplates.all[0])
    expect(queryKeys.progress.data()[0]).toBe(queryKeys.progress.all[0])
    expect(queryKeys.locations.list()[0]).toBe(queryKeys.locations.all[0])
  })

  it('cover the full key surface from the migration plan', () => {
    expect(queryKeys.calendar.data('2026-07')).toEqual(['calendar', 'data', { month: '2026-07' }])
    expect(queryKeys.workoutSessions.list({ limit: 20 })).toEqual([
      'workout-sessions',
      'list',
      { limit: 20 },
    ])
    expect(queryKeys.workoutSets.history('e1')).toEqual(['workout-sets', 'history', 'e1'])
    expect(queryKeys.exercises.recent()).toEqual(['exercises', 'recent'])
    expect(queryKeys.exercises.suggestions()).toEqual(['exercises', 'suggestions'])
    expect(queryKeys.workoutTemplates.list()).toEqual(['workout-templates', 'list'])
    expect(queryKeys.locations.list()).toEqual(['workout-locations'])
  })
})
