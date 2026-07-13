import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, HeadContent, Scripts } from '@tanstack/react-router'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { lazy, Suspense } from 'react'

import { GlobalErrorBoundary } from '@/app/components/GlobalErrorBoundary'
import Header from '@/app/components/Header'
import { AuthProvider, useAuth } from '../lib/auth'

import appCss from '../styles.css?url'

// Router context shared across every route. The QueryClient is created in
// `getRouter()` (src/router.tsx) and threaded here so loaders can reach it via
// `context.queryClient` once loader-based prefetch lands (Phase 5, ADR-0007).
export interface RouterAppContext {
  queryClient: QueryClient
}

// Devtools are dev-only. Vite replaces `import.meta.env.DEV` with a literal
// boolean at build time, so the production bundle never references the
// devtools chunk and tree-shakes the import expression away.
const DevtoolsPanel = import.meta.env.DEV ? lazy(() => import('@/app/devtools')) : null

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        name: 'theme-color',
        content: '#0f172a',
      },
      {
        title: 'Gymmie - Track Your Fitness Journey',
      },
    ],
    links: [
      { rel: 'manifest', href: '/manifest.json' },
      { rel: 'icon', href: '/gymmie-icon.png', type: 'image/png' },
      { rel: 'shortcut icon', href: '/gymmie-icon.png' },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <AuthProvider>
          <ConditionalHeader />
          <ConditionalAppContent>{children}</ConditionalAppContent>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
        {DevtoolsPanel && (
          <Suspense fallback={null}>
            <DevtoolsPanel />
          </Suspense>
        )}
        <Scripts />
      </body>
    </html>
  )
}

function ConditionalHeader() {
  const { isAuthenticated, isLoading } = useAuth()

  // Don't show header while loading auth state
  if (isLoading) {
    return null
  }

  // Don't show header on login page (when user is not authenticated)
  if (!isAuthenticated) {
    return null
  }

  // Show header for authenticated users
  return <Header />
}

function ConditionalAppContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading || !isAuthenticated) {
    return <>{children}</>
  }

  return (
    <main className="bg-gray-50 pb-[calc(5.5rem+env(safe-area-inset-bottom))] dark:bg-gray-900 md:pb-0">
      {children}
    </main>
  )
}
