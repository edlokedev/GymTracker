// Shared header-merging helper. The Supabase server client writes refreshed
// auth cookies onto a `responseHeaders` Headers object during a request; that
// Headers object must be folded onto every outgoing Response so refreshed
// sessions persist on the browser.
//
// `set-cookie` is special: multiple set-cookie entries must each survive,
// rather than the last writer winning. All other headers follow last-writer
// semantics.
//
// This module supersedes src/lib/supabase/response.ts (mergeHeaders), kept
// during migration; once every route has migrated to the deepened module,
// the old file is deleted.

export function mergeHeaders(...sources: Array<Headers | HeadersInit | undefined | null>): Headers {
  const out = new Headers()
  for (const source of sources) {
    if (!source) continue
    const headers = source instanceof Headers ? source : new Headers(source)
    headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        out.append('set-cookie', value)
      } else {
        out.set(key, value)
      }
    })
  }
  return out
}

// Merge every set-cookie entry from `source` onto `target`. Used by
// auth.callback.tsx where the caller already owns a redirect Headers object
// and just needs to append cookies onto it.
export function mergeSetCookies(target: Headers, source: Headers): void {
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
