import { type CookieOptions, createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { env } from '../env'
import type { Database } from './database.types'

// Server-side Supabase clients for use inside TanStack Start server routes.
//
// `getSupabaseServerClient(request)` returns a request-scoped client that
// reads/writes the Supabase auth cookies from the incoming Request and any
// outgoing Response headers we collect. The returned `responseHeaders` should
// be merged onto the route's Response so refreshed sessions stick.
//
// `getSupabaseServiceRoleClient()` returns a stateless client backed by the
// service role key. It bypasses RLS — only call it from server-only code
// paths like seed scripts or admin operations.
//
// Never trust a client-provided userId. Derive identity from
// `supabase.auth.getUser()` on the request-scoped client instead.

export type SupabaseServerContext = {
  supabase: ReturnType<typeof createServerClient<Database>>
  responseHeaders: Headers
}

function parseCookieHeader(header: string | null): Record<string, string> {
  if (!header) return {}
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const [rawName, ...rest] = part.split('=')
    if (!rawName) continue
    const name = rawName.trim()
    if (!name) continue
    out[name] = decodeURIComponent(rest.join('=').trim())
  }
  return out
}

function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const segments = [`${name}=${encodeURIComponent(value)}`]
  if (options.maxAge != null) segments.push(`Max-Age=${Math.floor(options.maxAge)}`)
  if (options.domain) segments.push(`Domain=${options.domain}`)
  if (options.path) segments.push(`Path=${options.path}`)
  else segments.push('Path=/')
  if (options.expires) segments.push(`Expires=${options.expires.toUTCString()}`)
  if (options.httpOnly) segments.push('HttpOnly')
  if (options.secure) segments.push('Secure')
  if (options.sameSite) {
    const s = options.sameSite
    const v = typeof s === 'string' ? s : s ? 'Strict' : 'Lax'
    segments.push(`SameSite=${v[0].toUpperCase()}${v.slice(1).toLowerCase()}`)
  }
  return segments.join('; ')
}

export function getSupabaseServerClient(request: Request): SupabaseServerContext {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY (legacy: SUPABASE_ANON_KEY) in the server environment.',
    )
  }

  const cookies = parseCookieHeader(request.headers.get('cookie'))
  const responseHeaders = new Headers()

  const supabase = createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      get(name: string) {
        return cookies[name]
      },
      set(name: string, value: string, options: CookieOptions) {
        cookies[name] = value
        responseHeaders.append('set-cookie', serializeCookie(name, value, options))
      },
      remove(name: string, options: CookieOptions) {
        delete cookies[name]
        responseHeaders.append('set-cookie', serializeCookie(name, '', { ...options, maxAge: 0 }))
      },
    },
  })

  return { supabase, responseHeaders }
}

let cachedServiceRole: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseServiceRoleClient() {
  if (cachedServiceRole) return cachedServiceRole
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SECRET_KEY (legacy: SUPABASE_SERVICE_ROLE_KEY) in the server environment.',
    )
  }
  cachedServiceRole = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cachedServiceRole
}

// Resolve the authenticated Supabase user for a request. Returns null when no
// valid session is present. Use this in private server routes instead of
// trusting a userId from the request body or query string.
export async function getAuthenticatedUser(request: Request) {
  const { supabase, responseHeaders } = getSupabaseServerClient(request)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return { user: null, supabase, responseHeaders }
  return { user: data.user, supabase, responseHeaders }
}
