import { describe, expect, it } from 'vitest'
import { mergeHeaders, mergeSetCookies } from './cookies'

describe('mergeHeaders', () => {
  it('uses last-writer-wins for non set-cookie headers', () => {
    const out = mergeHeaders({ 'x-test': 'a' }, { 'x-test': 'b' })
    expect(out.get('x-test')).toBe('b')
  })

  it('preserves every set-cookie entry across sources', () => {
    const a = new Headers()
    a.append('set-cookie', 'one=1; Path=/')
    const b = new Headers()
    b.append('set-cookie', 'two=2; Path=/')
    const out = mergeHeaders(a, b)
    const cookies = (out as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? []
    expect(cookies.length).toBeGreaterThanOrEqual(2)
  })

  it('tolerates null/undefined sources', () => {
    const out = mergeHeaders(null, undefined, { 'x-y': 'z' })
    expect(out.get('x-y')).toBe('z')
  })
})

describe('mergeSetCookies', () => {
  it('appends every set-cookie from source onto target', () => {
    const source = new Headers()
    source.append('set-cookie', 'a=1; Path=/')
    source.append('set-cookie', 'b=2; Path=/')
    const target = new Headers({ location: '/' })
    mergeSetCookies(target, source)
    const cookies = (target as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? []
    expect(cookies.length).toBeGreaterThanOrEqual(2)
    expect(target.get('location')).toBe('/')
  })
})
