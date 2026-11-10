import { describe, expect, it } from 'vitest'
import { parseCookieHeader } from './server'

describe('parseCookieHeader', () => {
  it('decodes percent-encoded values', () => {
    expect(parseCookieHeader('a=hello%20world; b=2')).toEqual({ a: 'hello world', b: '2' })
  })

  it('does not throw on a malformed percent sequence and keeps the raw value', () => {
    expect(parseCookieHeader('bad=%E0%A4%A; good=ok')).toEqual({ bad: '%E0%A4%A', good: 'ok' })
  })

  it('returns an empty object for a missing header', () => {
    expect(parseCookieHeader(null)).toEqual({})
  })
})
