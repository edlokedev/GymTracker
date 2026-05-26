import { afterEach, describe, expect, it, vi } from 'vitest'

const serverMock = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getSupabaseServerClient: vi.fn(),
}))

vi.mock('../../src/lib/supabase/server', () => ({
  getSupabaseServerClient: serverMock.getSupabaseServerClient,
}))

import { getAuthCallback } from '../../src/routes/auth.callback'

function responseHeaders() {
  const headers = new Headers()
  headers.append('set-cookie', 'sb-session=abc; Path=/; HttpOnly')
  return headers
}

function arrangeSupabase(error: Error | null = null) {
  serverMock.exchangeCodeForSession.mockResolvedValue({ error })
  serverMock.getSupabaseServerClient.mockReturnValue({
    supabase: {
      auth: {
        exchangeCodeForSession: serverMock.exchangeCodeForSession,
      },
    },
    responseHeaders: responseHeaders(),
  })
}

async function runCallback(url: string) {
  return getAuthCallback({ request: new Request(url) })
}

describe('GET /auth/callback', () => {
  afterEach(() => {
    serverMock.exchangeCodeForSession.mockReset()
    serverMock.getSupabaseServerClient.mockReset()
    vi.restoreAllMocks()
  })

  it('exchanges the OAuth code, redirects to a same-origin next path, and preserves auth cookies', async () => {
    arrangeSupabase()

    const res = await runCallback(
      'http://test/auth/callback?code=oauth-code&next=%2Fworkout%3FsessionId%3Dsess-1',
    )

    expect(serverMock.exchangeCodeForSession).toHaveBeenCalledWith('oauth-code')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/workout?sessionId=sess-1')
    expect(res.headers.get('set-cookie')).toContain('sb-session=abc')
  })

  it('redirects without exchange when code is missing', async () => {
    arrangeSupabase()

    const res = await runCallback('http://test/auth/callback?next=%2Fhistory')

    expect(serverMock.exchangeCodeForSession).not.toHaveBeenCalled()
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/history')
    expect(res.headers.get('set-cookie')).toContain('sb-session=abc')
  })

  it.each(['https://evil.example/path', '//evil.example/path'])(
    'rejects unsafe next redirects: %s',
    async (next) => {
      arrangeSupabase()

      const res = await runCallback(
        `http://test/auth/callback?code=oauth-code&next=${encodeURIComponent(next)}`,
      )

      expect(serverMock.exchangeCodeForSession).toHaveBeenCalledWith('oauth-code')
      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe('/')
    },
  )

  it('redirects with an encoded auth_error when code exchange fails', async () => {
    const error = new Error('OAuth failed: bad token')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    arrangeSupabase(error)

    const res = await runCallback('http://test/auth/callback?code=bad-code&next=%2Fworkout')

    expect(serverMock.exchangeCodeForSession).toHaveBeenCalledWith('bad-code')
    expect(consoleError).toHaveBeenCalledWith('Supabase exchangeCodeForSession failed:', error)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/?auth_error=OAuth%20failed%3A%20bad%20token')
    expect(res.headers.get('set-cookie')).toContain('sb-session=abc')
  })
})
