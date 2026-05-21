import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

// Browser-side Supabase client. Reads the public env vars (VITE_-prefixed) so
// they are inlined by Vite. Safe to call from React components / hooks.
//
// Do not use this on the server — server routes must derive auth from the
// request, not from a shared browser client. See ./server.ts.
let cachedClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseBrowserClient() {
  if (cachedClient) return cachedClient

  const url = import.meta.env.VITE_SUPABASE_URL
  // Prefer the new publishable-key naming; fall back to the legacy anon-key
  // env var so projects mid-migration keep working.
  const publishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !publishableKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY (legacy: VITE_SUPABASE_ANON_KEY). Set them in .env.',
    )
  }

  cachedClient = createBrowserClient<Database>(url, publishableKey)
  return cachedClient
}
