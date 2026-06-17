// Tiny client-side GET cache + in-flight de-duplication for idempotent,
// effectively-static reads (the public Exercise Catalog facets). Two wins the
// HTTP cache (P3 `Cache-Control`) cannot give on its own:
//   1. de-dupes concurrent identical requests into a single in-flight promise,
//      so two pickers mounting at once don't double-fetch the catalog facets;
//   2. skips the fetch + envelope parse entirely on repeat reads within the TTL.
//
// Scope is deliberately narrow: ONLY static catalog/facet data belongs here.
// User-specific data (workouts, calendar, history) is intentionally NOT cached
// this way — it needs mutation-driven invalidation, which belongs in the
// planned TanStack Query adoption, not a hand-rolled map (stale-after-edit bugs).

interface CacheEntry {
  expiresAt: number
  data: unknown
}

const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<unknown>>()

// Cache key by request URL. Returns the cached value if still fresh, joins an
// in-flight request for the same key if one exists, otherwise runs `fetcher`,
// caches its success, and clears the in-flight slot. Errors are never cached.
export async function cachedGet<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T
  }

  const pending = inflight.get(key)
  if (pending) return pending as Promise<T>

  const request = (async () => {
    try {
      const data = await fetcher()
      cache.set(key, { data, expiresAt: Date.now() + ttlMs })
      return data
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, request)
  return request as Promise<T>
}

// Drop cached entries — all of them, or those whose key starts with `prefix`.
// Not wired to any mutation today (catalog facets don't change from the client)
// but exported so a future reseed/admin path can bust the cache.
export function invalidateApiCache(prefix?: string): void {
  if (prefix === undefined) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}
