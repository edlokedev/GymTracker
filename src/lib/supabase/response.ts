// Shared helpers for stitching Supabase server-side response headers onto the
// outgoing Response. The Supabase server client may need to refresh auth
// cookies during a request — when it does, it writes them to the
// `responseHeaders` returned from `getSupabaseServerClient(request)`. Routes
// must merge those onto whatever headers they're returning so the refreshed
// session sticks on the browser.

export function mergeHeaders(...sources: Array<Headers | HeadersInit | undefined | null>): Headers {
  const out = new Headers()
  for (const source of sources) {
    if (!source) continue
    const headers = source instanceof Headers ? source : new Headers(source)
    headers.forEach((value, key) => {
      // `set-cookie` is the only header where we want to preserve multiple
      // entries. Everything else gets the last writer wins.
      if (key.toLowerCase() === 'set-cookie') {
        out.append('set-cookie', value)
      } else {
        out.set(key, value)
      }
    })
  }
  return out
}
