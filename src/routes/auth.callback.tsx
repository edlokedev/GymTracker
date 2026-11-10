import { createServerFileRoute } from '@tanstack/react-start/server'
import { mergeSetCookies } from '../lib/api/cookies'
import { getSupabaseServerClient } from '../lib/supabase/server'

// OAuth callback for Supabase Auth.
//
// Supabase's PKCE flow redirects the browser here with `?code=...` after the
// user authorizes with the upstream provider (Google). We exchange the code
// for a session on the server so the auth cookies are written by the
// Supabase server client, then 302 the browser to the original destination.
//
// `?next=` lets the caller pick a post-login landing path; we default to `/`.
// The destination is restricted to same-origin paths (resolved against the request origin) so this route can't be abused as an open redirect.
//
// This route deliberately stays outside definePrivateRoute / definePublicRoute
// because it returns 302 redirects, not JSON. Cookie merging is the only thing
// it shares with the JSON routes, so it imports `mergeSetCookies` from the
// shared module rather than reimplementing it inline.

function sanitizeNext(raw: string | null, requestOrigin: string): string {
  if (!raw) return '/'
  // Resolve with the WHATWG parser so tab/newline stripping and backslash
  // normalisation are applied exactly as a browser would, then require the
  // result to stay on our origin.
  let resolved: URL
  try {
    resolved = new URL(raw, requestOrigin)
  } catch {
    return '/'
  }
  if (resolved.origin !== requestOrigin) return '/'
  return resolved.pathname + resolved.search + resolved.hash
}

export async function getAuthCallback({ request }: { request: Request }) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = sanitizeNext(url.searchParams.get('next'), url.origin)

  const { supabase, responseHeaders } = getSupabaseServerClient(request)

  if (!code) {
    // No code - bounce home. Could also render an error page later.
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
}

export const ServerRoute = createServerFileRoute('/auth/callback').methods({
  GET: getAuthCallback,
})
