import type { User } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { makePrivateMethod } from './define-private-route'
import { makePublicMethod } from './define-public-route'
import { badRequest, forbidden, NotFoundError } from './errors'

// Minimal fake user / supabase. The handlers we test never call .from() — we
// only verify wrapper behavior (gate, envelope, error mapping, cookies).
const fakeUser = { id: 'u-1', email: 'x@example.test' } as unknown as User
// biome-ignore lint/suspicious/noExplicitAny: minimal stub for handler tests
const fakeSupabase = {} as any

function fakeRequest(url = 'http://test/api/x') {
  return new Request(url)
}

function authedResolver(opts: { cookie?: string } = {}) {
  return async (_req: Request) => {
    const responseHeaders = new Headers()
    if (opts.cookie) responseHeaders.append('set-cookie', opts.cookie)
    return { user: fakeUser, supabase: fakeSupabase, responseHeaders }
  }
}

function anonResolver() {
  return async (_req: Request) => ({
    user: null,
    supabase: fakeSupabase,
    responseHeaders: new Headers(),
  })
}

function publicResolver(opts: { cookie?: string } = {}) {
  return (_req: Request) => {
    const responseHeaders = new Headers()
    if (opts.cookie) responseHeaders.append('set-cookie', opts.cookie)
    return { supabase: fakeSupabase, responseHeaders }
  }
}

describe('makePrivateMethod (auth gate)', () => {
  it('returns 401 envelope when the user is anonymous', async () => {
    const run = makePrivateMethod(async () => ({ should: 'not-run' }), anonResolver(), 'GET /x')
    const res = await run({ request: fakeRequest() })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ success: false, error: 'Unauthorized' })
  })

  it('does not invoke the handler on anonymous requests', async () => {
    const handler = vi.fn(async () => ({ ok: true }))
    const run = makePrivateMethod(handler, anonResolver(), 'GET /x')
    await run({ request: fakeRequest() })
    expect(handler).not.toHaveBeenCalled()
  })

  it('passes the authenticated user, url, and params to the handler', async () => {
    const handler = vi.fn(async (ctx) => {
      expect(ctx.user).toBe(fakeUser)
      expect(ctx.url.searchParams.get('id')).toBe('abc')
      expect(ctx.params).toEqual({ slug: 'foo' })
      return { id: 'abc' }
    })
    const run = makePrivateMethod(handler, authedResolver(), 'GET /x')
    const res = await run({
      request: fakeRequest('http://test/api/x?id=abc'),
      params: { slug: 'foo' },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: { id: 'abc' } })
    expect(handler).toHaveBeenCalledOnce()
  })
})

describe('makePrivateMethod (envelope)', () => {
  it('wraps success in { success: true, data }', async () => {
    const run = makePrivateMethod(async () => [1, 2, 3], authedResolver(), 'GET /x')
    const res = await run({ request: fakeRequest() })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: [1, 2, 3] })
  })

  it('maps NotFoundError thrown by handler to 404 envelope', async () => {
    const run = makePrivateMethod(
      async () => {
        throw new NotFoundError('session')
      },
      authedResolver(),
      'GET /x',
    )
    const res = await run({ request: fakeRequest() })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ success: false, error: 'session' })
  })

  it('maps ForbiddenError to 403 envelope', async () => {
    const run = makePrivateMethod(
      async () => {
        forbidden('rls')
      },
      authedResolver(),
      'GET /x',
    )
    const res = await run({ request: fakeRequest() })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ success: false, error: 'rls' })
  })

  it('maps BadRequestError to 400 envelope', async () => {
    const run = makePrivateMethod(
      async () => {
        badRequest('id required')
      },
      authedResolver(),
      'GET /x',
    )
    const res = await run({ request: fakeRequest() })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ success: false, error: 'id required' })
  })

  it('maps unknown errors to a generic 500 envelope (no leak)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const run = makePrivateMethod(
      async () => {
        throw new Error('internal stack trace text')
      },
      authedResolver(),
      'GET /x',
    )
    const res = await run({ request: fakeRequest() })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ success: false, error: 'Internal server error' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('makePrivateMethod (cookie merge)', () => {
  it('appends refreshed set-cookie entries onto the success response', async () => {
    const run = makePrivateMethod(
      async () => ({ ok: true }),
      authedResolver({ cookie: 'sb-x=1; Path=/' }),
      'GET /x',
    )
    const res = await run({ request: fakeRequest() })
    const cookies =
      (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? []
    expect(cookies.some((c) => c.includes('sb-x=1'))).toBe(true)
  })

  it('appends refreshed set-cookie entries onto a 401 response', async () => {
    const resolver = async (_req: Request) => {
      const responseHeaders = new Headers()
      responseHeaders.append('set-cookie', 'sb-y=2; Path=/')
      return { user: null, supabase: fakeSupabase, responseHeaders }
    }
    const run = makePrivateMethod(async () => ({}), resolver, 'GET /x')
    const res = await run({ request: fakeRequest() })
    expect(res.status).toBe(401)
    const cookies =
      (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? []
    expect(cookies.some((c) => c.includes('sb-y=2'))).toBe(true)
  })
})

describe('makePublicMethod', () => {
  it('wraps success without requiring auth', async () => {
    const run = makePublicMethod(async () => ['a', 'b'], publicResolver(), 'GET /x')
    const res = await run({ request: fakeRequest() })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: ['a', 'b'] })
  })

  it('maps thrown typed errors the same way as the private runner', async () => {
    const run = makePublicMethod(
      async () => {
        throw new NotFoundError('catalog row')
      },
      publicResolver(),
      'GET /x',
    )
    const res = await run({ request: fakeRequest() })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ success: false, error: 'catalog row' })
  })

  it('merges refreshed cookies onto the response', async () => {
    const run = makePublicMethod(
      async () => 1,
      publicResolver({ cookie: 'sb-z=3; Path=/' }),
      'GET /x',
    )
    const res = await run({ request: fakeRequest() })
    const cookies =
      (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? []
    expect(cookies.some((c) => c.includes('sb-z=3'))).toBe(true)
  })
})
