import { createServerFileRoute } from '@tanstack/react-start/server'
import { getSupabaseServerClient } from '../lib/supabase/server'

// OAuth callback for Supabase Auth.
//
// Supabase's PKCE flow redirects the browser here with `?code=...` after the
// user authorizes with the upstream provider (Google). We exchange the code
// for a session on the server so the auth cookies are written by the
// Supabase server client, then 302 the browser to the original destination.
//
// `?next=` lets the caller pick a post-login landing path; we default to `/`.
// The destination is restricted to same-origin paths (starts with `/` and not
// `//`) so this route can't be abused as an open redirect.

function sanitizeNext(raw: string | null): string {
  if (!raw) return '/'
  if (!raw.startsWith('/')) return '/'
  if (raw.startsWith('//')) return '/'
  return raw
}

function mergeSetCookies(target: Headers, source: Headers) {
  // Headers#getSetCookie exists in modern runtimes (Node 20+, Vercel Edge,
  // browsers). Fall back to the single `get('set-cookie')` for older shims.
  const getter = (source as unknown as { getSetCookie?: () => string[] }).getSetCookie
  if (typeof getter === 'function') {
    for (const cookie of getter.call(source)) {
      target.append('set-cookie', cookie)
    }
    return
  }
  const single = source.get('set-cookie')
  if (single) target.append('set-cookie', single)
}

export const ServerRoute = createServerFileRoute('/auth/callback').methods({
  GET: async ({ request }: { request: Request }) => {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const next = sanitizeNext(url.searchParams.get('next'))

    const { supabase, responseHeaders } = getSupabaseServerClient(request)

    if (!code) {
      // No code — bounce home. Could also render an error page later.
      const headers = new Headers({ location: next })
      mergeSetCookies(headers, responseHeaders)
      return new Response(null, { status: 302, headers })
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('Supabase exchangeCodeForSession failed:', error)
      const headers = new Headers({
        location: `/?auth_error=${encodeURIComponent(error.message)}`,
      })
      mergeSetCookies(headers, responseHeaders)
      return new Response(null, { status: 302, headers })
    }

    const headers = new Headers({ location: next })
    mergeSetCookies(headers, responseHeaders)
    return new Response(null, { status: 302, headers })
  },
})
