import { describe, expect, it } from 'vitest'
import { filtersToApiSearchParams } from './client'

describe('exercise library client', () => {
  it('converts filters into exercise search params', () => {
    const params = filtersToApiSearchParams(
      {
        categoryIds: ['strength', 'mobility'],
        equipment: ['barbell'],
        muscleGroups: ['chest'],
        query: 'bench',
      },
      { limit: 20, offset: 40 },
    )

    expect(params.getAll('category_id')).toEqual(['strength', 'mobility'])
    expect(params.getAll('equipment')).toEqual(['barbell'])
    expect(params.getAll('muscle_group')).toEqual(['chest'])
    expect(params.get('query')).toBe('bench')
    expect(params.get('limit')).toBe('20')
    expect(params.get('offset')).toBe('40')
  })
})
