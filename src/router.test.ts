import { describe, expect, it } from 'vitest'
import { createRouter } from './router'
import { Route } from './routes/exercises'

function roundTrip(search: Record<string, unknown>): Record<string, unknown> {
  const { parseSearch, stringifySearch } = createRouter().options
  if (!parseSearch || !stringifySearch) throw new Error('router search codecs missing')
  return parseSearch(stringifySearch(search))
}

describe('router search round trip', () => {
  it.each([
    '100',
    'true',
    'null',
    '1e3',
    '1.0',
    '007',
    'bench press',
  ])('keeps the search string %s as a string', (query) => {
    expect(roundTrip({ query })).toEqual({ query })
  })

  it('keeps repeated keys as arrays of strings', () => {
    expect(roundTrip({ equipment: ['1', 'true'] })).toEqual({ equipment: ['1', 'true'] })
  })

  it('exercises validateSearch keeps numeric, true and null query text', () => {
    const validate = Route.options.validateSearch as (s: Record<string, unknown>) => {
      query: string
      favourites?: boolean
    }
    for (const query of ['100', 'true', 'null']) {
      expect(validate(roundTrip({ query })).query).toBe(query)
    }
    expect(validate(roundTrip({ favourites: true })).favourites).toBe(true)
  })
})
