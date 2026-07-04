import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Shared test helper (ADR-0007, Phase 0). Every hook/component test that
// consumes TanStack Query wraps in a FRESH QueryClient so cache state never
// leaks between tests, and disables retries so a rejected query surfaces its
// error immediately instead of retrying past the test's assertions.
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })
}

export interface QueryWrapperResult {
  wrapper: ({ children }: { children: ReactNode }) => React.JSX.Element
  queryClient: QueryClient
}

/**
 * Build a `wrapper` for `renderHook`/`render` plus the underlying client so a
 * test can also assert on / seed the cache. Each call creates its own client.
 */
export function createQueryWrapper(client: QueryClient = createTestQueryClient()): QueryWrapperResult {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { wrapper, queryClient: client }
}
