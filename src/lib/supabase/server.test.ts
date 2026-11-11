import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuthenticatedUser, parseCookieHeader } from './server'

const auth = vi.hoisted(() => ({ getClaims: vi.fn(), getUser: vi.fn() }))

vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth }) }))
vi.mock('../env', () => ({
  env: { SUPABASE_URL: 'https://example.test', SUPABASE_PUBLISHABLE_KEY: 'test-key' },
}))

describe('getAuthenticatedUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns only the verified subject without calling getUser', async () => {
    auth.getClaims.mockResolvedValue({
      data: { claims: { sub: 'user-1', email: 'x@example.test' } },
      error: null,
    })
    const result = await getAuthenticatedUser(new Request('http://test'))
    expect(result.user).toEqual({ id: 'user-1' })
    expect(result.supabase.auth).toBe(auth)
    expect(result.responseHeaders).toBeInstanceOf(Headers)
    expect(auth.getUser).not.toHaveBeenCalled()
  })

  it.each([
    [
      'verification error',
      { data: { claims: { sub: 'user-1' } }, error: new Error('invalid token') },
    ],
    ['missing claims', { data: null, error: null }],
    ['missing subject', { data: { claims: {} }, error: null }],
    ['empty subject', { data: { claims: { sub: '' } }, error: null }],
  ])('rejects %s', async (_case, claimsResult) => {
    auth.getClaims.mockResolvedValue(claimsResult)
    const result = await getAuthenticatedUser(new Request('http://test'))
    expect(result.user).toBeNull()
    expect(result.supabase.auth).toBe(auth)
    expect(result.responseHeaders).toBeInstanceOf(Headers)
  })
})

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
