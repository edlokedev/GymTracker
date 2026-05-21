import { describe, expect, it } from 'vitest'
import {
  buildActiveFilterChips,
  filtersFromRouteSearch,
  routeSearchKey,
  routeSearchToNavigateSearch,
  toggleFilterValue,
} from './model'

describe('exercise library model', () => {
  it('normalizes route search into internal filters', () => {
    expect(
      filtersFromRouteSearch({
        category_id: ['strength', 'strength', 'mobility'],
        equipment: ['barbell', '', 'barbell'],
        muscle_group: ['chest', 'triceps', 'chest'],
        query: ' bench ',
      }),
    ).toEqual({
      categoryIds: ['strength', 'mobility'],
      equipment: ['barbell'],
      muscleGroups: ['chest', 'triceps'],
      query: ' bench ',
    })
  })

  it('uses a stable key for equivalent route search values', () => {
    expect(
      routeSearchKey({
        category_id: ['mobility', 'strength'],
        equipment: ['barbell'],
        muscle_group: ['chest', 'triceps'],
        query: 'bench',
      }),
    ).toBe(
      routeSearchKey({
        category_id: ['strength', 'mobility'],
        equipment: ['barbell'],
        muscle_group: ['triceps', 'chest'],
        query: 'bench',
      }),
    )
  })

  it('toggles filter values', () => {
    expect(toggleFilterValue(['barbell'], 'dumbbell')).toEqual(['barbell', 'dumbbell'])
    expect(toggleFilterValue(['barbell', 'dumbbell'], 'barbell')).toEqual(['dumbbell'])
  })

  it('builds active chips with display labels', () => {
    expect(
      buildActiveFilterChips(
        {
          categoryIds: ['strength'],
          equipment: ['body weight'],
          muscleGroups: ['chest'],
          query: 'push',
        },
        new Map([['strength', 'Strength']]),
      ),
    ).toEqual([
      { type: 'query', prefix: 'Search', label: 'push' },
      {
        type: 'category',
        prefix: 'Category',
        label: 'Strength',
        value: 'strength',
      },
      { type: 'muscle', prefix: 'Muscle', label: 'Chest', value: 'chest' },
      {
        type: 'equipment',
        prefix: 'Equipment',
        label: 'Body Weight',
        value: 'body weight',
      },
    ])
  })

  it('omits empty values from route navigation search', () => {
    expect(
      routeSearchToNavigateSearch({
        category_id: [],
        equipment: ['barbell'],
        muscle_group: [],
        query: '',
      }),
    ).toEqual({
      category_id: undefined,
      equipment: ['barbell'],
      muscle_group: undefined,
      query: undefined,
    })
  })
})
