import { QueryClient } from '@tanstack/react-query'
import { createRouter as createTanstackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

function parseSearch(search: string): Record<string, unknown> {
  const searchParams = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const parsed: Record<string, unknown> = {}

  for (const [key, rawValue] of searchParams.entries()) {
    let value: unknown = rawValue

    try {
      value = JSON.parse(rawValue)
    } catch {
      value = rawValue
    }

    const existingValue = parsed[key]
    if (existingValue === undefined) {
      parsed[key] = value
    } else if (Array.isArray(existingValue)) {
      existingValue.push(value)
    } else {
      parsed[key] = [existingValue, value]
    }
  }

  return parsed
}

function stringifySearch(search: Record<string, unknown>): string {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === '') continue

    const values = Array.isArray(value) ? value : [value]
    for (const item of values) {
      if (item === undefined || item === null || item === '') continue
      searchParams.append(key, typeof item === 'object' ? JSON.stringify(item) : String(item))
    }
  }

  const searchString = searchParams.toString()
  return searchString ? `?${searchString}` : ''
}

// Create a new router instance.
//
// TanStack Start 1.131+ generates a virtual server entry that imports
// `createRouter` from this file by name. We export both `createRouter` (the
// name TanStack Start expects) and `getRouter` (the legacy name still used by
// existing call sites) so the rename is non-breaking.
export const createRouter = () => {
  // One QueryClient per router instance (per request under SSR). App-wide
  // defaults per ADR-0007: 30s staleTime (single-user gym data — aggressive
  // refetch buys nothing) and a single retry.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
    },
  })

  const router = createTanstackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    parseSearch,
    stringifySearch,
  })

  // Wires Query's SSR dehydrate/hydrate into the router lifecycle so query
  // state prefetched in loaders survives the server→client handoff. Harmless
  // until loaders start prefetching (Phase 5, public data only pre-P13).
  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

export const getRouter = createRouter

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
