import { describe, expect, it } from 'vitest'
import { BadRequestError } from './errors'
import { parseIntParam } from './params'

const limit = { name: 'limit', defaultValue: 20, min: 1, max: 100 }

describe('parseIntParam', () => {
  it('returns the default for a missing or empty value', () => {
    expect(parseIntParam(null, limit)).toBe(20)
    expect(parseIntParam('', limit)).toBe(20)
  })

  it('parses valid integers', () => {
    expect(parseIntParam('5', limit)).toBe(5)
    expect(parseIntParam('100', limit)).toBe(100)
  })

  it('clamps values above max', () => {
    expect(parseIntParam('5000', limit)).toBe(100)
  })

  it.each([
    '0',
    '-3',
    'abc',
    '1.5',
    '10x',
    'NaN',
    '1e3',
  ])('rejects %s with BadRequestError', (v) => {
    expect(() => parseIntParam(v, limit)).toThrow(BadRequestError)
  })

  it('allows 0 when min is 0 (offset)', () => {
    expect(parseIntParam('0', { name: 'offset', defaultValue: 0, min: 0, max: 100000 })).toBe(0)
  })
})
